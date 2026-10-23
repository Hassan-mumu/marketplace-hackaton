/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  getProjectById, 
  getUserBudget, 
  investCyberCoins, 
  checkIfAdmin,
  getPlatformSettings // <-- Ajout de l'import
} from '@/services/hackathon.services';
import { toast } from 'sonner';

function ProjectDetailContent() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [budget, setBudget] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userGroupId, setUserGroupId] = useState<string | null>(null);
  const [investAmount, setInvestAmount] = useState(50);
  const [loading, setLoading] = useState(true);
  
  // <-- Nouvel état pour savoir si les investissements sont ouverts
  const [isInvestmentOpen, setIsInvestmentOpen] = useState(true);

  useEffect(() => {
    loadDetail();
  }, [id]);

  async function loadDetail() {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user ?? null;
      setUser(currentUser);

      // Récupération du projet et des paramètres globaux
      const [{ project: proj, members: team }, settings] = await Promise.all([
        getProjectById(id),
        getPlatformSettings() // <-- Lecture du paramètre
      ]);
      
      setProject(proj);
      setMembers(team);
      // Si le paramètre n'existe pas encore, on laisse ouvert par défaut
      setIsInvestmentOpen(settings?.is_investment_open ?? true); 

      if (currentUser) {
        const [remaining, adminStatus, membership] = await Promise.all([
          getUserBudget(currentUser.id),
          checkIfAdmin(currentUser.id),
          supabase.from('group_members').select('group_id').eq('user_id', currentUser.id).maybeSingle(),
        ]);

        setBudget(remaining);
        setIsAdmin(adminStatus);
        setUserGroupId(membership.data?.group_id || null);
      }
    } catch (err: any) {
      toast.error('Projet introuvable : ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvest() {
    if (!user) {
      toast.warning('Connectez-vous pour pouvoir investir !');
      return;
    }

    // --- AJOUT DU POP-UP DE CONFIRMATION ---
    const confirmed = window.confirm("Donné c'est donné, reprendre c'est Volé !! \n\nConfirmez-vous cet investissement ?");
    if (!confirmed) return; // Stoppe tout si l'étudiant clique sur "Annuler"
    // ----------------------------------------

    if (investAmount <= 0 || investAmount > budget) {
      toast.error("Montant invalide ou budget insuffisant.");
      return;
    }

    try {
      const res = await investCyberCoins(user.id, project.id, investAmount);
      setBudget(res.remaining_budget);
      toast.success(`Investissement de ${investAmount} Cyber-Coins réussi ! 🚀`);

      window.dispatchEvent(new CustomEvent('budget-updated', { detail: res.remaining_budget }));
      await loadDetail();
      setInvestAmount(50);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (loading || !project) return <p className="text-slate-400">Chargement du projet...</p>;

  const isMyProject = userGroupId === project.group_id_direct;
  const myInvestments = (project.investments_data || []).filter((inv: any) => inv.user_id === user?.id);
  const myTotalInvestment = myInvestments.reduce((acc: number, curr: any) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      <button onClick={() => router.push('/')} className="text-sm text-slate-400 hover:text-white">
        ← Retour à la galerie
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLONNE GAUCHE */}
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

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4 relative overflow-hidden">
            {isMyProject && (
              <div className="absolute top-0 right-0 bg-indigo-600 text-white px-4 py-1.5 rounded-bl-xl font-bold text-xs shadow-md">
                ★ C'est votre projet
              </div>
            )}
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">{project.title}</h1>
              <span className="text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Groupe : {project.group_name}
              </span>
            </div>
            <p className="text-slate-300 whitespace-pre-line leading-relaxed">{project.description}</p>
          </div>
        </div>

        {/* COLONNE DROITE */}
        <div className="space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 text-center space-y-6">
            {isAdmin ? (
              <div className="space-y-1">
                <div className="text-xs uppercase text-amber-500 font-bold tracking-wider">Vue Administrateur</div>
                <div className="text-3xl font-bold text-amber-400">
                  {project.total_funds} <span className="text-sm font-normal text-slate-400">Cyber-Coins levés</span>
                </div>
                <div className="text-xs text-slate-400">{project.investors_count} investisseurs</div>
              </div>
            ) : myTotalInvestment > 0 ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl">
                <div className="text-sm text-emerald-400 mb-1">✓ Vous avez investi :</div>
                <div className="text-2xl font-bold text-emerald-300">{myTotalInvestment} CC</div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">Vous n'avez pas encore investi dans ce projet.</div>
            )}

            {!isMyProject && (
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-400 uppercase">Soutenir ce projet</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="10"
                    max={budget > 0 ? budget : 10}
                    value={investAmount}
                    onChange={(e) => setInvestAmount(Number(e.target.value))}
                    disabled={budget <= 0 || !isInvestmentOpen} // <-- Désactivé si clôturé
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center font-mono disabled:opacity-50"
                  />
                  <button
                    onClick={handleInvest}
                    disabled={budget <= 0 || !isInvestmentOpen} // <-- Désactivé si clôturé
                    className="px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-500 to-emerald-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isInvestmentOpen ? "Investir" : "Clôturé"} {/* <-- Changement de texte */}
                  </button>
                </div>
                
                {/* Affichage des messages sous le bouton */}
                {!isInvestmentOpen ? (
                  <div className="text-xs text-rose-400 font-bold">Les investissements sont terminés.</div>
                ) : budget > 0 ? (
                  <div className="text-xs text-slate-400">Budget dispo : <span className="text-amber-400 font-bold">{budget} CC</span></div>
                ) : (
                  <div className="text-xs text-rose-400">Votre budget est épuisé.</div>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center justify-between">
              Équipe de conception
              <span className="text-xs font-normal text-slate-500">{members.length} membres</span>
            </h3>
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

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 flex justify-center py-10">Chargement de la page...</div>}>
      <ProjectDetailContent />
    </Suspense>
  );
}