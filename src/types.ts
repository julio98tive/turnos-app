
// Definición de roles en la aplicación
export type Role = 'ADMIN' | 'INGENIERO' | 'AGENTE';

// Estructura para el perfil de un usuario
export interface UserProfile {
    id?: string; // ID del documento de Firestore
    uid: string; // UID de Firebase Authentication
    email: string;
    fullName: string;
    role: Role;
    telegramChatId?: string;
}

// Estructura para un turno de trabajo
export interface Shift {
    id: string;
    userId: string;
    start: string;
    end: string;
    type: 'rotativo' | 'disponibilidad';
    source?: 'BULK' | 'SINGLE';

    // Flags de notificación estandarizados
    creationNotificationSent?: boolean; // Se marca a TRUE después de la notificación de creación/bulk.
    reminderNotificationSent?: boolean; // Se marca a TRUE después del recordatorio de 24/48h.
}
