export type Role = 'ADMIN' | 'INGENIERO' | 'AGENTE';

export interface AppUser {
    uid: string;
    email: string;
    fullName?: string; // Optional because old users might not have it
    role: Role;
}

export interface Shift {
    id: string;
    userId: string;
    role: Role;
    start: Date;
    end: Date;
    type: 'rotativo' | 'disponibilidad';
    // Enriched data, not in Firestore document
    userEmail?: string;
    userFullName?: string;
}
