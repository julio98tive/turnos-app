export type Role = 'ADMIN' | 'AGENTE' | 'INGENIERO';

export interface AppUser {
  uid: string;
  email: string;
  role: Role;
}

export interface Shift {
  id: string;
  userId: string;
  userEmail?: string; // For display purposes
  role: Role;
  start: Date;
  end: Date;
  type: 'rotativo' | 'disponibilidad';
}
