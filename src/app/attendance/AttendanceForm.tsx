"use client";

import { useState, useTransition } from 'react';
import type { Student } from '@/lib/types';
import { saveAttendance } from '@/actions/attendance-actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, UserCheck, UserX } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface AttendanceFormProps {
    students: Student[];
    initialAttendance: Record<string, 'present' | 'absent'>;
}

export function AttendanceForm({ students, initialAttendance }: AttendanceFormProps) {
    const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>(() => {
        const initial = { ...initialAttendance };
        students.forEach(student => {
            if (!initial[student.id]) {
                initial[student.id] = 'present';
            }
        });
        return initial;
    });
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleToggle = (studentId: string, isPresent: boolean) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: isPresent ? 'present' : 'absent',
        }));
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData();
        Object.entries(attendance).forEach(([studentId, status]) => {
            formData.append(studentId, status);
        });

        startTransition(async () => {
            const result = await saveAttendance(formData, students);
            if (result.error) {
                toast({
                    variant: 'destructive',
                    title: 'Erro',
                    description: result.error,
                });
            } else {
                toast({
                    title: 'Sucesso',
                    description: result.success,
                });
            }
        });
    };

    const presentCount = Object.values(attendance).filter(s => s === 'present').length;
    const absentCount = students.length - presentCount;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-end gap-6 text-sm font-medium">
                <div className="flex items-center gap-2" style={{color: 'hsl(142.1 76.2% 36.3%)'}}>
                    <UserCheck className="h-5 w-5" />
                    Presentes: {presentCount}
                </div>
                <div className="flex items-center gap-2" style={{color: 'hsl(0 84.2% 60.2%)'}}>
                    <UserX className="h-5 w-5" />
                    Ausentes: {absentCount}
                </div>
            </div>
            <ScrollArea className="h-96 w-full rounded-md border">
                <div className="p-1">
                    {students.map((student, index) => (
                        <div key={student.id}>
                            <div className="flex items-center justify-between p-3 rounded-md hover:bg-accent/30 transition-colors">
                                <Label htmlFor={student.id} className="cursor-pointer">
                                    <p className="text-base font-medium">{student.name}</p>
                                    <p className="text-sm font-normal text-muted-foreground">{student.class}</p>
                                </Label>
                                <Switch
                                    id={student.id}
                                    name={student.id}
                                    checked={attendance[student.id] === 'present'}
                                    onCheckedChange={(checked) => handleToggle(student.id, checked)}
                                    aria-label={`Marcar presença para ${student.name}`}
                                />
                            </div>
                            {index < students.length - 1 && <Separator />}
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                    <><Save className="mr-2 h-4 w-4" /> Salvar Frequência</>
                )}
            </Button>
        </form>
    );
}
