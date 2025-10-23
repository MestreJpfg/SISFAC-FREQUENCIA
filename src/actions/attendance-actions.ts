"use server";

import { collection, writeBatch, getDocs, query, where, doc } from "firebase/firestore";
import { initializeFirebaseOnServer } from "@/firebase/server-init";
import { format } from 'date-fns';
import type { Student } from "@/lib/types";

export async function saveAttendance(
  formData: FormData,
  students: Student[]
) {
  const { firestore } = initializeFirebaseOnServer();
  const today = format(new Date(), 'yyyy-MM-dd');
  const attendanceData = new Map<string, 'present' | 'absent'>();

  students.forEach(student => {
    const status = formData.get(student.id) as 'present' | 'absent' | null;
    attendanceData.set(student.id, status || 'absent');
  });

  try {
    const batch = writeBatch(firestore);
    const attendanceRef = collection(firestore, "attendance");

    const q = query(attendanceRef, where("date", "==", today));
    const existingDocsSnap = await getDocs(q);
    const existingDocsMap = new Map<string, string>(); // studentId -> docId
    existingDocsSnap.forEach(doc => {
        existingDocsMap.set(doc.data().studentId, doc.id);
    });

    for (const [studentId, status] of attendanceData.entries()) {
        const student = students.find(s => s.id === studentId);
        if (!student) continue;

        const record = {
            studentId,
            studentName: student.name,
            date: today,
            status,
        };

        const existingDocId = existingDocsMap.get(studentId);
        const docRef = existingDocId 
            ? doc(firestore, "attendance", existingDocId) 
            : doc(collection(firestore, "attendance"));
        
        batch.set(docRef, record);
    }
    
    await batch.commit();
    return { success: "Frequência salva com sucesso!" };
  } catch (e) {
    console.error("Error saving attendance:", e);
    return { error: "Ocorreu um erro ao salvar a frequência." };
  }
}
