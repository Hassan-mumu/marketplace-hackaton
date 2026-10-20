/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

// --- GALERIE & PROJETS PUBLICS (CROWDFUNDING CONFIDENTIEL) ---
export async function getPublishedProjects(userId: string | null = null) {
  // 1. On récupère d'abord tous les projets publiés
  const { data: projects, error } = await supabase
    .from('projects_with_stats')
    .select('*')
    .eq('is_published', true)
    .order('total_funds', { ascending: false });

  if (error) throw error;
  if (!projects || projects.length === 0) return [];

  // 2. Si personne n'est connecté, on masque toutes les infos d'argent
  if (!userId) {
    return projects.map((p) => ({
      ...p,
      total_funds: 0,
      investors_count: 0,
      my_investment: 0,
      investments_data: undefined, // Sécurité : on efface la trace brute
    }));
  }

  // 3. On vérifie si l'utilisateur connecté est un Admin et on récupère son groupe
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('student_profiles').select('is_admin').eq('user_id', userId).maybeSingle(),
    supabase.from('group_members').select('group_id').eq('user_id', userId).maybeSingle(),
  ]);

  const isAdmin = profile?.is_admin || false;
  const userGroupId = membership?.group_id || null;

  // 4. On filtre les données avant de les envoyer au navigateur
  return projects.map((p) => {
    // Calculer combien l'utilisateur courant a investi dans ce projet
    const myInvestments = (p.investments_data as any[] || []).filter((inv) => inv.user_id === userId);
    const myTotalInvestment = myInvestments.reduce((acc, curr) => acc + curr.amount, 0);

    return {
      ...p,
      my_investment: myTotalInvestment,
      is_my_group: p.group_id_direct === userGroupId, // Vrai si c'est le projet de l'étudiant
      // Si Admin : on laisse les vrais totaux. Si Étudiant : on les masque à 0.
      total_funds: isAdmin ? p.total_funds : 0,
      investors_count: isAdmin ? p.investors_count : 0,
      is_admin: isAdmin,
      investments_data: undefined, // Toujours effacer la liste brute par sécurité
    };
  });
}

export async function getProjectById(projectId: string) {
  const { data: project, error } = await supabase
    .from('projects_with_stats')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) throw error;

  const { data: members } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', project.group_id);

  return { project, members: members || [] };
}

// --- SYSTÈME D'INVESTISSEMENT (CROWDFUNDING EN CYBER-COINS) ---
export async function getUserBudget(userId: string) {
  const { data, error } = await supabase
    .from('investments')
    .select('amount')
    .eq('user_id', userId);

  if (error) return 500;
  const spent = (data || []).reduce((acc: number, curr: any) => acc + curr.amount, 0);
  return 500 - spent;
}

export async function investCyberCoins(userId: string, projectId: string, amount: number) {
  const { data, error } = await supabase.rpc('invest_in_project', {
    p_user_id: userId,
    p_project_id: projectId,
    p_amount: amount,
  });

  if (error) throw error;
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function checkIfAdmin(userId: string) {
  const { data } = await supabase
    .from('student_profiles')
    .select('is_admin')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.is_admin ?? false;
}

// --- VALIDATION EPHEC (LISTE BLANCHE) ---
export async function checkStudentEligibility(matricule: string, email: string) {
  const { data, error } = await supabase.rpc('verify_student_eligibility', {
    p_matricule: matricule,
    p_email: email,
  });

  if (error) throw error;
  return data as { allowed: boolean; error?: string };
}

// --- GROUPES & ESPACE PROJET ---
export async function getUserWorkspaceData(userId: string) {
  const { data: membership } = await supabase
    .from('group_members')
    .select('group_id, groups(*)')
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership || !membership.groups) return null;

  const group: any = membership.groups;

  const [{ data: members }, { data: project }] = await Promise.all([
    supabase.from('group_members').select('*').eq('group_id', group.id),
    supabase.from('projects').select('*').eq('group_id', group.id).single(),
  ]);

  return { group, members: members || [], project };
}

export async function createTeamGroup(name: string, user: any) {
  const inviteCode = Math.floor(100000 + Math.random() * 900000).toString();

  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name: name.trim(), invite_code: inviteCode, created_by: user.id })
    .select()
    .single();

  if (error) throw error;

  const { error: memberErr } = await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    display_name: user.user_metadata?.display_name || user.email.split('@')[0],
    role: user.user_metadata?.role || 'Team Lead',
  });

  if (memberErr) throw memberErr;
  return group;
}

export async function joinTeamByCode(code: string, user: any) {
  const { data: group, error } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', code.trim())
    .single();

  if (error || !group) throw new Error("Code d'invitation introuvable.");

  const { error: joinErr } = await supabase.from('group_members').upsert({
    group_id: group.id,
    user_id: user.id,
    display_name: user.user_metadata?.display_name || user.email.split('@')[0],
    role: user.user_metadata?.role || 'Membre',
  });

  if (joinErr) throw joinErr;
  return group;
}

export async function uploadMediaFile(file: File, groupId: string, type: 'image' | 'video') {
  const ext = file.name.split('.').pop();
  const path = `${groupId}/${type}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('project-media').upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('project-media').getPublicUrl(path);
  return data.publicUrl;
}

export async function saveTeamProject(groupId: string, payload: any) {
  const { error } = await supabase
    .from('projects')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('group_id', groupId);

  if (error) throw error;
}

// --- GESTION DU PROFIL UTILISATEUR ---
export async function getUserProfile(userId: string) {
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('student_profiles').select('*').eq('user_id', userId).single(),
    supabase.from('group_members').select('role').eq('user_id', userId).maybeSingle(),
  ]);
  return { ...profile, role: membership?.role || '' };
}

export async function updateUserProfile(userId: string, displayName: string, role: string) {
  // 1. Mise à jour des métadonnées de l'authentification (ce qui gère le nom affiché dans la session)
  const { error: authErr } = await supabase.auth.updateUser({
    data: { display_name: displayName, role: role }
  });
  if (authErr) throw authErr;

  // 2. Mise à jour de la table des profils étudiants
  await supabase.from('student_profiles').update({ display_name: displayName }).eq('user_id', userId);

  // 3. Mise à jour de la table des membres du groupe (s'il est dans un groupe)
  await supabase.from('group_members').update({ display_name: displayName, role: role }).eq('user_id', userId);
}

// --- PARAMÈTRES DU PODIUM ---
export async function getPlatformSettings() {
  const { data } = await supabase.from('platform_settings').select('*').eq('id', 1).single();
  return data || { is_podium_visible: false };
}

export async function togglePodiumVisibility(isVisible: boolean) {
  const { error } = await supabase.from('platform_settings').update({ is_podium_visible: isVisible }).eq('id', 1);
  if (error) throw error;
}