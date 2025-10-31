
"use client";

import { useState, useRef, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Trash2, TriangleAlert, ShieldAlert } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { collection, writeBatch, getDocs, doc, query, where } from 'firebase/firestore';
import * as xlsx from 'xlsx';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Student } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export function ImportForm() {
  const { firestore } = useFirebase();
  const [isPending, startTransition] = useTransition();
  const [isClearing, startClearingTransition] = useTransition();
  const [isCleaningAttendance, startCleaningAttendanceTransition] = useTransition();
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
      
      // Get existing students to check for updates
      const existingStudentsSnap = await getDocs(studentsRef);
      const existingStudentsMap = new Map<string, { id: string, data: Omit<Student, 'id'> }>();
      existingStudentsSnap.docs.forEach(doc => {
          const student = doc.data() as Omit<Student, 'id'>;
          // Use a consistent key for matching (lowercase name)
          const studentKey = `${student.name?.trim().toLowerCase()}`;
          existingStudentsMap.set(studentKey, { id: doc.id, data: student });
      });
      
      const batch = writeBatch(firestore);
      let newStudentsCount = 0;
      let updatedStudentsCount = 0;
      
      // Start from the second row to skip the header
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row.length === 0 || row.every(cell => cell === null || cell === '')) {
          continue; // Skip empty rows
        }
        
        const name = row[0];
        const grade = row[1];
        const studentClass = row[2];
        const shift = row[3];
        const ensino = row[4];

        if (name && typeof name === 'string' && name.trim() !== '') {
            const studentData = {
                name: name.trim(),
                grade: grade?.toString().trim() ?? "N/A",
                class: studentClass?.toString().trim() ?? "N/A",
                shift: shift?.toString().trim() ?? "N/A",
                ensino: ensino?.toString().trim() ?? "N/A",
            };

            const studentKey = studentData.name.toLowerCase();
            const existingStudent = existingStudentsMap.get(studentKey);

            if (existingStudent) {
                // If student exists, update it
                const studentDocRef = doc(firestore, 'students', existingStudent.id);
                batch.update(studentDocRef, studentData);
                updatedStudentsCount++;
            } else {
                // If student is new, create it
                const newStudentRef = doc(studentsRef);
                batch.set(newStudentRef, studentData);
                newStudentsCount++;
            }
        }
      }

      if (newStudentsCount === 0 && updatedStudentsCount === 0) {
          return { success: `Nenhuma alteração necessária. Os dados no arquivo parecem já estar no banco de dados.` };
      }

      await batch.commit();
      return { success: `${newStudentsCount} aluno(s) novo(s) importado(s). ${updatedStudentsCount} aluno(s) atualizado(s).` };

    } catch (e: any) {
        console.error("Error managing students:", e);
        const permissionError = new FirestorePermissionError({
            path: 'students',
            operation: 'write',
            requestResourceData: { info: "Batch write for student upload/update failed." }
        });
        errorEmitter.emit('permission-error', permissionError);
        return { error: `Ocorreu um erro ao processar o arquivo.` };
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
          title: "Processamento Concluído",
          description: result.success,
        });
        setFileName('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    });
  };

  const handleClearDatabase = () => {
      if (!firestore) return;
      
      startClearingTransition(async () => {
          const studentsRef = collection(firestore, "students");
          const q = query(studentsRef);
          
          try {
              const querySnapshot = await getDocs(q);
              if (querySnapshot.empty) {
                  toast({ title: "Informação", description: "O banco de dados de alunos já está vazio." });
                  return;
              }

              const batch = writeBatch(firestore);
              querySnapshot.docs.forEach(doc => {
                  batch.delete(doc.ref);
              });
              
              await batch.commit();

              toast({ title: "Sucesso", description: "Todos os alunos foram removidos do banco de dados."});

          } catch (e: any) {
              console.error("Error clearing database:", e);
              const permissionError = new FirestorePermissionError({
                  path: 'students',
                  operation: 'delete',
                  requestResourceData: { info: "Batch delete for clearing students collection failed." }
              });
              errorEmitter.emit('permission-error', permissionError);
              toast({ variant: "destructive", title: "Erro", description: "Falha ao limpar o banco de dados."});
          }
      });
  }

  const handleCleanAttendanceData = () => {
    if (!firestore) return;

    startCleaningAttendanceTransition(async () => {
        const attendanceRef = collection(firestore, "attendance");
        // Query for documents where 'ensino' is an empty string
        const q = query(attendanceRef, where("ensino", "==", ""));

        try {
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                toast({ title: "Informação", description: "Nenhum registro de frequência com 'ensino' vazio foi encontrado." });
                return;
            }

            const batch = writeBatch(firestore);
            querySnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();

            toast({ title: "Sucesso", description: `${querySnapshot.size} registro(s) de frequência inválido(s) foram removidos.`});

        } catch (e: any) {
            console.error("Error cleaning attendance data:", e);
            const permissionError = new FirestorePermissionError({
                path: 'attendance',
                operation: 'delete',
                requestResourceData: { info: "Batch delete for cleaning attendance collection failed." }
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao limpar os dados de frequência."});
        }
    });
  }

  return (
    <div className="space-y-8">
        <form onSubmit={handleSubmit} className="space-y-6 p-6 border rounded-lg">
            <div className="space-y-2">
                 <h3 className="font-semibold text-lg">Importar e Atualizar</h3>
                 <p className="text-sm text-muted-foreground">Envie um arquivo para adicionar novos alunos ou atualizar os dados dos existentes.</p>
            </div>
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
                    disabled={isPending || isClearing || isCleaningAttendance}
                />
            </div>
            {fileName && <p className="text-sm text-muted-foreground">Arquivo selecionado: {fileName}</p>}
          </div>

          <Button type="submit" disabled={isPending || isClearing || isCleaningAttendance || !fileName} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
                <>
                    <Upload className="mr-2 h-4 w-4" />
                    Processar Arquivo
                </>
            )}
          </Button>
        </form>

        <div className="p-6 border border-destructive/50 rounded-lg space-y-4">
             <div className="flex items-start gap-4">
                <div className="text-destructive">
                    <TriangleAlert className="h-6 w-6" />
                </div>
                <div>
                     <h3 className="font-semibold text-lg text-destructive">Zona de Perigo</h3>
                     <p className="text-sm text-muted-foreground">As ações abaixo são irreversíveis. Tenha certeza de que deseja executá-las.</p>
                </div>
             </div>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={isClearing || isPending || isCleaningAttendance}>
                        {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Limpar Banco de Dados de Alunos
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso irá apagar permanentemente todos os alunos do banco de dados. Os registros de frequência existentes permanecerão, mas não estarão associados a nenhum aluno.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearDatabase}>
                        Sim, limpar banco de dados
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={isClearing || isPending || isCleaningAttendance}>
                        {isCleaningAttendance ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                        Limpar Frequências Inválidas
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Limpar dados de frequência?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação buscará e removerá permanentemente os registros de frequência onde o campo 'ensino' está vazio. Esta é uma operação de manutenção para corrigir dados inconsistentes.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCleanAttendanceData}>
                        Sim, limpar frequências
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    </div>
  );
}

    
    