export interface Student {
  id: string;
  name: string;
  class: string; // Turma
  grade: string; // Série
  shift: string; // Turno
  ensino: string; // Nível de Ensino (e.g., Fundamental, Médio)
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
  grade: string;
  class: string;
  shift: string;
  ensino: string;
}
