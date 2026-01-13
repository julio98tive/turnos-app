
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {firestore} from "firebase-admin";
import {sendEmail, sendTelegramMessage} from "./shared/notificationUtils";
import {Shift, UserProfile} from "./types";

const escapeTelegramMarkdown = (text: string): string => {
  if (!text) return "";
  const reservedCharsRegex = /[_*[\]()~`>#+\-=|{}.!]/g;
  return text.replace(reservedCharsRegex, "\\$&");
};

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
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Bogota",
      hour12: false,
    });
    return escapeTelegramMarkdown(telegramDate);
  }

  return dateObj.toLocaleString("es-CO", options);
};

export const onShiftCreate = onDocumentCreated(
    {
      document: "shifts/{shiftId}",
      secrets: ["SMTP_USER", "SMTP_PASSWORD", "TELEGRAM_BOT_TOKEN"],
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
          logger.warn(`No se encontró el documento de usuario para userId: ${shift.userId}`);
          return;
        }

        const assignedUser = userDoc.data() as UserProfile;

        // CORRECCIÓN DE LÓGICA: Aislar el fallo del email para no bloquear Telegram.
        try {
          const subject = "Nuevo Turno Asignado";
          const htmlBody = `<p>Se ha asignado un nuevo turno a <b>${assignedUser.fullName}</b>:</p><ul><li><b>Inicio:</b> ${formatDateTime(shift.start)}</li><li><b>Fin:</b> ${formatDateTime(shift.end)}</li></ul>`;
          await sendEmail(assignedUser.email, subject, "", htmlBody);
        } catch (emailError) {
          logger.error(`[NON-FATAL] Falla en el envío de email para el turno ${snapshot.id}:`, emailError);
        }

        if (assignedUser.telegramChatId) {
          const safeFullName = escapeTelegramMarkdown(assignedUser.fullName);
          const telegramText = `*Nuevo Turno Asignado*\n\nSe ha asignado un nuevo turno a *${safeFullName}*:\n\\- *Inicio:* ${formatDateTime(shift.start, true)}\n\\- *Fin:* ${formatDateTime(shift.end, true)}`;
          await sendTelegramMessage(assignedUser.telegramChatId, telegramText);
        }

        await snapshot.ref.update({creationNotificationSent: true});
        logger.log(`Sent single creation notification for shift ${snapshot.id}.`);
      } catch (error) {
        logger.error(`[FATAL] onShiftCreate falló DESPUÉS del envío de notificaciones para ${snapshot.id}:`, error);
      }
    }
);

export const processPendingNotifications = onSchedule(
    {
      schedule: "every 5 minutes",
      secrets: ["SMTP_USER", "SMTP_PASSWORD", "TELEGRAM_BOT_TOKEN"],
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

      for (const [userId, userShifts] of shiftsByUser.entries()) {
        try {
          const userDoc = await db.collection("users").doc(userId).get();
          if (!userDoc.exists || !userDoc.data()) continue;
          const assignedUser = userDoc.data() as UserProfile;

          try {
            const subject = `Nuevos Turnos Asignados (${userShifts.length})`;
            const shiftsHtml = userShifts.map((s) => `<li><b>Inicio:</b> ${formatDateTime(s.start)} | <b>Fin:</b> ${formatDateTime(s.end)}</li>`).join("");
            const htmlBody = `<p>Hola ${assignedUser.fullName}, se te han asignado ${userShifts.length} nuevos turnos:</p><ul>${shiftsHtml}</ul>`;
            await sendEmail(assignedUser.email, subject, "", htmlBody);
          } catch (emailError) {
            logger.error(`[NON-FATAL] Falla en el envío de email masivo para el usuario ${userId}:`, emailError);
          }

          if (assignedUser.telegramChatId) {
            const safeFullName = escapeTelegramMarkdown(assignedUser.fullName);
            const safeLength = escapeTelegramMarkdown(`(${userShifts.length})`);
            const shiftsText = userShifts.map((s) => `\\- *Inicio:* ${formatDateTime(s.start, true)}\n  *Fin:* ${formatDateTime(s.end, true)}`).join("\n\n");
            const telegramText = `*Nuevos Turnos Asignados ${safeLength}*\n\nHola ${safeFullName}, se te han asignado los siguientes turnos:\n\n${shiftsText}`;
            await sendTelegramMessage(assignedUser.telegramChatId, telegramText);
          }

          const batch = db.batch();
          userShifts.forEach((s) => batch.update(db.collection("shifts").doc(s.id), {creationNotificationSent: true}));
          await batch.commit();

          logger.log(`Sent bulk notification for user ${userId}.`);
        } catch (error) {
          logger.error(`[FATAL] processPendingNotifications falló para el usuario ${userId}:`, error);
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

      const upcomingShifts = await db.collection("shifts")
          .where("reminderNotificationSent", "==", false)
          .where("start", ">", now)
          .get();

      if (upcomingShifts.empty) return;

      const agentThreshold = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
      const engineerThreshold = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      for (const doc of upcomingShifts.docs) {
        const shift = {...doc.data(), id: doc.id} as Shift;
        const shiftStartDate = (shift.start as firestore.Timestamp).toDate();

        const userRole = (await db.collection("users").doc(shift.userId).get()).data()?.role;

        const shouldSend = (userRole === "AGENTE" && shiftStartDate <= agentThreshold) ||
                               (userRole === "INGENIERO" && shiftStartDate <= engineerThreshold);

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
              logger.error(`[NON-FATAL] Falla en el envío de email de recordatorio para el turno ${shift.id}:`, emailError);
            }

            if (assignedUser.telegramChatId) {
              const safeFullName = escapeTelegramMarkdown(assignedUser.fullName);
              const telegramText = `*Recordatorio de Próximo Turno*\n\nHola ${safeFullName}, este es un recordatorio de tu próximo turno:\n\\- *Inicio:* ${formatDateTime(shift.start, true)}\n\\- *Fin:* ${formatDateTime(shift.end, true)}`;
              await sendTelegramMessage(assignedUser.telegramChatId, telegramText);
            }

            await doc.ref.update({reminderNotificationSent: true});
            logger.log(`Sent reminder for shift ${shift.id}.`);
          } catch (error) {
            logger.error(`[FATAL] sendShiftReminders falló para el turno ${shift.id}:`, error);
          }
        }
      }
    }
);
