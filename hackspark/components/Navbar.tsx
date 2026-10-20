/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserBudget } from '@/services/hackathon.services';
import { toast } from 'sonner';
import { LayoutGrid, Users, Trophy, Wallet, UserCircle, LogOut, Code2 } from 'lucide-react';

const BRAND_CONFIG = {
  name: 'HACKATHON',
  accentText: 'Upcycling',
  // Assurez-vous que l'extension est bien .jpg ou .png selon votre fichier
  logoImageUrl: 'Logo_Hackaton_2026-2027.png', 
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
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-6 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* LOGO AGRANDI ET ADAPTÉ */}
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold flex items-center gap-3">
            {BRAND_CONFIG.logoImageUrl ? (
              // h-16 agrandit fortement le logo. mix-blend-screen fond le fond noir avec la navbar.
              <img src={'/' + BRAND_CONFIG.logoImageUrl} alt="Logo Hackathon" className="h-16 w-auto object-contain mix-blend-screen" />
            ) : (
              <Code2 className="w-8 h-8 text-emerald-400" />
            )}
            <span className="tracking-wider hidden sm:block">
              {BRAND_CONFIG.name} <span className="text-emerald-400">{BRAND_CONFIG.accentText}</span>
            </span>
          </Link>

          {/* LIENS AVEC COULEUR ÉMERAUDE */}
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

        {/* PROFIL & ACTIONS */}
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
            <Link href="/workspace" className="text-xs font-bold px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg">
              Connexion
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}