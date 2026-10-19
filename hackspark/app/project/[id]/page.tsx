/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getProjectById, getUserVote, toggleUniqueVote } from '@/services/hackathon.services';
import { toast } from 'sonner';

export default function ProjectDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [myVoteProjectId, setMyVoteProjectId] = useState<string | null>(null);

  useEffect(() => {
    loadDetail();
  }, [id]);

  async function loadDetail() {
    try {
      const [{ project: proj, members: team }, { data: sessionData }] = await Promise.all([
        getProjectById(id),
        supabase.auth.getSession(),
      ]);
      setProject(proj);
      setMembers(team);

      const currentUser = sessionData.session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const votedId = await getUserVote(currentUser.id);
        setMyVoteProjectId(votedId);
      }
    } catch (err: any) {
      toast.error('Projet introuvable : ' + err.message);
    }
  }

  async function handleVote() {
    if (!user) {
      toast.warning('Connectez-vous pour pouvoir voter !');
      return;
    }
    try {
      const res = await toggleUniqueVote(user.id, project.id, myVoteProjectId);
      setMyVoteProjectId(res.votedProjectId);
      window.dispatchEvent(new Event('vote-updated'));

      if (res.action === 'added') toast.success('Vote enregistré pour ce projet ! 🎉');
      if (res.action === 'moved') toast.info('Votre voix a été déplacée sur ce projet.');
      if (res.action === 'removed') toast('Votre vote a été retiré.');

      await loadDetail();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (!project) return <p className="text-slate-400">Chargement du projet...</p>;

  return (
    <div className="space-y-6">
      <button onClick={() => router.push('/')} className="text-sm text-slate-400 hover:text-white">
        ← Retour à la galerie
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {project.video_url ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2">
              <video controls poster={project.image_url} className="w-full h-96 object-cover rounded-xl bg-black">
                <source src={project.video_url} />
              </video>
            </div>
          ) : (
            project.image_url && (
              <img src={project.image_url} alt={project.title} className="w-full h-96 object-cover rounded-2xl border border-slate-800" />
            )
          )}

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">{project.title}</h1>
              <span className="text-sm text-cyan-400">Groupe : {project.group_name}</span>
            </div>
            <p className="text-slate-300 whitespace-pre-line leading-relaxed">{project.description}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
            <button
              onClick={handleVote}
              className={`w-full py-3 rounded-xl font-bold text-sm transition ${
                myVoteProjectId === project.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white'
              }`}
            >
              {myVoteProjectId === project.id ? '✓ Vous soutenez ce projet' : 'Attribuer mon unique voix'}
            </button>
            <div className="text-2xl font-bold">
              {project.votes_count} <span className="text-sm font-normal text-slate-400">voix reçues</span>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-lg">Ont participé à la conception</h3>
            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-sm">
                    {m.display_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{m.display_name}</div>
                    <div className="text-xs text-slate-400">{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}