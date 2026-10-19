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
      // 1. Vérification de l'email étudiant EPHEC
      if (!cleanEmail.endsWith('@students.ephec.be') && !cleanEmail.endsWith('@students.epehc.be')) {
        return toast.error("Seules les adresses @students.ephec.be sont autorisées à s'inscrire.");
      }

      // 2. Vérification du matricule (HE + 6 chiffres)
      const matriculeRegex = /^HE\d{6}$/;
      if (!matriculeRegex.test(cleanMatricule)) {
        return toast.error('Le matricule doit commencer par HE suivi de 6 chiffres (ex: HE203456).');
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
        toast.success(`Compte créé avec succès ! Bienvenue ${displayName} (${cleanMatricule}) 🎉`);
        setUser(data.user);
        if (data.user) await loadWorkspace(data.user.id);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        toast.success('Connexion réussie ! 👋');
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
      toast.success(`Vous avez rejoint le groupe "${grp.name}" ! 🙌`);
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
        type === 'image' ? 'Image chargée avec succès ! 🖼️' : 'Vidéo chargée avec succès ! 🎬',
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
        toast.success('Votre projet est maintenant publié dans la Galerie ! 🚀');
        router.push('/');
      } else {
        toast.success('Brouillon sauvegardé avec succès. 💾');
      }
    } catch (err: any) {
      toast.error('Erreur de sauvegarde : ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400">Chargement de votre espace...</p>;

  // 1. ÉCRAN CONNEXION / INSCRIPTION RÉSERVÉ AUX ÉTUDIANTS EPHEC
  if (!user) {
    return (
      <form
        onSubmit={handleAuth}
        className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4"
      >
        <div className="text-center space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            Accès Étudiant EPHEC
          </span>
          <h2 className="text-2xl font-bold pt-2">
            {isRegistering ? 'Inscription Hackathon' : 'Connexion Étudiant'}
          </h2>
          <p className="text-xs text-slate-400">
            {isRegistering
              ? 'Un seul compte par étudiant (1 matricule = 1 voix unique).'
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
                placeholder="Ex: Cyril Lamand"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Matricule EPHEC (HE + 6 chiffres)</label>
              <input
                type="text"
                required
                maxLength={8}
                placeholder="Ex: HE203456"
                value={matricule}
                onChange={(e) => setMatricule(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono uppercase tracking-wider focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Rôle dans l&apos;équipe</label>
              <input
                type="text"
                placeholder="Ex: Fullstack Dev, UI/UX, Pitch..."
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </>
        )}

        <div>
          <label className="text-xs text-slate-400 block mb-1">Email étudiant (@students.ephec.be)</label>
          <input
            type="email"
            required
            placeholder="c.lamand@students.ephec.be"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-cyan-400 focus:outline-none"
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
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={authSubmitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 font-bold text-sm disabled:opacity-50"
        >
          {authSubmitting ? 'Vérification...' : isRegistering ? 'Créer mon compte' : 'Se connecter'}
        </button>

        <button
          type="button"
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full text-xs text-slate-400 hover:text-white text-center pt-1"
        >
          {isRegistering ? 'Déjà inscrit ? Se connecter' : 'Pas encore de compte ? S’inscrire'}
        </button>
      </form>
    );
  }

  // 2. ÉCRAN REJOINDRE OU CRÉER UN GROUPE
  if (!myGroup) {
    return (
      <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 text-center">
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
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-center font-mono text-lg"
            />
            <button
              onClick={handleJoinGroup}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 font-semibold text-sm"
            >
              Rejoindre
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500">OU</div>

        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3 text-left">
          <label className="text-xs font-semibold uppercase text-slate-400">Créer un nouveau groupe</label>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Nom de votre équipe"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm"
            />
            <button
              onClick={handleCreateGroup}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 font-semibold text-sm"
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <span className="text-xs uppercase text-cyan-400 font-semibold">Mon Groupe</span>
          <h2 className="text-2xl font-bold">{myGroup.name}</h2>
          <div
            onClick={() => {
              navigator.clipboard.writeText(myGroup.invite_code);
              toast.success('Code copié dans le presse-papiers ! 📋');
            }}
            className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between cursor-pointer hover:border-cyan-400"
            title="Cliquez pour copier"
          >
            <span className="text-xs text-slate-400">Code d&apos;invitation (cliquer pour copier) :</span>
            <span className="font-mono font-bold text-cyan-400 text-lg tracking-widest">
              {myGroup.invite_code}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h3 className="font-semibold">Membres du groupe ({members.length})</h3>
          {members.map((m) => (
            <div key={m.user_id} className="bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-sm">
              <div className="font-medium">{m.display_name}</div>
              <div className="text-xs text-slate-400">{m.role}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold">Projet de {myGroup.name}</h2>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isPublished
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {isPublished ? '● Publié' : '● Brouillon'}
          </span>
        </div>

        <div>
          <label className="text-xs uppercase text-slate-400 block mb-1">Titre du projet</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="text-xs uppercase text-slate-400 block mb-1">Description</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="text-xs uppercase text-slate-400 block mb-1">
            Technologies / Tags (séparés par des virgules)
          </label>
          <input
            type="text"
            placeholder="Ex: React, IA, Python"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm"
          />
        </div>

        {/* ZONES D'UPLOAD AVEC APERÇU VISUEL IMMÉDIAT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-xl p-4 text-center cursor-pointer bg-slate-950/50 block">
              <div className="text-xs font-semibold">
                {uploadingType === 'image' ? '⏳ Upload en cours...' : '🖼️ Changer / Uploader une Image'}
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
              <div className="relative rounded-xl overflow-hidden border border-emerald-500/40">
                <img src={imageUrl} alt="Aperçu" className="w-full h-36 object-cover" />
                <span className="absolute bottom-2 right-2 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  ✓ Image prête
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-xl p-4 text-center cursor-pointer bg-slate-950/50 block">
              <div className="text-xs font-semibold">
                {uploadingType === 'video' ? '⏳ Upload en cours...' : '🎬 Changer / Uploader une Vidéo (MP4)'}
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
              <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 bg-black">
                <video src={videoUrl} controls className="w-full h-36 object-cover" />
                <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  ✓ Vidéo prête
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold"
          >
            Enregistrer Brouillon
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-sm font-bold"
          >
            {saving ? 'Sauvegarde...' : '🚀 Publier le Projet'}
          </button>
        </div>
      </div>
    </div>
  );
}