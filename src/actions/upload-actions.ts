"use server";

import { collection, writeBatch, getDocs, doc, deleteDoc } from "firebase/firestore";
import * as xlsx from "xlsx";
import { db } from "@/lib/firebase";

export async function uploadStudents(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) {
    return { error: "Nenhum arquivo enviado." };
  }

  try {
    // Etapa 1: Ler o arquivo Excel
    const bytes = await file.arrayBuffer();
    const workbook = xlsx.read(bytes, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (!data || data.length < 2) {
      return { error: "O arquivo Excel está vazio ou em formato incorreto." };
    }

    // Etapa 2: Excluir todos os alunos existentes
    const studentsRef = collection(db, "students");
    const existingStudentsSnap = await getDocs(studentsRef);
    if (!existingStudentsSnap.empty) {
      const deleteBatch = writeBatch(db);
      existingStudentsSnap.forEach(doc => deleteBatch.delete(doc.ref));
      await deleteBatch.commit();
    }

    // Etapa 3: Adicionar os novos alunos
    const addBatch = writeBatch(db);
    let studentCount = 0;
    // Pula a linha do cabeçalho (índice 0)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const name = row[0]; // Coluna 1: Nome
      const grade = row[1]; // Coluna 2: Série
      const studentClass = row[2]; // Coluna 3: Turma
      const shift = row[3]; // Coluna 4: Turno

      if (name && typeof name === 'string' && name.trim() !== '') {
        const studentDocRef = doc(studentsRef); // Auto-generate ID
        addBatch.set(studentDocRef, {
          name: name.trim(),
          grade: grade?.toString().trim() ?? "N/A",
          class: studentClass?.toString().trim() ?? "N/A",
          shift: shift?.toString().trim() ?? "N/A",
        });
        studentCount++;
      }
    }

    if (studentCount === 0) {
        return { error: "Nenhum aluno válido encontrado no arquivo. Verifique se a primeira coluna contém nomes." };
    }

    await addBatch.commit();

    return { success: `${studentCount} alunos importados com sucesso!` };
  } catch (e) {
    console.error("Error uploading students:", e);
    return { error: "Ocorreu um erro ao processar o arquivo. Verifique se é um arquivo Excel válido." };
  }
}
