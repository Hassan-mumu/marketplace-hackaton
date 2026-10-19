import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Plateforme Hackathon',
  description: 'Découvrez et votez pour les projets du Hackathon',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen bg-[#0b0d17] text-slate-100 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
          {children}
        </main>
        {/* Notifications visuelles en haut à droite */}
        <Toaster position="top-right" richColors theme="dark" />
      </body>
    </html>
  );
}