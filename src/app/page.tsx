
"use client";

import { FileUp, Users, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { UserProfile } from "@/lib/types";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const allFeatures = [
  {
    title: "Registrar Frequência",
    description: "Faça a chamada diária dos alunos de forma rápida e eficiente.",
    icon: <Users className="h-8 w-8 text-primary" />,
    href: "/attendance",
  },
  {
    title: "Gerar Relatórios",
    description: "Exporte relatórios de ausências diárias em PDF com filtros.",
    icon: <FileText className="h-8 w-8 text-primary" />,
    href: "/reports",
  },
  {
    title: "Importar Alunos",
    description: "Importe e gerencie a lista de alunos a partir de arquivos Excel.",
    icon: <FileUp className="h-8 w-8 text-primary" />,
    href: "/import",
  },
];

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('userProfile');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
      <div className="space-y-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight font-headline sm:text-5xl md:text-6xl">
          SISFAC - FREQUÊNCIA
        </h1>
        <p className="mt-6 text-lg max-w-2xl text-muted-foreground">
          {user ? `Bem-vindo(a) de volta, ${user.fullName || user.username}!` : "Bem-vindo!"}
          <br />
          Selecione uma das opções abaixo para começar a gerenciar a frequência.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {allFeatures.map((feature) => (
          <Link href={feature.href} key={feature.title}>
            <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-transform duration-300 group">
              <CardHeader className="flex flex-col items-center justify-center text-center p-6">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  {feature.icon}
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription className="mt-2">{feature.description}</CardDescription>
                 <div className="mt-4 flex items-center text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Acessar <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
