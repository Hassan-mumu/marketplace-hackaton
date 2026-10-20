/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserBudget } from '@/services/hackathon.services';
import { toast } from 'sonner';

// 👉 PERSONNALISEZ VOTRE LOGO
const BRAND_CONFIG = {
  name: 'HACKATHON',
  accentText: 'Upcycling-Challenge',
  logoImageUrl: 'Logo_Hackaton_2026-2027.png', // <-- J'ai repris le nom de votre fichier
  fallbackIcon: '🚀',
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [budget, setBudget] = useState<number>(0);

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

    // Écoute les investissements réalisés dans la galerie pour mettre à jour la Navbar
    const handleBudgetUpdate = (e: any) => {
      setBudget(e.detail);
    };
    window.addEventListener('budget-updated', handleBudgetUpdate);

    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener('budget-updated', handleBudgetUpdate);
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success('Vous êtes déconnecté.');
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-40 bg-slate-900/85 backdrop-blur-md border-b border-slate-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* LOGO PERSONNALISABLE + MENU */}
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold flex items-center gap-3">
            {BRAND_CONFIG.logoImageUrl ? (
              <img src={'/' + BRAND_CONFIG.logoImageUrl} alt="Logo" className="h-9 w-auto object-contain rounded-lg" />
            ) : (
              <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-lg shadow-md">
                {BRAND_CONFIG.fallbackIcon}
              </span>
            )}
            <span>
              {BRAND_CONFIG.name} <span className="text-cyan-400">{BRAND_CONFIG.accentText}</span>
            </span>
          </Link>

          <nav className="flex gap-6 text-sm font-medium">
            <Link href="/" className={pathname === '/' ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1' : 'text-slate-400 hover:text-white pb-1'}>Galerie des Projets</Link>
            <Link href="/workspace" className={pathname.startsWith('/workspace') ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1' : 'text-slate-400 hover:text-white pb-1'}>Mon Groupe & Espace Projet</Link>
            <Link href="/leaderboard" className={pathname.startsWith('/leaderboard') ? 'text-amber-400 border-b-2 border-amber-400 pb-1' : 'text-slate-400 hover:text-amber-400 pb-1'}>🏆 Podium</Link>
          </nav>

        </div>

        {/* STATUT DU BUDGET & PROFIL UTILISATEUR */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="px-4 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
              💰 Budget : {budget} Cyber-Coins
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-3 text-sm bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-700">
             <Link href="/profile" className="font-medium text-cyan-300 hover:underline">
                {user.user_metadata?.display_name || user.email}
              </Link>
              <button onClick={handleLogout} className="text-xs text-rose-400 hover:underline border-l border-slate-700 pl-3">
                Déconnexion
              </button>
            </div>
          ) : (
            <Link
              href="/workspace"
              className="text-xs font-semibold px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600"
            >
              Se connecter / S&apos;inscrire
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}