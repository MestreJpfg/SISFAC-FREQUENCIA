import { Timestamp } from 'firebase/firestore';

export interface Student {
  id: string; // The Firestore document ID
  name: string;
  class: string; // Turma
  grade: string; // Série
  shift: string; // Turno
  ensino: string; // Nível de Ensino (e.g., Fundamental, Médio)
  telefone?: string;
}

export interface AttendanceRecord {
  id: string; // The Firestore document ID
  studentId: string;
  studentName: string;
  date: string | Timestamp; // YYYY-MM-DD string or Firestore Timestamp
  status: 'present' | 'absent';
  grade: string;
  class: string;
  shift: string;
  ensino: string;
  telefone?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'superUser' | 'user';
  isActive: boolean;
}
