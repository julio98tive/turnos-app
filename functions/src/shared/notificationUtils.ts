
import * as logger from "firebase-functions/logger";
import * as nodemailer from "nodemailer";
import axios, {isAxiosError} from "axios";

// Esta función no necesita cambios, la dejamos como está.
export async function sendEmail(
    to: string, subject: string, text: string, html: string,
) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  if (!smtpUser || !smtpPassword) {
    logger.error("FATAL: SMTP credentials not set.");
    throw new Error("SMTP credentials are not configured.");
  }
  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com", port: 587, secure: false,
    auth: {user: smtpUser, pass: smtpPassword}, requireTLS: true,
  });
  try {
    const info = await transporter.sendMail({
      from: `"Notificador de Turnos" <${smtpUser}>`, to, subject, text, html,
    });
    logger.info("Email sent successfully to %s: %s", to, info.messageId);
  } catch (error) {
    logger.error("FATAL: Error sending email to %s:", to, error);
    throw error;
  }
}

/**
 * Envía un mensaje a un chat de Telegram con logging de diagnóstico.
 * @param {string} chatId El ID del chat de destino.
 * @param {string} text El texto del mensaje, pre-escapado para MarkdownV2.
 */
export async function sendTelegramMessage(chatId: string, text: string) {
  logger.info(`[DIAGNOSTICO] Iniciando envío a Telegram para chat ID: ${chatId}.`);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    logger.error("[DIAGNOSTICO] FATAL: La variable de entorno TELEGRAM_BOT_TOKEN no está disponible.");
    throw new Error("Telegram Bot Token is not configured.");
  }
  logger.info("[DIAGNOSTICO] El token del bot fue cargado correctamente.");

  logger.debug("[DIAGNOSTICO] Contenido del mensaje que se enviará a Telegram:", {chat_id: chatId, text_content: text, parse_mode: "MarkdownV2"});

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const response = await axios.post(url, {
      chat_id: chatId,
      text: text,
      parse_mode: "MarkdownV2",
    });

    logger.info("[DIAGNOSTICO] Telegram API respondió.", {status: response.status, data: response.data});

    if (response.data.ok) {
      logger.info("[DIAGNOSTICO] Telegram reportó que el mensaje fue enviado con éxito.");
    } else {
      logger.error("[DIAGNOSTICO] ERROR DE LÓGICA DE TELEGRAM.", {description: response.data.description, error_code: response.data.error_code});
    }
  } catch (error: unknown) {
    logger.error("[DIAGNOSTICO] FALLO CRÍTICO: La petición de axios.post a la API de Telegram falló.");

    if (isAxiosError(error)) {
      if (error.response) {
        logger.error("[DIAGNOSTICO] DETALLES DEL ERROR DE LA API DE TELEGRAM (error.response):", {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data,
        });
      } else if (error.request) {
        logger.error("[DIAGNOSTICO] SIN RESPUESTA: La petición fue enviada pero no se recibió respuesta.");
      }
    } else {
      logger.error("[DIAGNOSTICO] ERROR INESPERADO (NO DE AXIOS):", error);
    }
    throw error;
  }
}
