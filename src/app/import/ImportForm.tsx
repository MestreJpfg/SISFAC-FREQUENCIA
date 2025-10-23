"use client";

import { useState, useRef, useTransition } from 'react';
import { uploadStudents } from '@/actions/upload-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';

export function ImportForm() {
  const [isPending, startTransition] = useTransition();
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileName(file ? file.name : '');
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
