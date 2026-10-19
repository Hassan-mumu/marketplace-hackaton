/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getPublishedProjects, getUserVote, toggleUniqueVote } from '@/services/hackathon.services';
import ProjectCard from '@/components/ProjectCard';
import { toast } from 'sonner';

export default function GalleryPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [myVoteProjectId, setMyVoteProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGallery();
  }, []);

  async function loadGallery() {
    setLoading(true);
    try {
      const [{ data: sessionData }, projectsData] = await Promise.all([
        supabase.auth.getSession(),
        getPublishedProjects(),
      ]);
      setProjects(projectsData);

      const currentUser = sessionData.session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const votedId = await getUserVote(currentUser.id);
        setMyVoteProjectId(votedId);
      }
    } catch (err: any) {
      toast.error('Erreur de chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(projectId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) {
      toast.warning('Veuillez vous connecter dans "Mon Groupe & Espace Projet" pour voter !');
      return;
    }

    try {
      const res = await toggleUniqueVote(user.id, projectId, myVoteProjectId);
      setMyVoteProjectId(res.votedProjectId);
      window.dispatchEvent(new Event('vote-updated'));

      if (res.action === 'added') toast.success('Votre unique voix a bien été attribuée ! 🎉');
      if (res.action === 'moved') toast.info('Votre voix unique a été déplacée sur ce projet.');
      if (res.action === 'removed') toast('Votre vote a été retiré. Vous avez à nouveau 1 voix disponible.');

      const updated = await getPublishedProjects();
      setProjects(updated);
    } catch (err: any) {
      toast.error('Impossible de voter : ' + err.message);
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
            Découvrez tous les projets du Hackathon et soutenez votre favori avec votre unique voix.
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un projet ou un groupe..."
          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm w-72 focus:outline-none focus:border-cyan-400"
        />
      </div>

      {loading ? (
        <p className="text-slate-400">Chargement des projets...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <p className="text-lg font-semibold">Aucun projet publié pour le moment.</p>
          <p className="text-sm text-slate-400">
            Rendez-vous dans &quot;Mon Groupe &amp; Espace Projet&quot; pour créer une équipe et publier un projet !
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((proj) => (
            <ProjectCard
              key={proj.id}
              project={proj}
              isMyChoice={myVoteProjectId === proj.id}
              hasVotedAnything={!!myVoteProjectId}
              onVote={handleVote}
            />
          ))}
        </div>
      )}
    </div>
  );
}