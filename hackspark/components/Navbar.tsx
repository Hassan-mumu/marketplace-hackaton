/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserBudget } from '@/services/hackathon.services';
import { toast } from 'sonner';
// Ajout des icônes Menu et X pour la navigation mobile
import { LayoutGrid, Users, Trophy, Wallet, UserCircle, LogOut, Code2, Menu, X } from 'lucide-react';

const BRAND_CONFIG = {
  name: 'HACKATHON',
  accentText: 'Upcycling',
  logoImageUrl: 'Logo_Hackaton_2026-2027.png', 
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [budget, setBudget] = useState<number>(0);
  
  // Nouvel état pour le menu mobile
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) getUserBudget(u.id).then((b) => setBudget(b));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) getUserBudget(u.id).then((b) => setBudget(b));
      else setBudget(0);
    });

    const handleBudgetUpdate = (e: any) => setBudget(e.detail);
    window.addEventListener('budget-updated', handleBudgetUpdate);

    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener('budget-updated', handleBudgetUpdate);
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success('Vous êtes déconnecté.');
    setIsMenuOpen(false); // Ferme le menu au cas où on se déconnecte depuis mobile
    router.push('/');
  }

  // Empêcher le défilement de la page quand le menu mobile est ouvert
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-6 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold flex items-center gap-3">
              {BRAND_CONFIG.logoImageUrl ? (
                <img src={'/' + BRAND_CONFIG.logoImageUrl} alt="Logo Hackathon" className="h-16 w-auto object-contain mix-blend-screen" />
              ) : (
                <Code2 className="w-8 h-8 text-emerald-400" />
              )}
              <span className="tracking-wider hidden sm:block">
                {BRAND_CONFIG.name} <span className="text-emerald-400">{BRAND_CONFIG.accentText}</span>
              </span>
            </Link>

            {/* LIENS DESKTOP (cachés sur mobile) */}
            <nav className="hidden md:flex gap-6 text-sm font-semibold">
              <Link href="/" className={`flex items-center gap-2 pb-1 ${pathname === '/' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'}`}>
                <LayoutGrid className="w-4 h-4" /> Galerie
              </Link>
              <Link href="/workspace" className={`flex items-center gap-2 pb-1 ${pathname.startsWith('/workspace') ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'}`}>
                <Users className="w-4 h-4" /> Espace Équipe
              </Link>
              <Link href="/leaderboard" className={`flex items-center gap-2 pb-1 ${pathname.startsWith('/leaderboard') ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-amber-400'}`}>
                <Trophy className="w-4 h-4" /> Podium
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="px-4 py-2 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-2 shadow-[0_0_10px_rgba(251,191,36,0.1)]">
                <Wallet className="w-4 h-4" />
                <span>{budget} CC</span>
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-2 bg-slate-900 px-2 py-1.5 rounded-full border border-slate-800">
                <Link href="/profile" title="Mon Profil" className="p-1.5 text-emerald-400 hover:bg-slate-800 rounded-full transition">
                  <UserCircle className="w-5 h-5" />
                </Link>
                <div className="w-[1px] h-5 bg-slate-700 mx-1"></div>
                <button onClick={handleLogout} title="Se déconnecter" className="p-1.5 text-rose-400 hover:bg-slate-800 rounded-full transition">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link href="/workspace" className="text-xs font-bold px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg hidden sm:block">
                Connexion
              </Link>
            )}

            {/* BOUTON MENU HAMBURGER (visible uniquement sur mobile) */}
            <button 
              onClick={() => setIsMenuOpen(true)} 
              className="md:hidden p-2 text-slate-400 hover:text-white transition"
            >
              <Menu className="w-7 h-7" />
            </button>
          </div>
        </div>
      </header>

      {/* MENU LATÉRAL MOBILE */}
      {/* Fond sombre cliquable pour fermer le menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden" 
          onClick={() => setIsMenuOpen(false)} 
        />
      )}
      
      {/* Tiroir de navigation à gauche */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 p-6 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col gap-8 shadow-2xl ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center">
          <span className="font-bold text-lg text-white">Menu</span>
          <button onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex flex-col gap-6 text-sm font-semibold">
          <Link 
            href="/" 
            onClick={() => setIsMenuOpen(false)} 
            className={`flex items-center gap-3 ${pathname === '/' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
          >
            <LayoutGrid className="w-5 h-5" /> Galerie
          </Link>
          <Link 
            href="/workspace" 
            onClick={() => setIsMenuOpen(false)} 
            className={`flex items-center gap-3 ${pathname.startsWith('/workspace') ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Users className="w-5 h-5" /> Espace Équipe
          </Link>
          <Link 
            href="/leaderboard" 
            onClick={() => setIsMenuOpen(false)} 
            className={`flex items-center gap-3 ${pathname.startsWith('/leaderboard') ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}`}
          >
            <Trophy className="w-5 h-5" /> Podium
          </Link>
        </nav>

        {/* Bouton de connexion pour mobile si non connecté */}
        {!user && (
          <div className="mt-auto pt-6 border-t border-slate-800">
            <Link 
              href="/workspace" 
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center justify-center w-full text-xs font-bold px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg"
            >
              Connexion
            </Link>
          </div>
        )}
      </div>
    </>
  );
}