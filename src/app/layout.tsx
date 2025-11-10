import type { Metadata } from "next";
import { PT_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { cn } from "@/lib/utils";
import { ReactElement, Suspense } from "react";
import { AppController } from "@/components/AppController";

const ptSans = PT_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "SISFAC - Registro Frequencia",
  description: "App para registro de frequência escolar",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactElement;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={cn("font-sans antialiased", ptSans.variable)}>
        <FirebaseClientProvider>
          <Suspense fallback={<div>Carregando...</div>}>
            <AppController>
              {children}
            </AppController>
          </Suspense>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
