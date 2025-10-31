
"use client";

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { doc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EditablePhoneCellProps {
  studentId: string;
  initialPhone: string;
  onPhoneUpdate: (studentId: string, newPhone: string) => void;
}

export function EditablePhoneCell({ studentId, initialPhone, onPhoneUpdate }: EditablePhoneCellProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState(initialPhone);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPhone(initialPhone);
  }, [initialPhone]);

  const handleSave = async () => {
    if (!firestore || phone === initialPhone) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);

    try {
      const batch = writeBatch(firestore);

      // 1. Update the student document
      const studentRef = doc(firestore, 'students', studentId);
      batch.update(studentRef, { telefone: phone });

      // 2. Find and update all attendance records for the student
      const attendanceQuery = query(collection(firestore, 'attendance'), where('studentId', '==', studentId));
      const attendanceSnapshot = await getDocs(attendanceQuery);
      attendanceSnapshot.forEach((doc) => {
        batch.update(doc.ref, { telefone: phone });
      });
      
      await batch.commit();

      toast({
        title: "Sucesso",
        description: "Telefone atualizado com sucesso.",
      });

      onPhoneUpdate(studentId, phone);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update phone number:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao atualizar o telefone. Verifique as permissões do banco de dados.",
      });
      // Revert local state on failure
      setPhone(initialPhone);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPhone(initialPhone);
    setIsEditing(false);
  };
  
  const formatTelefone = (telefone?: string) => {
    if (!telefone) return '-';
    return telefone.split(',').slice(0, 2).join(', ');
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="h-8"
          autoFocus
          disabled={isSaving}
        />
        <Button size="icon" variant="ghost" onClick={handleSave} disabled={isSaving} className="h-8 w-8">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={handleCancel} disabled={isSaving} className="h-8 w-8">
          <X className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      className="cursor-pointer hover:bg-muted p-1 rounded-md min-h-[30px]"
      title="Clique para editar"
    >
      {formatTelefone(phone)}
    </div>
  );
}

