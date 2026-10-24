/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

export async function getPublishedProjects(userId: string | null = null) {
  const { data: projects, error } = await supabase
    .from('projects_with_stats')
    .select('*')
    .eq('is_published', true)
    .order('total_funds', { ascending: false });

  if (error) throw error;
  if (!projects || projects.length === 0) return [];

  if (!userId) {
    return projects.map((p) => ({
      ...p,
      total_funds: 0,
      investors_count: 0,
      my_investment: 0,
      investments_data: undefined, 
    }));
  }

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('student_profiles').select('is_admin').eq('user_id', userId).maybeSingle(),
    supabase.from('group_members').select('group_id').eq('user_id', userId).maybeSingle(),
  ]);

  const isAdmin = profile?.is_admin || false;
  const userGroupId = membership?.group_id || null;

  return projects.map((p) => {
    const myInvestments = (p.investments_data as any[] || []).filter((inv) => inv.user_id === userId);
    const myTotalInvestment = myInvestments.reduce((acc, curr) => acc + curr.amount, 0);

    return {
      ...p,
      my_investment: myTotalInvestment,
      is_my_group: p.group_id_direct === userGroupId, 
      total_funds: isAdmin ? p.total_funds : 0,
      investors_count: isAdmin ? p.investors_count : 0,
      is_admin: isAdmin,
      investments_data: undefined, 
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

export async function getUserBudget(userId: string) {
  const { data: profile } = await supabase
    .from('student_profiles')
    .select('is_admin')
    .eq('user_id', userId)
    .maybeSingle();

  const maxBudget = profile?.is_admin ? 2000 : 500;

  const { data, error } = await supabase
    .from('investments')
    .select('amount')
    .eq('user_id', userId);

  if (error) return maxBudget;
  
  const spent = (data || []).reduce((acc: number, curr: any) => acc + curr.amount, 0);
  
  return maxBudget - spent;
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

export async function checkStudentEligibility(matricule: string, email: string) {
  const { data, error } = await supabase.rpc('verify_student_eligibility', {
    p_matricule: matricule,
    p_email: email,
  });

  if (error) throw error;
  return data as { allowed: boolean; error?: string };
}

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

export async function getUserProfile(userId: string) {
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('student_profiles').select('*').eq('user_id', userId).single(),
    supabase.from('group_members').select('role').eq('user_id', userId).maybeSingle(),
  ]);
  return { ...profile, role: membership?.role || '' };
}

export async function updateUserProfile(userId: string, displayName: string, role: string) {
  const { error: authErr } = await supabase.auth.updateUser({
    data: { display_name: displayName, role: role }
  });
  if (authErr) throw authErr;

  await supabase.from('student_profiles').update({ display_name: displayName }).eq('user_id', userId);

  await supabase.from('group_members').update({ display_name: displayName, role: role }).eq('user_id', userId);
}

export async function getPlatformSettings() {
  const { data } = await supabase.from('platform_settings').select('*').eq('id', 1).single();
  return data || { is_podium_visible: false };
}

export async function togglePodiumVisibility(isVisible: boolean) {
  const { error } = await supabase.from('platform_settings').update({ is_podium_visible: isVisible }).eq('id', 1);
  if (error) throw error;
}
export async function toggleInvestments(isOpen: boolean) {
  const { error } = await supabase.from('platform_settings').update({ is_investment_open: isOpen }).eq('id', 1);
  if (error) throw error;
}