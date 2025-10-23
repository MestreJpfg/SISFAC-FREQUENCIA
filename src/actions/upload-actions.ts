"use server";

import { collection, writeBatch, getDocs, doc } from "firebase/firestore";
import * as xlsx from "xlsx";
import { db } from "@/lib/firebase";

export async function uploadStudents(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) {
    return { error: "Nenhum arquivo enviado." };
  }

  try {
    const bytes = await file.arrayBuffer();
    const workbook = xlsx.read(bytes, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet) as { Nome?: string, Turma?: string }[];
    
    if (!data || data.length === 0) {
      return { error: "O arquivo Excel está vazio ou em formato incorreto." };
    }

    const studentsRef = collection(db, "students");
    const batch = writeBatch(db);

    const existingStudentsSnap = await getDocs(studentsRef);
    existingStudentsSnap.forEach(doc => batch.delete(doc.ref));

    let studentCount = 0;
    data.forEach((row) => {
      if (row.Nome && typeof row.Nome === 'string' && row.Nome.trim() !== '') {
        const studentDocRef = doc(studentsRef); // Auto-generate ID
        batch.set(studentDocRef, {
          name: row.Nome.trim(),
          class: row.Turma?.toString().trim() ?? "N/A",
        });
        studentCount++;
      }
    });

    if (studentCount === 0) {
        return { error: "Nenhum aluno válido encontrado no arquivo. Verifique se a coluna 'Nome' existe e está preenchida." };
    }

    await batch.commit();

    return { success: `${studentCount} alunos importados com sucesso!` };
  } catch (e) {
    console.error("Error uploading students:", e);
    return { error: "Ocorreu um erro ao processar o arquivo. Verifique se é um arquivo Excel válido." };
  }
}
