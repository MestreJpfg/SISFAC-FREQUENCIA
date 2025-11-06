import type { Metadata } from "next";
import { PT_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { AuthGuard } from "@/components/AuthGuard";
import { cn } from "@/lib/utils";
import { ReactElement } from "react";

const ptSans = PT_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "School Attendance Tracker",
  description: "App para registro de frequência escolar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactElement; // Expect a single ReactElement
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={cn("font-sans antialiased", ptSans.variable)}>
        <FirebaseClientProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
