'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getPublishedProjects, checkIfAdmin, getPlatformSettings, togglePodiumVisibility } from '@/services/hackathon.services';
import { toast } from 'sonner';

// export const dynamic = 'force-dynamic';

export default function LeaderboardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      
      const [adminStatus, settings, projs] = await Promise.all([
        userId ? checkIfAdmin(userId) : Promise.resolve(false),
        getPlatformSettings(),
        getPublishedProjects(userId) // getPublishedProjects gère déjà le tri par total_funds
      ]);

      setIsAdmin(adminStatus);
      setIsVisible(settings.is_podium_visible);
      
      // On retire les projets avec 0 fonds du podium pour que ce soit plus propre
      setProjects(projs.filter((p: any) => p.total_funds > 0));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleVisibility() {
    try {
      const newState = !isVisible;
      await togglePodiumVisibility(newState);
      setIsVisible(newState);
      toast.success(newState ? 'Le podium est maintenant VISIBLE pour tous les étudiants !' : 'Le podium est CACHÉ.');
    } catch (err) {
      toast.error('Erreur lors du changement de visibilité');
    }
  }

  if (loading) return <div className="text-center py-20 text-slate-400">Chargement du classement...</div>;

  // Sécurité : Si pas admin ET podium caché
  if (!isAdmin && !isVisible) {
    return (
      <div className="max-w-2xl mx-auto text-center py-32 space-y-4">
        <div className="text-6xl">🔒</div>
        <h1 className="text-3xl font-bold text-white">Classement Secret</h1>
        <p className="text-slate-400">Le classement final est actuellement masqué par les administrateurs. Suspense jusqu'à la cérémonie de clôture !</p>
      </div>
    );
  }

  const top3 = projects.slice(0, 3);
  const others = projects.slice(3);

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Podium du Hackathon</h1>
          <p className="text-slate-400 mt-2">Découvrez les projets ayant levé le plus de Cyber-Coins.</p>
        </div>
        
        {isAdmin && (
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <span className="text-sm font-semibold">Visibilité Étudiants :</span>
            <button 
              onClick={handleToggleVisibility}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${isVisible ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isVisible ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
            <span className={`text-xs font-bold ${isVisible ? 'text-emerald-400' : 'text-slate-500'}`}>
              {isVisible ? 'PUBLIC' : 'CACHÉ'}
            </span>
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <p className="text-center text-slate-500 py-10">Aucun investissement n'a encore été réalisé.</p>
      ) : (
        <>
          {/* PODIUM TOP 3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-10">
            {/* 2ème PLACE (Argent) */}
            {top3[1] && (
              <div className="order-2 md:order-1 bg-slate-900 border-t-4 border-slate-300 rounded-t-2xl p-6 text-center transform md:scale-95 shadow-lg relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-slate-300 rounded-full flex items-center justify-center text-2xl font-black text-slate-900 shadow-md">2</div>
                <h3 className="text-xl font-bold mt-4 line-clamp-1">{top3[1].title}</h3>
                <p className="text-sm text-cyan-400 my-2">{top3[1].group_name}</p>
                <div className="text-2xl font-black text-white">{top3[1].total_funds} <span className="text-xs text-slate-400">CC</span></div>
              </div>
            )}
            
            {/* 1ère PLACE (Or) */}
            {top3[0] && (
              <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/20 to-slate-900 border-t-4 border-amber-400 rounded-t-2xl p-8 text-center shadow-[0_-10px_30px_rgba(251,191,36,0.15)] relative z-10">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center text-4xl font-black text-amber-950 shadow-xl border-4 border-slate-950">1</div>
                <h3 className="text-2xl font-bold mt-6 line-clamp-1 text-amber-300">{top3[0].title}</h3>
                <p className="text-sm text-cyan-400 my-2">{top3[0].group_name}</p>
                <div className="text-4xl font-black text-white mt-4">{top3[0].total_funds} <span className="text-sm text-slate-400">CC</span></div>
              </div>
            )}

            {/* 3ème PLACE (Bronze) */}
            {top3[2] && (
              <div className="order-3 md:order-3 bg-slate-900 border-t-4 border-amber-700 rounded-t-2xl p-6 text-center transform md:scale-90 shadow-lg relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-amber-700 rounded-full flex items-center justify-center text-2xl font-black text-amber-100 shadow-md">3</div>
                <h3 className="text-xl font-bold mt-4 line-clamp-1">{top3[2].title}</h3>
                <p className="text-sm text-cyan-400 my-2">{top3[2].group_name}</p>
                <div className="text-2xl font-black text-white">{top3[2].total_funds} <span className="text-xs text-slate-400">CC</span></div>
              </div>
            )}
          </div>

          {/* RESTE DU CLASSEMENT */}
          {others.length > 0 && (
            <div className="mt-12 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              {others.map((proj: any, index: number) => (
                <div key={proj.id} className="flex items-center justify-between p-4 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition">
                  <div className="flex items-center gap-6">
                    <span className="text-xl font-bold text-slate-500 w-8 text-center">{index + 4}</span>
                    <div>
                      <h4 className="font-bold text-slate-200">{proj.title}</h4>
                      <p className="text-xs text-cyan-500">{proj.group_name}</p>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-emerald-400">{proj.total_funds} CC</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}