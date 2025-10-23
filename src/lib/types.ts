export interface Student {
  id: string;
  name: string;
  class: string;
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
}
