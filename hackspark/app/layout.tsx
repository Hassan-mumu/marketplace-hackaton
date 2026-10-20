import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "sonner";
import { Suspense } from "react";

// On remplace Inter par Space Grotesk pour un look Hackathon Tech !
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

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
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body className={`${spaceGrotesk.className} antialiased min-h-screen bg-slate-950 text-slate-50`}>
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