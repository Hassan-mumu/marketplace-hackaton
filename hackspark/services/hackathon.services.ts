/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

// --- GALERIE & PROJETS PUBLICS ---
export async function getPublishedProjects() {
  const { data, error } = await supabase
    .from('projects_with_stats')
    .select('*')
    .eq('is_published', true)
    .order('votes_count', { ascending: false });

  if (error) throw error;
  return data || [];
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

// --- SYSTÈME DE VOTE UNIQUE ---
export async function getUserVote(userId: string) {
  const { data } = await supabase
    .from('votes')
    .select('project_id')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.project_id ?? null;
}

export async function toggleUniqueVote(userId: string, projectId: string, currentVotedId: string | null) {
  if (currentVotedId === projectId) {
    const { error } = await supabase.from('votes').delete().eq('user_id', userId);
    if (error) throw error;
    return { action: 'removed', votedProjectId: null };
  } else {
    const { error } = await supabase
      .from('votes')
      .upsert({ user_id: userId, project_id: projectId }, { onConflict: 'user_id' });
    if (error) throw error;
    return { action: currentVotedId ? 'moved' : 'added', votedProjectId: projectId };
  }
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