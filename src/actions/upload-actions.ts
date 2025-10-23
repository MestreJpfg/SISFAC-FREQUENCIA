"use server";

import { collection, writeBatch, getDocs, doc, deleteDoc, addDoc } from "firebase/firestore";
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

    // Etapa 2: Excluir todos os alunos existentes (de forma mais segura)
    const studentsRef = collection(db, "students");
    const existingStudentsSnap = await getDocs(studentsRef);
    if (!existingStudentsSnap.empty) {
        // Usar um lote para exclusão é bom, mas se houver mais de 500 alunos, falhará.
        // Vamos excluir um por um para garantir.
        for (const studentDoc of existingStudentsSnap.docs) {
            await deleteDoc(doc(db, "students", studentDoc.id));
        }
    }

    // Etapa 3: Adicionar os novos alunos
    let studentCount = 0;
    // Pula a linha do cabeçalho (índice 0)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // Garante que a linha não seja totalmente vazia
      if (row.length === 0 || row.every(cell => cell === null || cell === '')) {
        continue;
      }
      
      const name = row[0]; // Coluna 1: Nome
      const grade = row[1]; // Coluna 2: Série
      const studentClass = row[2]; // Coluna 3: Turma
      const shift = row[3]; // Coluna 4: Turno

      if (name && typeof name === 'string' && name.trim() !== '') {
        await addDoc(studentsRef, {
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

    return { success: `${studentCount} alunos importados com sucesso!` };
  } catch (e) {
    console.error("Error uploading students:", e);
    const errorMessage = e instanceof Error ? e.message : "Ocorreu um erro desconhecido.";
    return { error: `Ocorreu um erro ao processar o arquivo: ${errorMessage}. Verifique se é um arquivo Excel válido.` };
  }
}
