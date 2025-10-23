import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp } from "lucide-react";
import { ImportForm } from "./ImportForm";

export default function ImportPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 p-3 rounded-lg">
              <FileUp className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="font-headline">Importar Banco de Dados de Alunos</CardTitle>
              <CardDescription className="mt-1">
                Envie um arquivo Excel (.xlsx, .xls) com as colunas 'Nome' e 'Turma' para popular o sistema.
                Atenção: o envio de um novo arquivo substituirá todos os dados existentes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
