"use server";

import { collection, writeBatch, getDocs, query, where, doc } from "firebase/firestore";
import { initializeFirebaseOnServer } from "@/firebase/server-init";
import { format } from 'date-fns';
import type { Student } from "@/lib/types";
import { FirestorePermissionError } from "@/firebase/errors";

export async function saveAttendance(
  formData: FormData,
  students: Student[]
) {
  const { firestore } = initializeFirebaseOnServer();
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const batch = writeBatch(firestore);
  const attendanceRef = collection(firestore, "attendance");

  // Primeiro, exclui os registros de hoje para garantir dados limpos.
  const q = query(attendanceRef, where("date", "==", today));
  const existingDocsSnap = await getDocs(q);
  existingDocsSnap.forEach(doc => {
      batch.delete(doc.ref);
  });

  // Em seguida, adiciona os novos registros de frequência.
  students.forEach(student => {
    const status = formData.get(student.id) as 'present' | 'absent' | null;
    const record = {
        studentId: student.id,
        studentName: student.name,
        date: today,
        status: status || 'absent',
    };
    const newDocRef = doc(collection(firestore, "attendance"));
    batch.set(newDocRef, record);
  });
  
  return batch.commit()
    .then(() => ({ success: "Frequência salva com sucesso!" }))
    .catch((e: any) => {
      console.error("Error saving attendance:", e);
      // Lança um erro contextualizado para depuração detalhada pelo Next.js
      throw new FirestorePermissionError({
        path: "attendance",
        operation: 'write',
        requestResourceData: { info: "Batch write for daily attendance failed." }
      });
    });
}
