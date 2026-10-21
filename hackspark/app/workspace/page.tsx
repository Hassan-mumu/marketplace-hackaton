/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  createTeamGroup,
  getUserWorkspaceData,
  joinTeamByCode,
  saveTeamProject,
  uploadMediaFile,
} from '@/services/hackathon.services';
import { toast } from 'sonner';

// Importation des icônes pour remplacer les émojis
import { 
  Copy, CheckCircle2, Save, Rocket, Image as ImageIcon, 
  Film, Loader2, Users, FileText, UploadCloud 
} from 'lucide-react';

export default function WorkspacePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // États Authentification (avec Matricule EPHEC)
  const [isRegistering, setIsRegistering] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [matricule, setMatricule] = useState('');
  const [role, setRole] = useState('Fullstack Dev');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // États Groupe & Projet
  const [myGroup, setMyGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [newGroupName, setNewGroupName] = useState('');

  // États Formulaire Projet
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [uploadingType, setUploadingType] = useState<'image' | 'video' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) loadWorkspace(u.id);
      else setLoading(false);
    });
  }, []);

  async function loadWorkspace(userId: string) {
    setLoading(true);
    try {
      const data = await getUserWorkspaceData(userId);
      if (!data) {
        setMyGroup(null);
      } else {
        setMyGroup(data.group);
        setMembers(data.members);
        if (data.project) {
          setTitle(data.project.title || '');
          setDescription(data.project.description || '');
          setTags((data.project.tags || []).join(', '));
          setImageUrl(data.project.image_url || '');
          setVideoUrl(data.project.video_url || '');
          setIsPublished(!!data.project.is_published);
        }
      }
    } catch (err: any) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const cleanMatricule = matricule.trim().toUpperCase();

    if (isRegistering) {
      if (!cleanEmail.endsWith('@students.ephec.be') && !cleanEmail.endsWith('@students.epehc.be')) {
        return toast.error("Seules les adresses @students.ephec.be sont autorisées à s'inscrire.");
      }

      const matriculeRegex = /^(HE\d{6}|ERA\d{5}|BDA\d{5})$/;
      if (!matriculeRegex.test(cleanMatricule)) {
        return toast.error('Format de matricule invalide (ex: HExxxxxx, ERAxxxxx ou BDAxxxxx).');
      }
    }

    setAuthSubmitting(true);
    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              display_name: displayName.trim(),
              matricule: cleanMatricule,
              role,
            },
          },
        });
        if (error) throw error;
        toast.success(`Compte créé avec succès ! Bienvenue ${displayName} (${cleanMatricule})`);
        setUser(data.user);
        if (data.user) await loadWorkspace(data.user.id);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        toast.success('Connexion réussie !');
        setUser(data.user);
        if (data.user) await loadWorkspace(data.user.id);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return toast.warning('Veuillez donner un nom à votre groupe.');
    try {
      const grp = await createTeamGroup(newGroupName, user);
      toast.success(`Groupe "${grp.name}" créé ! Code d'invitation : ${grp.invite_code}`);
      setNewGroupName('');
      await loadWorkspace(user.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleJoinGroup() {
    if (!joinCode.trim()) return toast.warning("Entrez un code d'invitation à 6 chiffres.");
    try {
      const grp = await joinTeamByCode(joinCode, user);
      toast.success(`Vous avez rejoint le groupe "${grp.name}" !`);
      setJoinCode('');
      await loadWorkspace(user.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') {
    const file = e.target.files?.[0];
    if (!file || !myGroup) return;

    setUploadingType(type);
    const toastId = toast.loading(
      type === 'image' ? "Téléversement de l'image en cours..." : 'Téléversement de la vidéo en cours...'
    );

    try {
      const publicUrl = await uploadMediaFile(file, myGroup.id, type);
      if (type === 'image') setImageUrl(publicUrl);
      else setVideoUrl(publicUrl);

      toast.success(
        type === 'image' ? 'Image chargée avec succès !' : 'Vidéo chargée avec succès !',
        { id: toastId }
      );
    } catch (err: any) {
      toast.error('Échec du téléversement : ' + err.message, { id: toastId });
    } finally {
      setUploadingType(null);
    }
  }

  async function handleSave(publish: boolean) {
    if (!myGroup) return;
    setSaving(true);
    try {
      const parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
      await saveTeamProject(myGroup.id, {
        title,
        description,
        tags: parsedTags,
        image_url: imageUrl,
        video_url: videoUrl,
        is_published: publish,
      });

      setIsPublished(publish);
      if (publish) {
        toast.success('Votre projet est maintenant publié dans la Galerie !');
        router.push('/');
      } else {
        toast.success('Brouillon sauvegardé avec succès.');
      }
    } catch (err: any) {
      toast.error('Erreur de sauvegarde : ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      <p>Chargement de votre espace...</p>
    </div>
  );

  // 1. ÉCRAN CONNEXION / INSCRIPTION RÉSERVÉ AUX ÉTUDIANTS EPHEC
  if (!user) {
    return (
      <form
        onSubmit={handleAuth}
        className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4 shadow-xl"
      >
        <div className="text-center space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Accès Étudiant EPHEC
          </span>
          <h2 className="text-2xl font-bold pt-2">
            {isRegistering ? 'Inscription Hackathon' : 'Connexion Étudiant'}
          </h2>
          <p className="text-xs text-slate-400">
            {isRegistering
              ? 'Un seul compte par étudiant (1 matricule = 1 portefeuille).'
              : 'Connectez-vous avec votre adresse étudiante.'}
          </p>
        </div>

        {isRegistering && (
          <>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Prénom & Nom</label>
              <input
                type="text"
                required
                placeholder="Ex: John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Matricule EPHEC (HE/ERA/BDA + 6 chiffres)</label>
              <input
                type="text"
                required
                maxLength={8}
                placeholder="Ex: HExxxxxx"
                value={matricule}
                onChange={(e) => setMatricule(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono uppercase tracking-wider focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Rôle dans l&apos;équipe</label>
              <input
                type="text"
                placeholder="Ex: Fullstack Dev, UI/UX, Pitch..."
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </>
        )}

        <div>
          <label className="text-xs text-slate-400 block mb-1">Email étudiant (@students.ephec.be)</label>
          <input
            type="email"
            required
            placeholder="john.doe@students.ephec.be"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Mot de passe</label>
          <input
            type="password"
            required
            placeholder="Minimum 6 caractères"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={authSubmitting}
          className="w-full py-3 mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {authSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {authSubmitting ? 'Vérification...' : isRegistering ? 'Créer mon compte' : 'Se connecter'}
        </button>

        <button
          type="button"
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full text-xs text-slate-400 hover:text-white text-center pt-2 transition"
        >
          {isRegistering ? 'Déjà inscrit ? Se connecter' : 'Pas encore de compte ? S’inscrire'}
        </button>
      </form>
    );
  }

  // 2. ÉCRAN REJOINDRE OU CRÉER UN GROUPE
  if (!myGroup) {
    return (
      <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 text-center shadow-xl">
        <div className="mx-auto w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <Users className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold">Rejoindre ou Créer un Groupe</h2>
        <p className="text-sm text-slate-400">
          Rejoignez votre équipe pour accéder à l&apos;éditeur du projet associé.
        </p>

        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3 text-left">
          <label className="text-xs font-semibold uppercase text-slate-400">
            Rejoindre avec un code à 6 chiffres
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              maxLength={6}
              placeholder="Ex: 482905"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-center font-mono text-lg focus:border-emerald-400 focus:outline-none"
            />
            <button
              onClick={handleJoinGroup}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition font-semibold text-sm"
            >
              Rejoindre
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-bold">OU</div>

        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3 text-left">
          <label className="text-xs font-semibold uppercase text-slate-400">Créer un nouveau groupe</label>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Nom de votre équipe"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none"
            />
            <button
              onClick={handleCreateGroup}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 font-semibold text-sm transition"
            >
              Créer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. ÉCRAN ÉDITEUR DE PROJET DU GROUPE (AVEC APERÇUS VISUELS)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center gap-2 text-xs uppercase text-emerald-400 font-semibold">
            <Users className="w-4 h-4" /> Mon Groupe
          </div>
          <h2 className="text-2xl font-bold text-white">{myGroup.name}</h2>
          
          <div
            onClick={() => {
              navigator.clipboard.writeText(myGroup.invite_code);
              toast.success('Code copié dans le presse-papiers !');
            }}
            className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between cursor-pointer hover:border-emerald-400 transition group"
            title="Cliquez pour copier"
          >
            <span className="text-xs text-slate-400 group-hover:text-slate-300 transition">Code d&apos;invitation :</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-emerald-400 text-lg tracking-widest">
                {myGroup.invite_code}
              </span>
              <Copy className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg">
          <h3 className="font-semibold text-slate-200">Membres du groupe ({members.length})</h3>
          <div className="space-y-2 mt-2">
            {members.map((m) => (
              <div key={m.user_id} className="bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-sm flex items-center justify-between">
                <span className="font-medium text-slate-200">{m.display_name}</span>
                <span className="text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded-md">{m.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Éditeur de Projet
          </h2>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              isPublished
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {isPublished ? <><CheckCircle2 className="w-3 h-3" /> Publié</> : 'Brouillon'}
          </span>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs uppercase text-slate-400 block mb-1 font-semibold">Titre du projet</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none transition"
              placeholder="Titre accrocheur..."
            />
          </div>

          <div>
            <label className="text-xs uppercase text-slate-400 block mb-1 font-semibold">Description</label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none transition resize-none"
              placeholder="Expliquez le problème résolu et votre solution technique..."
            />
          </div>

          <div>
            <label className="text-xs uppercase text-slate-400 block mb-1 font-semibold">
              Technologies / Tags (séparés par des virgules)
            </label>
            <input
              type="text"
              placeholder="Ex: React, IA, Python, Supabase"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none transition"
            />
          </div>

          {/* ZONES D'UPLOAD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div className="space-y-2">
              <label className="border-2 border-dashed border-slate-700 hover:border-emerald-400 hover:bg-slate-800/50 transition rounded-xl p-6 text-center cursor-pointer bg-slate-950 block">
                <div className="flex flex-col items-center gap-2">
                  {uploadingType === 'image' ? (
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                  ) : (
                    <UploadCloud className="w-6 h-6 text-slate-400" />
                  )}
                  <span className="text-xs font-semibold text-slate-300">
                    {uploadingType === 'image' ? 'Upload en cours...' : 'Uploader une Image (Affiche)'}
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUpload(e, 'image')}
                  className="hidden"
                  disabled={uploadingType !== null}
                />
              </label>
              
              {imageUrl && (
                <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                  <img src={imageUrl} alt="Aperçu" className="w-full h-40 object-cover" />
                  <span className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-sm text-emerald-400 text-[10px] px-2.5 py-1 rounded-md font-bold flex items-center gap-1 border border-slate-700">
                    <ImageIcon className="w-3 h-3" /> Image définie
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="border-2 border-dashed border-slate-700 hover:border-emerald-400 hover:bg-slate-800/50 transition rounded-xl p-6 text-center cursor-pointer bg-slate-950 block">
                <div className="flex flex-col items-center gap-2">
                  {uploadingType === 'video' ? (
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                  ) : (
                    <UploadCloud className="w-6 h-6 text-slate-400" />
                  )}
                  <span className="text-xs font-semibold text-slate-300">
                    {uploadingType === 'video' ? 'Upload en cours...' : 'Uploader une Vidéo (MP4)'}
                  </span>
                </div>
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={(e) => handleUpload(e, 'video')}
                  className="hidden"
                  disabled={uploadingType !== null}
                />
              </label>

              {videoUrl && (
                <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black">
                  <video src={videoUrl} controls className="w-full h-40 object-cover" />
                  <span className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-emerald-400 text-[10px] px-2.5 py-1 rounded-md font-bold flex items-center gap-1 border border-slate-700">
                    <Film className="w-3 h-3" /> Vidéo définie
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-6 border-t border-slate-800">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Enregistrer Brouillon
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold transition flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            {saving ? 'Sauvegarde...' : 'Publier dans la Galerie'}
          </button>
        </div>
      </div>
    </div>
  );
}