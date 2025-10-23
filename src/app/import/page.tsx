
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp } from "lucide-react";
import { ImportForm } from "./ImportForm";

export default function ImportPage() {
  return (
    <div className="max-w-2xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-bold font-headline">Gerenciar Dados dos Alunos</h1>
            <p className="text-muted-foreground mt-2">
                Use as opções abaixo para importar, atualizar ou limpar o banco de dados de alunos.
                O arquivo Excel deve conter as colunas na seguinte ordem: Nome, Série, Turma, Turno, Ensino.
            </p>
        </div>
        <ImportForm />
    </div>
  );
}
