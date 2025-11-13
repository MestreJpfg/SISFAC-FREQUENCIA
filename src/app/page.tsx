
"use client";

import { Button } from "@/components/ui/button";
import { FileUp, Users, FileText } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { UserProfile } from "@/lib/types";

const allFeatures = [
  {
    title: "Registrar Frequência",
    icon: <Users className="h-6 w-6" />,
    href: "/attendance",
  },
  {
    title: "Gerar Relatórios",
    icon: <FileText className="h-6 w-6" />,
    href: "/reports",
  },
  {
    title: "Importar Alunos",
    icon: <FileUp className="h-6 w-6" />,
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
    <div className="flex flex-col items-center text-center space-y-8 h-full justify-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight font-headline sm:text-5xl md:text-6xl">
          SISFAC - FREQUÊNCIA
        </h1>
        <p className="mt-6 text-lg max-w-2xl text-muted-foreground">
          {user ? `Bem-vindo(a) de volta, ${user.fullName || user.username}!` : "Bem-vindo!"}
          <br />
          Escolha uma das opções abaixo para começar.
        </p>
      </div>

      <div className="fixed bottom-8 right-8 flex flex-col items-end gap-4 z-20">
        {allFeatures.map((feature) => (
          <Button
            key={feature.title}
            asChild
            className="h-16 w-auto px-6 shadow-lg rounded-full text-lg"
          >
            <Link href={feature.href}>
              {feature.icon}
              <span className="ml-3">{feature.title}</span>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
