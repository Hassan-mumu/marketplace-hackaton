import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "sonner";
import { Suspense } from "react";

// Chargement automatique de la police sans fichier local
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hackathon - Upcycling Challenge",
  description: "Plateforme de crowdfunding du Hackathon EPHEC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${inter.className} antialiased min-h-screen bg-slate-950 text-slate-50`}
      >
        <Suspense fallback={<header className="h-16 bg-slate-900 border-b border-slate-800"></header>}>
          <Navbar />
        </Suspense>
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}