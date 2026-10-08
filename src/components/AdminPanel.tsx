import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Users,
  Database,
  BarChart3,
  Settings,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Edit2,
  Sparkles,
  Lock,
  X
} from 'lucide-react';
import { AdminStats, AppConfig, Course, StudentProfile } from '../types/index.js';
import { api, getStoredAdminKey, clearStoredAdminKey } from '../utils/api.js';
import { playClickSound, playSuccessSound, playErrorSound } from '../utils/audio.js';

interface AdminPanelProps {
  courses: Course[];
  profiles: StudentProfile[];
  onRefreshAll: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  courses,
  profiles,
  onRefreshAll,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getStoredAdminKey());
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'profiles' | 'storage' | 'settings'>('overview');

  // Edit Course Modal state
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');

  // New profile state
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileGrade, setNewProfileGrade] = useState('4ème');
  const [newProfileAvatar, setNewProfileAvatar] = useState('🦊');

  // Change PIN state
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeError, setPinChangeError] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState('');
  const [pinChangeLoading, setPinChangeLoading] = useState(false);

  const avatarOptions = ['🦊', '⚡', '🎮', '🚀', '🌟', '🦄', '🦁', '🦉', '🎨', '🔬'];

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsData, configData] = await Promise.all([
        api.getAdminStats(),
        api.getConfig(),
      ]);
      setStats(statsData);
      setConfig(configData);
    } catch (err) {
      console.error('Admin data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminData();
    }
  }, [isAuthenticated]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setPinError('Veuillez entrer le code administrateur.');
      return;
    }
    setPinLoading(true);
    setPinError('');

    try {
      await api.verifyAdmin(pin.trim());
      setIsAuthenticated(true);
      playSuccessSound();
    } catch (err: any) {
      setPinError(err?.message || 'Code PIN incorrect.');
      playErrorSound();
    } finally {
      setPinLoading(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError('');
    setPinChangeSuccess('');

    if (!currentPinInput.trim() || !newPinInput.trim()) {
      setPinChangeError('Veuillez renseigner tous les champs.');
      return;
    }
    if (newPinInput.trim() !== confirmPinInput.trim()) {
      setPinChangeError('Le nouveau code PIN et sa confirmation ne correspondent pas.');
      return;
    }
    if (newPinInput.trim().length < 4) {
      setPinChangeError('Le nouveau code PIN doit comporter au moins 4 chiffres.');
      return;
    }

    setPinChangeLoading(true);
    try {
      const res = await api.changeAdminPin({
        currentPin: currentPinInput.trim(),
        newPin: newPinInput.trim(),
      });
      setPinChangeSuccess(res.message || 'Code PIN modifié avec succès.');
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      playSuccessSound();
    } catch (err: any) {
      setPinChangeError(err?.message || 'Erreur lors de la modification du code PIN.');
      playErrorSound();
    } finally {
      setPinChangeLoading(false);
    }
  };

  const handleLogoutAdmin = () => {
    clearStoredAdminKey();
    setIsAuthenticated(false);
    playClickSound();
  };

  // Profile actions
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    try {
      await api.createProfile({
        name: newProfileName.trim(),
        avatar: newProfileAvatar,
        grade: newProfileGrade,
      });
      setNewProfileName('');
      onRefreshAll();
      fetchAdminData();
      playSuccessSound();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création');
    }
  };

  const handleDeleteProfile = async (id: string, name: string) => {
    if (!confirm(`Confirmer la suppression du profil "${name}" ? Ses scores seront effacés.`)) return;
    try {
      await api.deleteProfile(id);
      onRefreshAll();
      fetchAdminData();
      playSuccessSound();
    } catch (err: any) {
      alert(err.message || 'Erreur');
    }
  };

  // Course storage actions
  const handleDeleteCourse = async (id: string, title: string) => {
    if (!confirm(`Supprimer définitivement le cours "${title}" et ses photos ?`)) return;
    try {
      await api.deleteCourse(id);
      onRefreshAll();
      fetchAdminData();
      playSuccessSound();
    } catch (err: any) {
      alert(err.message || 'Erreur');
    }
  };

  const handleToggleArchive = async (course: Course) => {
    try {
      await api.updateCourse(course.id, { archived: !course.archived });
      onRefreshAll();
      fetchAdminData();
      playClickSound();
    } catch (err: any) {
      alert(err.message || 'Erreur');
    }
  };

  const handleSaveCourseEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    try {
      await api.updateCourse(editingCourse.id, {
        title: editTitle.trim(),
        subject: editSubject.trim(),
      });
      setEditingCourse(null);
      onRefreshAll();
      fetchAdminData();
      playSuccessSound();
    } catch (err: any) {
      alert(err.message || 'Erreur de mise à jour');
    }
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    window.location.href = '/api/admin/export';
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        await api.restoreBackup(json);
        alert('Restauration des données effectuée avec succès !');
        onRefreshAll();
        fetchAdminData();
        playSuccessSound();
      } catch (err) {
        alert('Format de sauvegarde invalide.');
        playErrorSound();
      }
    };
    reader.readAsText(file);
  };

  // Provider and Model switch
  const handleSwitchProvider = async (provider: 'gemini' | 'anthropic' | 'openai') => {
    let defaultModel = 'gemini-3.8-flash';
    if (provider === 'anthropic') defaultModel = 'claude-3-5-sonnet-20241022';
    if (provider === 'openai') defaultModel = 'gpt-4o';
    try {
      const updated = await api.updateConfig({ aiProvider: provider, aiModel: defaultModel });
      setConfig(updated);
      playClickSound();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchModel = async (newModel: string) => {
    try {
      const updated = await api.updateConfig({ aiModel: newModel });
      setConfig(updated);
      playClickSound();
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // PIN Login Gate
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-slate-800/90 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
              Espace Superviseur
            </span>
            <h2 className="text-2xl font-bold text-white font-['Fredoka'] mt-2">
              Code PIN Administrateur
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Réservé aux parents ou enseignants pour la gestion des profils, le stockage et les statistiques.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setPinError('');
                }}
                placeholder="Entrez votre code PIN"
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono tracking-widest text-center text-sm focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            {pinError && (
              <p className="text-rose-400 text-xs flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={pinLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {pinLoading ? 'Validation...' : 'Déverrouiller la supervision'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Admin Dashboard
  // ----------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-8">
      
      {/* Top Banner with Logout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-['Fredoka']">
              Panneau Superviseur & Administration
            </h1>
            <p className="text-xs text-slate-400">
              Surveillance pédagogique, gestion des profils et maîtrise du quota d'IA.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchAdminData();
              playClickSound();
            }}
            className="p-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-300 cursor-pointer"
            title="Rafraîchir"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogoutAdmin}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
          >
            Verrouiller la supervision
          </button>
        </div>
      </div>

      {/* Admin Tab navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'overview', label: 'Vue d\'ensemble & Quotas', icon: BarChart3 },
          { id: 'profiles', label: `Profils Élèves (${profiles.length})`, icon: Users },
          { id: 'storage', label: `Gestionnaire Stockage (${courses.length})`, icon: Database },
          { id: 'settings', label: 'Modèles IA & Sauvegarde', icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          const isCurrent = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                playClickSound();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                isCurrent
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: Overview & KPI */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            {/* Cache Hits & Savings */}
            <div className="p-5 rounded-3xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
              <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                Cache Hits Anti-Gaspillage
              </span>
              <strong className="text-3xl font-bold text-emerald-200 font-mono block">
                {stats.cacheHits}
              </strong>
              <span className="text-[11px] text-emerald-400/80">
                sur {stats.totalAnalyses} analyses demandées
              </span>
            </div>

            {/* Jetons économisés */}
            <div className="p-5 rounded-3xl bg-indigo-950/30 border border-indigo-500/30 space-y-1">
              <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Jetons IA Économisés
              </span>
              <strong className="text-3xl font-bold text-indigo-200 font-mono block">
                {stats.tokensSavedEstimated.toLocaleString()}
              </strong>
              <span className="text-[11px] text-indigo-400/80">
                Grâce au hachage local SHA-256
              </span>
            </div>

            {/* Sessions de quiz */}
            <div className="p-5 rounded-3xl bg-slate-800/80 border border-slate-700/80 space-y-1">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                Sessions Jouées
              </span>
              <strong className="text-3xl font-bold text-white font-mono block">
                {stats.totalQuizSessions}
              </strong>
              <span className="text-[11px] text-purple-400">
                Score moyen : {stats.avgScore}%
              </span>
            </div>

            {/* Cours stockés */}
            <div className="p-5 rounded-3xl bg-slate-800/80 border border-slate-700/80 space-y-1">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-400" />
                Base Locale de Cours
              </span>
              <strong className="text-3xl font-bold text-white font-mono block">
                {stats.totalCourses}
              </strong>
              <span className="text-[11px] text-slate-400">
                Persistés sur volume local
              </span>
            </div>

          </div>

          {/* Difficult concepts radar */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white font-['Fredoka'] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Notions où les élèves rencontrent le plus de difficultés
                </h3>
                <p className="text-xs text-slate-400">
                  Détection automatique des erreurs récurrentes pour adapter les cours et devoirs.
                </p>
              </div>
            </div>

            {stats.difficultConcepts.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Aucune erreur enregistrée pour le moment.
              </p>
            ) : (
              <div className="space-y-2">
                {stats.difficultConcepts.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px]">
                        #{idx + 1}
                      </span>
                      <div>
                        <strong className="text-white block">{item.concept}</strong>
                        <span className="text-[10px] text-slate-400">{item.subject}</span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs font-semibold">
                      {item.count} erreur(s)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: Profiles Management */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'profiles' && (
        <div className="space-y-6">
          {/* Create new profile form */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white font-['Fredoka']">
              Ajouter un profil élève
            </h3>
            <form onSubmit={handleCreateProfile} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Prénom / Pseudonyme</label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Ex: Emma, Lucas..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Classe / Niveau</label>
                <select
                  value={newProfileGrade}
                  onChange={(e) => setNewProfileGrade(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                >
                  {['6ème', '5ème', '4ème', '3ème (Brevet)', '2nde', '1ère', 'Terminale'].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Avatar</label>
                <div className="flex items-center gap-1 overflow-x-auto py-1">
                  {avatarOptions.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setNewProfileAvatar(av)}
                      className={`text-lg p-1.5 rounded-lg ${newProfileAvatar === av ? 'bg-indigo-600 ring-2 ring-indigo-400' : 'bg-slate-900'}`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  + Créer le profil
                </button>
              </div>
            </form>
          </div>

          {/* Existing profiles list */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-3 relative group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{p.avatar}</span>
                    <div>
                      <strong className="text-white block font-bold text-sm">{p.name}</strong>
                      <span className="text-xs text-indigo-400 font-semibold">{p.grade}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteProfile(p.id, p.name)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Supprimer ce profil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">{p.xp} XP • Niveau {p.level}</span>
                  <span>🔥 {p.streakDays}j série</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: Storage & Course Manager */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'storage' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-['Fredoka']">
                Gestionnaire de Cours & Fichiers
              </h3>
              <p className="text-xs text-slate-400">
                Renommez, archivez ou supprimez des cours et leurs photos du disque.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {courses.length} cours répertoriés
            </span>
          </div>

          <div className="space-y-2">
            {courses.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <strong className="text-white font-medium text-sm">{c.title}</strong>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300">
                      {c.subject}
                    </span>
                    {c.archived && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-700 text-slate-400">
                        Archivé
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {c.notions?.length || 0} notions • {c.timesPracticed || 0} révisions • {c.imageUrls?.length || 0} photo(s)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingCourse(c);
                      setEditTitle(c.title);
                      setEditSubject(c.subject);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    title="Renommer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleArchive(c)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    title={c.archived ? 'Désarchiver' : 'Archiver'}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(c.id, c.title)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                    title="Supprimer définitivement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 4: AI Model, PIN & Backup Export/Import */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'settings' && config && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* AI Settings */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white font-['Fredoka'] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Configuration de l'IA Multimodale
            </h3>
            <p className="text-xs text-slate-400">
              Choisissez le fournisseur d'IA de votre choix (Google Gemini, Anthropic Claude ou OpenAI).
            </p>

            {/* Provider Selector Pills */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Fournisseur actif
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchProvider('gemini')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    config.aiProvider === 'gemini'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>Google Gemini</span>
                  <span className={`text-[10px] font-normal ${config.hasGeminiKey ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {config.hasGeminiKey ? '✓ Clé active' : 'Sans clé'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchProvider('anthropic')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    config.aiProvider === 'anthropic'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>Anthropic Claude</span>
                  <span className={`text-[10px] font-normal ${config.hasAnthropicKey ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {config.hasAnthropicKey ? '✓ Clé active' : 'Sans clé'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchProvider('openai')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    config.aiProvider === 'openai'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>OpenAI</span>
                  <span className={`text-[10px] font-normal ${config.hasOpenAiKey ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {config.hasOpenAiKey ? '✓ Clé active' : 'Sans clé'}
                  </span>
                </button>
              </div>
            </div>

            {/* Model Selector depending on Provider */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Modèle d'IA utilisé
                </label>
                <select
                  value={config.aiModel}
                  onChange={(e) => handleSwitchModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs cursor-pointer"
                >
                  {config.aiProvider === 'gemini' && (
                    <>
                      <option value="gemini-3.8-flash">Google Gemini 3.8 Flash (Recommandé • Précis & Rapide)</option>
                      <option value="gemini-3.1-flash-lite">Google Gemini 3.1 Flash-Lite (Haute disponibilité & anti-saturation)</option>
                      <option value="gemini-flash-latest">Google Gemini Flash Latest (Version stable)</option>
                      <option value="gemini-3.1-pro-preview">Google Gemini 3.1 Pro (Raisonnement STEM avancé)</option>
                    </>
                  )}

                  {config.aiProvider === 'anthropic' && (
                    <>
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Qualité supérieure • Recommandé)</option>
                      <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Ultra rapide & économique)</option>
                    </>
                  )}

                  {config.aiProvider === 'openai' && (
                    <>
                      <option value="gpt-4o">OpenAI GPT-4o (Vision multimodal phare)</option>
                      <option value="gpt-4o-mini">OpenAI GPT-4o Mini (Rapide & léger)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Status and Keys explanation */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Statut du fournisseur :</span>
                  <span className={`inline-flex items-center gap-1 font-bold ${
                    (config.aiProvider === 'gemini' && config.hasGeminiKey) ||
                    (config.aiProvider === 'anthropic' && config.hasAnthropicKey) ||
                    (config.aiProvider === 'openai' && config.hasOpenAiKey)
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}>
                    {(config.aiProvider === 'gemini' && config.hasGeminiKey) ||
                    (config.aiProvider === 'anthropic' && config.hasAnthropicKey) ||
                    (config.aiProvider === 'openai' && config.hasOpenAiKey)
                      ? '✓ Clé API active'
                      : '⚠️ Clé absente pour ce fournisseur'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 space-y-1">
                  <p className="font-semibold text-slate-300">Variables dans votre fichier <code>.env</code> :</p>
                  <code className="block bg-slate-950 p-2 rounded-lg text-indigo-300 font-mono text-[10px] space-y-1">
                    <div># Google Gemini :</div>
                    <div>GEMINI_API_KEY="AIzaSy..."</div>
                    <div className="pt-1"># Anthropic Claude :</div>
                    <div>ANTHROPIC_API_KEY="sk-ant-api03-..."</div>
                    <div className="pt-1"># OpenAI :</div>
                    <div>OPENAI_API_KEY="sk-proj-..."</div>
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Supervisor PIN Change */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white font-['Fredoka'] flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              Sécurité Superviseur (Code PIN)
            </h3>
            <p className="text-xs text-slate-400">
              Modifiez le code PIN requis pour accéder à cet espace superviseur.
            </p>

            <form onSubmit={handleChangePin} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Code PIN actuel</label>
                <input
                  type="password"
                  value={currentPinInput}
                  onChange={(e) => {
                    setCurrentPinInput(e.target.value);
                    setPinChangeError('');
                    setPinChangeSuccess('');
                  }}
                  placeholder="PIN actuel"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Nouveau PIN</label>
                  <input
                    type="password"
                    value={newPinInput}
                    onChange={(e) => {
                      setNewPinInput(e.target.value);
                      setPinChangeError('');
                      setPinChangeSuccess('');
                    }}
                    placeholder="Nouveau code"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Confirmer le PIN</label>
                  <input
                    type="password"
                    value={confirmPinInput}
                    onChange={(e) => {
                      setConfirmPinInput(e.target.value);
                      setPinChangeError('');
                      setPinChangeSuccess('');
                    }}
                    placeholder="Confirmer"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {pinChangeError && (
                <p className="text-rose-400 text-xs">{pinChangeError}</p>
              )}

              {pinChangeSuccess && (
                <p className="text-emerald-400 text-xs font-semibold">{pinChangeSuccess}</p>
              )}

              <button
                type="submit"
                disabled={pinChangeLoading}
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                {pinChangeLoading ? 'Enregistrement...' : 'Mettre à jour le code PIN'}
              </button>
            </form>
          </div>

          {/* Backup & Restore */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-4 md:col-span-2">
            <h3 className="text-base font-bold text-white font-['Fredoka'] flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              Sauvegarde & Restauration de la Base de Données
            </h3>
            <p className="text-xs text-slate-400">
              Exportez ou restaurez l'intégralité de vos cours, profils et historiques sur votre stockage local.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-700 hover:bg-slate-650 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger la sauvegarde complète (JSON)</span>
              </button>

              <label className="flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Restaurer une sauvegarde (JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

        </div>
      )}

      {/* Edit Course Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white font-['Fredoka']">Modifier le cours</h3>
              <button onClick={() => setEditingCourse(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourseEdit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Titre</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Matière</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
