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

// User profile for personalization
export interface UserProfile {
  id: string;
  username: string;
  password?: string; // Should not be stored in localStorage
  fullName?: string;
  jobTitle?: string; // Função
  age?: number;
  avatarUrl?: string; // Can be a URL or a Base64 data URI
  bio?: string;
  dataNascimento?: string; // YYYY-MM-DD
  telefonePessoal?: string;
  endereco?: {
    rua?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
  departamento?: string;
  dataAdmissao?: string; // YYYY-MM-DD
  emailProfissional?: string;
}
