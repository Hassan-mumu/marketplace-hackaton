/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRouter } from 'next/navigation';

interface ProjectCardProps {
  project: any;
  isMyChoice: boolean;
  hasVotedAnything: boolean;
  onVote: (projectId: string, e: React.MouseEvent) => void;
}

export default function ProjectCard({ project, isMyChoice, hasVotedAnything, onVote }: ProjectCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/project/${project.id}`)}
      className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-400/50 transition cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="relative h-48 bg-slate-950">
          {project.image_url ? (
            <img src={project.image_url} alt={project.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">
              Aucune image de couverture
            </div>
          )}
          <span className="absolute top-3 left-3 bg-slate-950/80 px-3 py-1 rounded-full text-xs text-cyan-300 border border-cyan-500/30">
            Par {project.group_name}
          </span>
        </div>

        <div className="p-5">
          <h3 className="text-xl font-bold text-white">{project.title}</h3>
          <p className="text-sm text-slate-400 mt-2 line-clamp-2">{project.description}</p>
          {project.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {project.tags.map((tag: string, i: number) => (
                <span key={i} className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-md border border-slate-700">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between">
        <span className="text-sm font-semibold">❤️ {project.votes_count} voix</span>
        <button
          onClick={(e) => onVote(project.id, e)}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
            isMyChoice
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:opacity-90'
          }`}
        >
          {isMyChoice ? '✓ Votre choix (Retirer)' : hasVotedAnything ? 'Déplacer ma voix' : 'Voter'}
        </button>
      </div>
    </div>
  );
}