
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {firestore} from "firebase-admin";
import {sendEmail, sendTelegramMessage} from "./shared/notificationUtils";
import {Shift, UserProfile} from "./types";

const escapeTelegramMarkdown = (text: string): string => {
  if (!text) return "";
  // Escapes all reserved characters for Telegram MarkdownV2
  const reservedCharsRegex = /[_*[\]()~`>#+\-=|{}.!]/g;
  return text.replace(reservedCharsRegex, "\\$&");
};

const hyphen = "\\-";

const formatDateTime = (date: string | Date | firestore.Timestamp, forTelegram = false): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "America/Bogota",
  };

  let dateObj: Date;
  if (date instanceof firestore.Timestamp) {
    dateObj = date.toDate();
  } else {
    dateObj = new Date(date);
  }

  if (isNaN(dateObj.getTime())) {
    return "Fecha inválida";
  }

  if (forTelegram) {
    const telegramDate = dateObj.toLocaleString("es-CO", {
      year: "2-digit", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota", hour12: false,
    });
    return escapeTelegramMarkdown(telegramDate);
  }

  return dateObj.toLocaleString("es-CO", options);
};

const getAdminBcc = async (db: admin.firestore.Firestore): Promise<string | undefined> => {
  const adminUsersSnapshot = await db.collection("users").where("role", "==", "ADMIN").get();
  if (adminUsersSnapshot.empty) return undefined;
  return adminUsersSnapshot.docs
      .map((doc) => (doc.data() as UserProfile).email)
      .filter((email) => !!email)
      .join(",");
};

export const onShiftCreate = onDocumentCreated(
    {
      document: "shifts/{shiftId}",
      secrets: ["SMTP_USER", "SMTP_PASSWORD", "TELEGRAM_BOT_TOKEN", "TELEGRAM_ADMIN_CHAT_ID"],
    },
    async (event) => {
      const snapshot = event.data;
      if (!snapshot) return;
      const shift = snapshot.data() as Shift;
      if (shift.source === "BULK") return;
      const db = admin.firestore();

      try {
        const userDoc = await db.collection("users").doc(shift.userId).get();
        if (!userDoc.exists || !userDoc.data()) {
          logger.warn(`User document not found for userId: ${shift.userId}`);
          return;
        }
        const assignedUser = userDoc.data() as UserProfile;
        const adminBcc = await getAdminBcc(db);

        try {
          const subject = `Nuevo Turno Asignado: ${assignedUser.fullName}`;
          const htmlBody = `<p>Se ha asignado un nuevo turno a <b>${assignedUser.fullName}</b>:</p><ul><li><b>Inicio:</b> ${formatDateTime(shift.start)}</li><li><b>Fin:</b> ${formatDateTime(shift.end)}</li></ul>`;
          await sendEmail(assignedUser.email, subject, "", htmlBody, adminBcc);
        } catch (emailError) {
          logger.error(`[NON-FATAL] Email sending failed for shift ${snapshot.id}:`, emailError);
        }

        if (assignedUser.telegramChatId) {
          try {
            const safeFullName = escapeTelegramMarkdown(assignedUser.fullName);
            const telegramText = `*Nuevo Turno Asignado*\n\nSe ha asignado un nuevo turno a *${safeFullName}*:\n${hyphen} *Inicio:* ${formatDateTime(shift.start, true)}\n${hyphen} *Fin:* ${formatDateTime(shift.end, true)}`;
            await sendTelegramMessage(assignedUser.telegramChatId, telegramText);
          } catch (telegramError) {
            logger.error("[NON-FATAL] Failed to send Telegram to user", {telegramError});
          }
        }

        await snapshot.ref.update({creationNotificationSent: true});
        logger.log(`Sent single creation notification for shift ${snapshot.id}.`);

        const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
        if (adminChatId) {
          try {
            const safeFullName = escapeTelegramMarkdown(assignedUser.fullName);
            const telegramText = `*Nuevo Turno Asignado a: ${safeFullName}*\n\nSe ha asignado un nuevo turno a *${safeFullName}*:\n${hyphen} *Inicio:* ${formatDateTime(shift.start, true)}\n${hyphen} *Fin:* ${formatDateTime(shift.end, true)}`;
            await sendTelegramMessage(adminChatId, telegramText);
            logger.log(`Sent Telegram notification to admin group for shift ${snapshot.id}.`);
          } catch (telegramError) {
            logger.error(`[NON-FATAL] Failed to send Telegram to admin group for shift ${snapshot.id}`, {telegramError});
          }
        }
      } catch (error) {
        logger.error(`[FATAL] onShiftCreate failed for ${snapshot.id}:`, error);
      }
    }
);

export const processPendingNotifications = onSchedule(
    {
      schedule: "every 5 minutes",
      secrets: ["SMTP_USER", "SMTP_PASSWORD", "TELEGRAM_BOT_TOKEN", "TELEGRAM_ADMIN_CHAT_ID"],
    },
    async (_event) => {
      const db = admin.firestore();
      const shiftsToNotify = await db.collection("shifts").where("source", "==", "BULK").where("creationNotificationSent", "==", false).get();
      if (shiftsToNotify.empty) return;

      const shiftsByUser = new Map<string, Shift[]>();
      shiftsToNotify.forEach((doc) => {
        const shift = {...doc.data(), id: doc.id} as Shift;
        const userShifts = shiftsByUser.get(shift.userId) || [];
        userShifts.push(shift);
        shiftsByUser.set(shift.userId, userShifts);
      });

      const adminBcc = await getAdminBcc(db);
      const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

      for (const [userId, userShifts] of shiftsByUser.entries()) {
        try {
          const userDoc = await db.collection("users").doc(userId).get();
          if (!userDoc.exists || !userDoc.data()) continue;
          const assignedUser = userDoc.data() as UserProfile;

          userShifts.sort((a, b) => (a.start as any).toMillis() - (b.start as any).toMillis());

          try {
            const subject = `Asignación Masiva: ${userShifts.length} Nuevos Turnos Asignados`;
            const shiftsHtml = userShifts.map((s) => `<li><b>Inicio:</b> ${formatDateTime(s.start)} | <b>Fin:</b> ${formatDateTime(s.end)}</li>`).join("");
            const htmlBody = `<p>Hola ${assignedUser.fullName}, se te han asignado ${userShifts.length} nuevos turnos:</p><ul>${shiftsHtml}</ul>`;
            await sendEmail(assignedUser.email, subject, "", htmlBody, adminBcc);
          } catch (emailError) {
            logger.error(`[NON-FATAL] Bulk email sending failed for user ${userId}:`, emailError);
          }

          if (assignedUser.telegramChatId) {
            try {
              const safeFullName = escapeTelegramMarkdown(assignedUser.fullName);
              const safeLength = escapeTelegramMarkdown(`(${userShifts.length})`);
              const shiftsText = userShifts.map((s) => `${hyphen} *Inicio:* ${formatDateTime(s.start, true)}\n  *Fin:* ${formatDateTime(s.end, true)}`).join("\n\n");
              const telegramText = `*Nuevos Turnos Asignados ${safeLength}*\n\nHola ${safeFullName}, se te han asignado los siguientes turnos:\n\n${shiftsText}`;
              await sendTelegramMessage(assignedUser.telegramChatId, telegramText);
            } catch (telegramError) {
              logger.error("[NON-FATAL] Failed to send bulk Telegram to user", {telegramError});
            }
          }

          if (adminChatId) {
            try {
              const safeFullName = escapeTelegramMarkdown(assignedUser.fullName);
              const safeLength = escapeTelegramMarkdown(`(${userShifts.length})`);
              const shiftsText = userShifts.map((s) => `${hyphen} *Inicio:* ${formatDateTime(s.start, true)}\n  *Fin:* ${formatDateTime(s.end, true)}`).join("\n\n");
              const telegramText = `*Asignación Masiva a: ${safeFullName} ${safeLength}*\n\nSe han asignado los siguientes turnos a ${safeFullName}:\n\n${shiftsText}`;
              await sendTelegramMessage(adminChatId, telegramText);
              logger.log(`Sent bulk Telegram notification to admin group for user ${userId}.`);
            } catch (telegramError) {
              logger.error(`[NON-FATAL] Failed to send bulk Telegram to admin group for user ${userId}`, {telegramError});
            }
          }

          const batch = db.batch();
          userShifts.forEach((s) => batch.update(db.collection("shifts").doc(s.id), {creationNotificationSent: true}));
          await batch.commit();

          logger.log(`Sent bulk notification for user ${userId}.`);
        } catch (error) {
          logger.error(`[FATAL] processPendingNotifications failed for user ${userId}:`, error);
        }
      }
    }
);

export const sendShiftReminders = onSchedule(
    {
      schedule: "0 8 * * *",
      timeZone: "America/Bogota",
      secrets: ["SMTP_USER", "SMTP_PASSWORD", "TELEGRAM_BOT_TOKEN"],
    },
    async (_event) => {
      const db = admin.firestore();
      const now = new Date();
      const upcomingShifts = await db.collection("shifts").where("reminderNotificationSent", "==", false).where("start", ">", now).get();
      if (upcomingShifts.empty) return;
      const agentThreshold = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
      const engineerThreshold = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      for (const doc of upcomingShifts.docs) {
        const shift = {...doc.data(), id: doc.id} as Shift;
        const shiftStartDate = (shift.start as firestore.Timestamp).toDate();
        const userRole = (await db.collection("users").doc(shift.userId).get()).data()?.role;
        const shouldSend = (userRole === "AGENTE" && shiftStartDate <= agentThreshold) || (userRole === "INGENIERO" && shiftStartDate <= engineerThreshold);

        if (shouldSend) {
          try {
            const userDoc = await db.collection("users").doc(shift.userId).get();
            if (!userDoc.exists || !userDoc.data()) continue;
            const assignedUser = userDoc.data() as UserProfile;

            try {
              const subject = "Recordatorio de Próximo Turno";
              const htmlBody = `<p>Hola ${assignedUser.fullName}, este es un recordatorio de tu próximo turno:</p><ul><li><b>Inicio:</b> ${formatDateTime(shift.start)}</li><li><b>Fin:</b> ${formatDateTime(shift.end)}</li></ul>`;
              await sendEmail(assignedUser.email, subject, "", htmlBody);
            } catch (emailError) {
              logger.error(`[NON-FATAL] Reminder email sending failed for shift ${shift.id}:`, emailError);
            }

            if (assignedUser.telegramChatId) {
              try {
                const safeFullName = escapeTelegramMarkdown(assignedUser.fullName);
                const telegramText = `*Recordatorio de Próximo Turno*\n\nHola ${safeFullName}, este es un recordatorio de tu próximo turno:\n${hyphen} *Inicio:* ${formatDateTime(shift.start, true)}\n${hyphen} *Fin:* ${formatDateTime(shift.end, true)}`;
                await sendTelegramMessage(assignedUser.telegramChatId, telegramText);
              } catch (telegramError) {
                logger.error("[NON-FATAL] Failed to send Telegram reminder to user", {telegramError});
              }
            }

            await doc.ref.update({reminderNotificationSent: true});
            logger.log(`Sent reminder for shift ${shift.id}.`);
          } catch (error) {
            logger.error(`[FATAL] sendShiftReminders failed for shift ${shift.id}:`, error);
          }
        }
      }
    }
);
