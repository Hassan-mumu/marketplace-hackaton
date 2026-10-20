/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getPublishedProjects, getUserBudget, investCyberCoins } from '@/services/hackathon.services';
import ProjectCard from '@/components/ProjectCard';
import { toast } from 'sonner';

export default function GalleryPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [budget, setBudget] = useState<number>(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGallery();
  }, []);

 async function loadGallery() {
    setLoading(true);
    try {
      // 1. Récupérer d'abord la session utilisateur
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user ?? null;
      setUser(currentUser);

      // 2. Charger les projets EN PASSANT l'ID de l'utilisateur (pour le filtrage côté serveur)
      const projectsData = await getPublishedProjects(currentUser?.id);
      setProjects(projectsData);
      
      // 3. Charger le budget si l'utilisateur est connecté
      if (currentUser) {
        const remaining = await getUserBudget(currentUser.id);
        setBudget(remaining);
      }
    } catch (err: any) {
      toast.error('Erreur de chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ET DANS handleInvest, passez aussi user.id à getPublishedProjects :
  async function handleInvest(projectId: string, amount: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) {
      toast.warning('Veuillez vous connecter pour investir !');
      return;
    }

    if (amount <= 0 || amount > budget) {
      toast.error("Montant d'investissement invalide.");
      return;
    }

    try {
      const res = await investCyberCoins(user.id, projectId, amount);
      setBudget(res.remaining_budget);
      toast.success(`Investissement de ${amount} Cyber-Coins réussi ! 🚀`);
      
      // Mettre à jour la liste des projets
      const updated = await getPublishedProjects(user.id); // <-- MODIFIÉ ICI
      setProjects(updated);
      
      window.dispatchEvent(new CustomEvent('budget-updated', { detail: res.remaining_budget }));
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const filtered = projects.filter(
    (p) =>
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.group_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Galerie des Projets</h1>
          <p className="text-slate-400 mt-1">
            Découvrez les projets du Hackathon et investissez judicieusement vos {budget > 0 ? budget : 500} Cyber-Coins.
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un projet ou une équipe..."
          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm w-72 focus:outline-none focus:border-cyan-400"
        />
      </div>

      {loading ? (
        <p className="text-slate-400">Chargement des projets...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <p className="text-lg font-semibold">Aucun projet publié pour le moment.</p>
          <p className="text-sm text-slate-400">
            Rendez-vous dans "Mon Groupe & Espace Projet" pour publier un projet et lancer la levée de fonds !
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((proj) => (
            <ProjectCard
              key={proj.id}
              project={proj}
              remainingBudget={budget}
              onInvest={handleInvest}
            />
          ))}
        </div>
      )}
    </div>
  );
}