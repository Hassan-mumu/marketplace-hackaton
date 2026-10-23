/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Coins, CheckCircle2, Star, Users } from 'lucide-react';

interface ProjectCardProps {
  project: any;
  remainingBudget: number;
  // Ajout du statut d'ouverture
  isInvestmentOpen: boolean; 
  onInvest: (projectId: string, amount: number, e: React.MouseEvent) => void;
}

export default function ProjectCard({ project, remainingBudget, isInvestmentOpen, onInvest }: ProjectCardProps) {
  const router = useRouter();
  const [investAmount, setInvestAmount] = useState(50);

  const isMyProject = project.is_my_group;
  const isAdmin = project.is_admin;
  const myInvestment = project.my_investment || 0;

  // --- NOUVELLE FONCTION AVEC LE POP-UP ---
  const handleInvestClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm("Donné c'est donné, reprendre c'est Volé !! \n\nConfirmez-vous cet investissement ?");
    if (!confirmed) return;
    
    onInvest(project.id, investAmount, e);
  };

  return (
    <div
      onClick={() => router.push(`/project/${project.id}`)}
      className={`bg-slate-900/80 border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col justify-between group ${
        isMyProject ? 'border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]' : 'border-slate-800 hover:border-emerald-500/50 hover:shadow-xl hover:-translate-y-1'
      }`}
    >
      <div>
        <div className="relative h-48 bg-slate-950 overflow-hidden">
          {project.image_url ? (
            <img src={project.image_url} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-950 text-sm">
              Aucun visuel
            </div>
          )}

          <div className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-lg">
            <Users className="w-3 h-3" /> {project.group_name}
          </div>

          {isMyProject && (
            <div className="absolute top-3 right-3 bg-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
              <Star className="w-3 h-3 fill-current" /> Votre Projet
            </div>
          )}
        </div>

        <div className="p-5">
          <h3 className="text-xl font-bold text-white tracking-tight">{project.title}</h3>
          <p className="text-sm text-slate-400 mt-2 line-clamp-2 leading-relaxed">{project.description}</p>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-800/50 flex items-center justify-between gap-3 bg-slate-950/40">
        <div>
          {isAdmin ? (
            <>
              <div className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <Coins className="w-4 h-4" /> {project.total_funds || 0} CC
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{project.investors_count || 0} investisseurs</div>
            </>
          ) : (
            myInvestment > 0 ? (
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {myInvestment} CC investis
              </div>
            ) : (
              <div className="text-sm font-medium text-slate-600">
                Aucun investissement
              </div>
            )
          )}
        </div>

        {!isMyProject && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              min="10"
              max={remainingBudget > 0 ? remainingBudget : 10}
              value={investAmount}
              onChange={(e) => setInvestAmount(Number(e.target.value))}
              disabled={remainingBudget <= 0 || !isInvestmentOpen} // Bloqué si clôturé
              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center font-mono focus:border-emerald-400 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={handleInvestClick} // Nouvel appel avec le pop-up
              disabled={remainingBudget <= 0 || !isInvestmentOpen} // Bloqué si clôturé
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isInvestmentOpen ? 'Investir' : 'Clôturé'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}