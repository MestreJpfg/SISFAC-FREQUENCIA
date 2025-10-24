
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, Users, FileText } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const features = [
    {
      title: "Registrar Frequência",
      description: "Marque a presença diária dos alunos de forma rápida e fácil.",
      icon: <Users className="h-8 w-8 text-primary" />,
      href: "/attendance",
      cta: "Registrar Frequência"
    },
    {
      title: "Gerar Relatórios",
      description: "Visualize relatórios de faltas diários e mensais.",
      icon: <FileText className="h-8 w-8 text-primary" />,
      href: "/reports",
      cta: "Ver Relatórios"
    },
    {
      title: "Importar Alunos",
      description: "Carregue um arquivo Excel para criar seu banco de dados de alunos.",
      icon: <FileUp className="h-8 w-8 text-primary" />,
      href: "/import",
      cta: "Começar Importação"
    },
  ];

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight font-headline sm:text-5xl md:text-6xl">
          School Attendance Tracker
        </h1>
        <p className="mt-6 text-lg max-w-2xl text-muted-foreground">
          Uma solução simples e moderna para gerenciar a frequência escolar. Importe sua lista de alunos, marque a presença diária e gere relatórios com apenas alguns cliques.
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-3 w-full max-w-6xl">
        {features.map((feature) => (
          <Card key={feature.title} className="text-left transform hover:scale-105 transition-transform duration-300 ease-in-out shadow-lg hover:shadow-2xl bg-card">
            <CardHeader className="flex flex-col items-start gap-4">
              <div className="bg-primary/20 p-3 rounded-lg">
                {feature.icon}
              </div>
              <div>
                <CardTitle className="font-headline">{feature.title}</CardTitle>
                <CardDescription className="mt-1">{feature.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href={feature.href}>{feature.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
