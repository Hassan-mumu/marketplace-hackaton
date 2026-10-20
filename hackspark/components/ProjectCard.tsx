/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ProjectCardProps {
  project: any;
  remainingBudget: number;
  onInvest: (projectId: string, amount: number, e: React.MouseEvent) => void;
}

export default function ProjectCard({ project, remainingBudget, onInvest }: ProjectCardProps) {
  const router = useRouter();
  const [investAmount, setInvestAmount] = useState(50);

  // Le projet appartient au groupe de l'utilisateur courant
  const isMyProject = project.is_my_group;
  // L'utilisateur courant est un administrateur
  const isAdmin = project.is_admin;
  // Combien l'utilisateur courant a mis dans ce projet
  const myInvestment = project.my_investment || 0;

  return (
    <div
      onClick={() => router.push(`/project/${project.id}`)}
      className={`bg-slate-900/70 border rounded-2xl overflow-hidden transition cursor-pointer flex flex-col justify-between ${
        isMyProject ? 'border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'border-slate-800 hover:border-cyan-400/50'
      }`}
    >
      <div>
        <div className="relative h-48 bg-slate-950">
          {project.image_url ? (
            <img src={project.image_url} alt={project.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">
              Aucune image
            </div>
          )}
          <span className="absolute top-3 left-3 bg-slate-950/80 px-3 py-1 rounded-full text-xs text-cyan-300 border border-cyan-500/30">
            Par {project.group_name}
          </span>
          
          {isMyProject && (
            <span className="absolute top-3 right-3 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
              ★ Votre Projet
            </span>
          )}
        </div>

        <div className="p-5">
          <h3 className="text-xl font-bold text-white">{project.title}</h3>
          <p className="text-sm text-slate-400 mt-2 line-clamp-2">{project.description}</p>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-950/30">
        
        {/* AFFICHAGE DES STATISTIQUES SELON LE RÔLE */}
        <div>
          {isAdmin ? (
             // VUE ADMIN : Voit tout l'argent levé par le projet
            <>
              <div className="text-sm font-bold text-amber-400">💰 {project.total_funds || 0} Cyber-Coins levés</div>
              <div className="text-[11px] text-slate-400">{project.investors_count || 0} investisseurs</div>
            </>
          ) : (
            // VUE ÉTUDIANT : Voit uniquement SON propre investissement
            myInvestment > 0 ? (
              <div className="text-sm font-semibold text-emerald-400">
                ✓ Vous avez investi : {myInvestment} CC
              </div>
            ) : (
              <div className="text-sm font-medium text-slate-500">
                Vous n&apos;avez pas encore investi
              </div>
            )
          )}
        </div>

        {/* ZONE D'INVESTISSEMENT (Masquée si c'est le projet de l'utilisateur) */}
        {!isMyProject && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              min="10"
              max={remainingBudget > 0 ? remainingBudget : 10}
              value={investAmount}
              onChange={(e) => setInvestAmount(Number(e.target.value))}
              disabled={remainingBudget <= 0}
              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-mono disabled:opacity-50"
            />
            <button
              onClick={(e) => onInvest(project.id, investAmount, e)}
              disabled={remainingBudget <= 0}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Investir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}