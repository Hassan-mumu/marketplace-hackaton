'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserProfile, updateUserProfile } from '@/services/hackathon.services';
import { toast } from 'sonner';

// export const dynamic = 'force-dynamic';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [displayName, setDisplayName] = useState('');
    const [role, setRole] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session?.user) {
                setUser(data.session.user);
                loadProfile(data.session.user.id);
            }
        });
    }, []);

    async function loadProfile(userId: string) {
        try {
            const data = await getUserProfile(userId);
            setProfile(data);
            setDisplayName(data.display_name || '');
            setRole(data.role || '');
        } catch (err) {
            console.error(err);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            await updateUserProfile(user.id, displayName, role);
            toast.success('Profil mis à jour avec succès !');
        } catch (err: any) {
            toast.error('Erreur : ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    if (!user || !profile) return <div className="text-slate-400">Chargement du profil...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold">Mon Espace Personnel</h1>

            <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">

                {/* Champs non modifiables */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase">Adresse Email</label>
                        <input type="text" value={profile.email} disabled className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase">Matricule (Unique)</label>
                        <input type="text" value={profile.matricule} disabled className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed font-mono" />
                    </div>
                </div>

                {/* Champs modifiables */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-emerald-400 uppercase">Nom & Prénom d'affichage</label>
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none" />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold text-emerald-400 uppercase">Votre rôle dans l'équipe</label>
                    <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex: Développeur, Design, Pitch..." className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none" />
                </div>

                <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={saving} className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 text-white font-bold text-sm disabled:opacity-50">
                        {saving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
                    </button>
                </div>
            </form>
        </div>
    );
}