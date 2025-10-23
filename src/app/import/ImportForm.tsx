"use client";

import { useState, useRef, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { collection, writeBatch, getDocs, doc } from 'firebase/firestore';
import * as xlsx from 'xlsx';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function ImportForm() {
  const { firestore } = useFirebase();
  const [isPending, startTransition] = useTransition();
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileName(file ? file.name : '');
  };

  const uploadStudents = async (formData: FormData) => {
    if (!firestore) return { error: "O Firestore não está disponível." };
    
    const file = formData.get("file") as File;
    if (!file) {
      return { error: "Nenhum arquivo enviado." };
    }

    try {
      const bytes = await file.arrayBuffer();
      const workbook = xlsx.read(bytes, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (!data || data.length < 2) {
        return { error: "O arquivo Excel está vazio ou em formato incorreto." };
      }

      const studentsRef = collection(firestore, "students");
      const existingStudentsSnap = await getDocs(studentsRef);
      const deleteBatch = writeBatch(firestore);
      existingStudentsSnap.docs.forEach(studentDoc => {
          deleteBatch.delete(doc(firestore, "students", studentDoc.id));
      });
      await deleteBatch.commit();

      const addBatch = writeBatch(firestore);
      let studentCount = 0;
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row.length === 0 || row.every(cell => cell === null || cell === '')) {
          continue;
        }
        
        const name = row[0];
        const grade = row[1];
        const studentClass = row[2];
        const shift = row[3];

        if (name && typeof name === 'string' && name.trim() !== '') {
          const newStudentRef = doc(studentsRef);
          addBatch.set(newStudentRef, {
            name: name.trim(),
            grade: grade?.toString().trim() ?? "N/A",
            class: studentClass?.toString().trim() ?? "N/A",
            shift: shift?.toString().trim() ?? "N/A",
          });
          studentCount++;
        }
      }

      if (studentCount === 0) {
          return { error: "Nenhum aluno válido encontrado no arquivo." };
      }

      await addBatch.commit();
      return { success: `${studentCount} alunos importados com sucesso!` };

    } catch (e: any) {
        console.error("Error managing students:", e);
        const permissionError = new FirestorePermissionError({
            path: 'students',
            operation: 'write',
            requestResourceData: { info: "Batch write for student upload failed." }
        });
        errorEmitter.emit('permission-error', permissionError);
        return { error: `Ocorreu um erro ao importar os alunos.` };
    }
  };


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get('file') as File;

    if (!file || file.size === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, selecione um arquivo para enviar.",
      });
      return;
    }

    startTransition(async () => {
      const result = await uploadStudents(formData);

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Erro na importação",
          description: result.error,
        });
      } else {
        toast({
          title: "Sucesso",
          description: result.success,
        });
        setFileName('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="file">Arquivo Excel</Label>
        <div className="flex items-center gap-2">
            <Input 
                id="file" 
                name="file" 
                type="file" 
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="file:text-primary file:font-bold cursor-pointer"
                disabled={isPending}
            />
        </div>
        {fileName && <p className="text-sm text-muted-foreground">Arquivo selecionado: {fileName}</p>}
      </div>

      <Button type="submit" disabled={isPending || !fileName} className="w-full">
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Importando...
          </>
        ) : (
            <>
                <Upload className="mr-2 h-4 w-4" />
                Enviar e Substituir Dados
            </>
        )}
      </Button>
    </form>
  );
}
