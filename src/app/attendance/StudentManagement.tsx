
"use client";

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, query, getDocs, updateDoc } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UserPlus, Loader2, Trash2, Save } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Combobox } from '@/components/ui/combobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type StudentWithId = Student & { id: string };

const studentSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  ensino: z.string().min(1, "O nível de ensino é obrigatório."),
  grade: z.string().min(1, "A série é obrigatória."),
  class: z.string().min(1, "A turma é obrigatória."),
  shift: z.string().min(1, "O turno é obrigatório."),
  telefone: z.string().optional(),
});

// Separate schema for editing, as name is not editable here
const editStudentSchema = studentSchema.omit({ name: true });

export function StudentManagement() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [students, setStudents] = useState<StudentWithId[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithId | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const addForm = useForm<z.infer<typeof studentSchema>>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: '',
      ensino: '',
      grade: '',
      class: '',
      shift: '',
      telefone: '',
    },
  });

  const editForm = useForm<z.infer<typeof editStudentSchema>>({
    resolver: zodResolver(editStudentSchema),
  });

  // Effect to reset edit form when a new student is selected
  useEffect(() => {
    if (selectedStudent) {
      editForm.reset({
        ensino: selectedStudent.ensino,
        grade: selectedStudent.grade,
        class: selectedStudent.class,
        shift: selectedStudent.shift,
        telefone: selectedStudent.telefone || '',
      });
    } else {
      editForm.reset();
    }
  }, [selectedStudent, editForm]);


  const fetchStudents = async () => {
    if (!firestore) return;
    const studentsCollection = collection(firestore, 'students');
    const q = query(studentsCollection);
    const snapshot = await getDocs(q);
    const studentList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentWithId));
    setStudents(studentList.sort((a, b) => a.name.localeCompare(b.name)));
  };
  
  const onDialogOpenChange = (open: boolean) => {
    if (open) {
      fetchStudents();
    } else {
      setSelectedStudent(null); // Clear selection on dialog close
    }
    setIsOpen(open);
  }

  const { ensinoOptions, gradeOptions, classOptions, shiftOptions } = useMemo(() => {
    const unique = (key: keyof Student) => [...new Set(students.map(s => s[key]))]
        .filter(Boolean)
        .map(val => ({ label: String(val), value: String(val) }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

    return {
        ensinoOptions: unique('ensino'),
        gradeOptions: unique('grade'),
        classOptions: unique('class'),
        shiftOptions: unique('shift'),
    };
  }, [students]);

  const handleAddStudent = async (values: z.infer<typeof studentSchema>) => {
    if (!firestore) return;

    const formattedValues = {
        ...values,
        name: values.name.toUpperCase(),
        ensino: values.ensino.toUpperCase(),
        grade: values.grade.toUpperCase(),
        class: values.class.toUpperCase(),
        shift: values.shift.toUpperCase(),
    };

    startTransition(async () => {
      try {
        await addDoc(collection(firestore, 'students'), formattedValues);
        toast({
          title: 'Sucesso!',
          description: `Aluno(a) ${formattedValues.name} adicionado(a) com sucesso.`,
        });
        addForm.reset();
        fetchStudents(); // Re-fetch students to update dynamic lists
      } catch (error) {
        console.error("Error adding student: ", error);
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível adicionar o aluno.',
        });
      }
    });
  };

  const handleUpdateStudent = async (values: z.infer<typeof editStudentSchema>) => {
    if (!firestore || !selectedStudent) return;

    const formattedValues = {
        ...values,
        ensino: values.ensino.toUpperCase(),
        grade: values.grade.toUpperCase(),
        class: values.class.toUpperCase(),
        shift: values.shift.toUpperCase(),
    };
    
    startTransition(async () => {
        try {
            const studentRef = doc(firestore, 'students', selectedStudent.id);
            await updateDoc(studentRef, formattedValues);
            toast({
                title: 'Sucesso!',
                description: `Dados do(a) aluno(a) ${selectedStudent.name} atualizados.`,
            });
            fetchStudents();
            setSelectedStudent(prev => prev ? { ...prev, ...formattedValues } : null);
        } catch (error) {
            console.error("Error updating student: ", error);
            toast({
              variant: 'destructive',
              title: 'Erro',
              description: 'Não foi possível atualizar os dados do aluno.',
            });
        }
    });
  }


  const handleDeleteStudent = () => {
    if (!firestore || !selectedStudent) return;
    setIsDeleteDialogOpen(false);

    startTransition(async () => {
        try {
            await deleteDoc(doc(firestore, 'students', selectedStudent.id));
            toast({
                title: 'Sucesso!',
                description: `Aluno(a) ${selectedStudent.name} removido(a) com sucesso.`,
            });
            setSelectedStudent(null);
            fetchStudents();
        } catch (error) {
            console.error("Error deleting student: ", error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível remover o aluno.',
            });
        }
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onDialogOpenChange}>
        <DialogTrigger asChild>
          <Button className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg" size="icon">
            <UserPlus className="h-8 w-8" />
            <span className="sr-only">Gerenciar Alunos</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Gerenciar Alunos</DialogTitle>
            <DialogDescription>Adicione, edite ou remova alunos do sistema.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="add" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add">Adicionar Aluno</TabsTrigger>
              <TabsTrigger value="edit">Editar / Remover Aluno</TabsTrigger>
            </TabsList>
            <TabsContent value="add">
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(handleAddStudent)} className="space-y-4 py-4">
                    <FormField control={addForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Nome do Aluno" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={addForm.control} name="ensino" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Ensino</FormLabel>
                                <Combobox options={ensinoOptions} {...field} placeholder="Selecione ou crie" notFoundText="Nenhum ensino encontrado." />
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={addForm.control} name="shift" render={({ field }) => (
                             <FormItem className="flex flex-col">
                                <FormLabel>Turno</FormLabel>
                                <Combobox options={shiftOptions} {...field} placeholder="Selecione ou crie" notFoundText="Nenhum turno encontrado." />
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={addForm.control} name="grade" render={({ field }) => (
                           <FormItem className="flex flex-col">
                                <FormLabel>Série</FormLabel>
                                <Combobox options={gradeOptions} {...field} placeholder="Selecione ou crie" notFoundText="Nenhuma série encontrada." />
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={addForm.control} name="class" render={({ field }) => (
                           <FormItem className="flex flex-col">
                                <FormLabel>Turma</FormLabel>
                                <Combobox options={classOptions} {...field} placeholder="Selecione ou crie" notFoundText="Nenhuma turma encontrada." />
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                     <FormField control={addForm.control} name="telefone" render={({ field }) => (
                        <FormItem><FormLabel>Telefone (Opcional)</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  <DialogFooter>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                      Adicionar Aluno
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="edit">
                <div className="space-y-4 py-4">
                    <Label>Buscar Aluno</Label>
                     <Command className="rounded-lg border shadow-md">
                        <CommandInput placeholder="Digite o nome do aluno para buscar..." />
                        <CommandList>
                            <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                            <CommandGroup heading="Alunos">
                                {students.map((student) => (
                                <CommandItem
                                    key={student.id}
                                    onSelect={() => setSelectedStudent(student)}
                                    className="flex justify-between items-center"
                                >
                                    <span>{student.name} <span className="text-xs text-muted-foreground ml-2">{student.grade} {student.class}</span></span>
                                </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>

                    {selectedStudent && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{selectedStudent.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <Form {...editForm}>
                                    <form onSubmit={editForm.handleSubmit(handleUpdateStudent)} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={editForm.control} name="ensino" render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Ensino</FormLabel>
                                                    <Combobox options={ensinoOptions} {...field} placeholder="Selecione ou crie" notFoundText="Nenhum ensino encontrado." />
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={editForm.control} name="shift" render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Turno</FormLabel>
                                                    <Combobox options={shiftOptions} {...field} placeholder="Selecione ou crie" notFoundText="Nenhum turno encontrado." />
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={editForm.control} name="grade" render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                    <FormLabel>Série</FormLabel>
                                                    <Combobox options={gradeOptions} {...field} placeholder="Selecione ou crie" notFoundText="Nenhuma série encontrada." />
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={editForm.control} name="class" render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                    <FormLabel>Turma</FormLabel>
                                                    <Combobox options={classOptions} {...field} placeholder="Selecione ou crie" notFoundText="Nenhuma turma encontrada." />
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <FormField control={editForm.control} name="telefone" render={({ field }) => (
                                            <FormItem><FormLabel>Telefone (Opcional)</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <div className="flex justify-end gap-2 pt-4">
                                            <Button type="button" variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={isPending}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Remover
                                            </Button>
                                            <Button type="submit" disabled={isPending || !editForm.formState.isDirty}>
                                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                Salvar Alterações
                                            </Button>
                                        </div>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá remover permanentemente o aluno(a) <span className="font-bold">{selectedStudent?.name}</span> e todos os seus dados de frequência do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStudent}>Confirmar Remoção</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
