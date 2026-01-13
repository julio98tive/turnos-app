
import {firestore} from "firebase-admin";

// Definición de roles en la aplicación
export type Role = "ADMIN" | "INGENIERO" | "AGENTE";

// Estructura para el perfil de un usuario
export interface UserProfile {
    uid: string;
    email: string;
    fullName: string;
    role: Role;
    telegramChatId?: string;
}

// Estructura para un turno de trabajo
export interface Shift {
    id: string;
    userId: string;
    role: Role;
    start: firestore.Timestamp; // CORREGIDO: Usar Timestamp de Firestore
    end: firestore.Timestamp; // CORREGIDO: Usar Timestamp de Firestore
    type: "rotativo" | "disponibilidad";
    source?: "BULK" | "SINGLE";

    // Flags de notificación estandarizados
    creationNotificationSent?: boolean;
    reminderNotificationSent?: boolean;
}

// Estructura para el documento de notificaciones pendientes en la cola manual
export interface PendingNotification {
    shiftIds: string[];
    lastUpdate: firestore.Timestamp; // CORREGIDO: Usar Timestamp de Firestore
}
