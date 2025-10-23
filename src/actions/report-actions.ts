"use server";

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { AttendanceRecord, Student } from '@/lib/types';

export interface MonthlyAbsenceData {
    studentId: string;
    studentName: string;
    studentClass: string;
    studentGrade: string;
    studentShift: string;
    absenceCount: number;
}

type DailyAbsenceRecord = AttendanceRecord & { studentClass: string, studentGrade: string, studentShift: string };

export async function getDailyAbsences(date: Date): Promise<DailyAbsenceRecord[]> {
    const dateString = format(date, 'yyyy-MM-dd');

    const studentsSnap = await getDocs(collection(db, 'students'));
    const studentMap = new Map<string, Student>();
    studentsSnap.forEach(doc => studentMap.set(doc.id, { id: doc.id, ...doc.data()} as Student));

    if (studentMap.size === 0) return [];

    const attendanceRef = collection(db, 'attendance');
    const q = query(attendanceRef, where('date', '==', dateString), where('status', '==', 'absent'));
    const querySnapshot = await getDocs(q);
    
    const absences: DailyAbsenceRecord[] = [];
    querySnapshot.forEach(doc => {
        const record = doc.data() as AttendanceRecord;
        const studentInfo = studentMap.get(record.studentId);
        absences.push({
            ...record,
            studentClass: studentInfo?.class || 'N/A',
            studentGrade: studentInfo?.grade || 'N/A',
            studentShift: studentInfo?.shift || 'N/A',
        });
    });

    return absences.sort((a, b) => a.studentName.localeCompare(b.studentName));
}

export async function getMonthlyAbsences(month: number, year: number, students: Student[]): Promise<MonthlyAbsenceData[]> {
    if (students.length === 0) return [];

    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(new Date(year, month));

    const attendanceRef = collection(db, 'attendance');
    const q = query(
        attendanceRef,
        where('date', '>=', format(startDate, 'yyyy-MM-dd')),
        where('date', '<=', format(endDate, 'yyyy-MM-dd')),
        where('status', '==', 'absent')
    );

    const querySnapshot = await getDocs(q);
    const absenceCounts = new Map<string, number>();

    querySnapshot.forEach(doc => {
        const record = doc.data() as AttendanceRecord;
        absenceCounts.set(record.studentId, (absenceCounts.get(record.studentId) || 0) + 1);
    });

    const reportData: MonthlyAbsenceData[] = students.map(student => ({
        studentId: student.id,
        studentName: student.name,
        studentClass: student.class,
        studentGrade: student.grade,
        studentShift: student.shift,
        absenceCount: absenceCounts.get(student.id) || 0,
    }))
     .sort((a, b) => b.absenceCount - a.absenceCount || a.studentName.localeCompare(b.studentName));

    return reportData;
}
