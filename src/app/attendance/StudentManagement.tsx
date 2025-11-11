
"use client";

import { useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, query, getDocs } from 'firebase/firestore';
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
  DialogFooter,
  DialogClose
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
import { UserPlus, Loader2, Trash2, Search } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

type StudentWithId = Student & { id: string };

const studentSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  ensino: z.string().min(1, "O nível de ensino é obrigatório."),
  grade: z.string().min(1, "A série é obrigatória."),
  class: z.string().min(1, "A turma é obrigatória."),
  shift: z.string().min(1, "O turno é obrigatório."),
  telefone: z.string().optional(),
});

export function StudentManagement() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [students, setStudents] = useState<StudentWithId[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithId | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const form = useForm<z.infer<typeof studentSchema>>({
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
    }
    setIsOpen(open);
  }

  const handleAddStudent = async (values: z.infer<typeof studentSchema>) => {
    if (!firestore) return;
    startTransition(async () => {
      try {
        await addDoc(collection(firestore, 'students'), values);
        toast({
          title: 'Sucesso!',
          description: `Aluno(a) ${values.name} adicionado(a) com sucesso.`,
        });
        form.reset();
        // Maybe close dialog or switch tab, for now just reset form
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

  const handleDeleteStudent = () => {
    if (!firestore || !selectedStudent) return;
    setIsDeleteDialogOpen(false); // Close confirmation dialog first

    startTransition(async () => {
        try {
            await deleteDoc(doc(firestore, 'students', selectedStudent.id));
            toast({
                title: 'Sucesso!',
                description: `Aluno(a) ${selectedStudent.name} removido(a) com sucesso.`,
            });
            setSelectedStudent(null);
            // Refetch students to update the list
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
            <DialogDescription>Adicione ou remova alunos do sistema.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="add" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add">Adicionar Aluno</TabsTrigger>
              <TabsTrigger value="remove">Remover Aluno</TabsTrigger>
            </TabsList>
            <TabsContent value="add">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddStudent)} className="space-y-4 py-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Nome do Aluno" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="ensino" render={({ field }) => (
                            <FormItem><FormLabel>Ensino</FormLabel><FormControl><Input placeholder="Ex: Fundamental" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="shift" render={({ field }) => (
                            <FormItem><FormLabel>Turno</FormLabel><FormControl><Input placeholder="Ex: Manhã" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="grade" render={({ field }) => (
                            <FormItem><FormLabel>Série</FormLabel><FormControl><Input placeholder="Ex: 9º Ano" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="class" render={({ field }) => (
                            <FormItem><FormLabel>Turma</FormLabel><FormControl><Input placeholder="Ex: A" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                     <FormField control={form.control} name="telefone" render={({ field }) => (
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
            <TabsContent value="remove">
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
                        <div className="p-4 border rounded-md bg-muted/50">
                            <p className="font-semibold">{selectedStudent.name}</p>
                            <p className="text-sm text-muted-foreground">{selectedStudent.ensino} - {selectedStudent.grade} {selectedStudent.class} - {selectedStudent.shift}</p>
                        </div>
                    )}
                </div>
                 <DialogFooter>
                    <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={!selectedStudent || isPending}>
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Remover Aluno Selecionado
                    </Button>
                  </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá remover permanentemente o aluno(a) <span className="font-bold">{selectedStudent?.name}</span> e todos os seus dados do sistema.
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
