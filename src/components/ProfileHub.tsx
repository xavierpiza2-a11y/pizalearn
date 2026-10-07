import React, { useState, useEffect } from 'react';
import { Award, Flame, Zap, Clock, BookOpen, AlertTriangle, CheckCircle2, ChevronRight, User } from 'lucide-react';
import { QuizSessionResult, StudentProfile } from '../types/index.js';
import { api } from '../utils/api.js';

interface ProfileHubProps {
  activeProfile: StudentProfile | null;
  onSelectCourse: (courseId: string) => void;
}

export const ProfileHub: React.FC<ProfileHubProps> = ({ activeProfile }) => {
  const [sessions, setSessions] = useState<QuizSessionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await api.getSessions();
        if (activeProfile) {
          setSessions(data.filter((s) => s.profileId === activeProfile.id));
        } else {
          setSessions(data);
        }
      } catch (err) {
        console.error('Error fetching sessions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [activeProfile]);

  if (!activeProfile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <User className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">Aucun profil sélectionné</h3>
        <p className="text-xs text-slate-400">
          Veuillez sélectionner ou créer un profil élève dans la barre de navigation.
        </p>
      </div>
    );
  }

  // Calculate XP towards next level
  const currentXp = activeProfile.xp;
  const currentLevel = activeProfile.level;
  const xpForNextLevel = currentLevel * 250;
  const xpCurrentLevelBase = (currentLevel - 1) * 250;
  const xpInCurrentLevel = Math.max(0, currentXp - xpCurrentLevelBase);
  const xpNeeded = 250;
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeeded) * 100));

  // Collect mistakes for memory review
  const allMistakes = sessions.flatMap((s) => s.mistakes || []);

  const allPossibleBadges = [
    { id: 'b_welcome', name: 'Premier Pas', icon: '🚀', desc: 'Premier cours révisé avec succès' },
    { id: 'b_streak3', name: 'En Flammes', icon: '🔥', desc: 'Série de 3 jours consécutifs' },
    { id: 'b_perfect', name: 'Sans Faute', icon: '🎯', desc: '100% de bonnes réponses sur un quiz' },
    { id: 'b_speed', name: 'Éclair Vivant', icon: '⚡', desc: 'Score élevé en mode Contre-la-montre' },
    { id: 'b_xp_500', name: 'Élève Assidu', icon: '⭐', desc: '500 XP cumulés au total' },
    { id: 'b_xp_1500', name: 'Génie en Herbe', icon: '👑', desc: '1500 XP cumulés (Champion)' },
    { id: 'b_historian', name: 'Chrono Maître', icon: '🏛️', desc: 'Toutes les dates d\'histoire maîtrisées' },
    { id: 'b_zen_master', name: 'Sérénité Totale', icon: '🧘', desc: '10 sessions d\'entraînement zen' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-8">
      
      {/* Hero Profile Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 border border-indigo-500/30 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
          
          {/* Avatar */}
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-5xl shadow-xl shadow-indigo-900/50 border-2 border-indigo-400/40 shrink-0">
            {activeProfile.avatar}
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-3xl font-bold text-white font-['Fredoka']">
                {activeProfile.name}
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {activeProfile.grade}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                Série : {activeProfile.streakDays} jour(s)
              </span>
            </div>

            {/* Level and XP progress bar */}
            <div className="space-y-1.5 max-w-md">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-indigo-300 font-bold">Niveau {currentLevel}</span>
                <span className="text-slate-400 font-mono">
                  {currentXp} XP / {xpForNextLevel} XP ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700/60 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Encore {Math.max(0, xpForNextLevel - currentXp)} XP pour atteindre le Niveau {currentLevel + 1} !
              </p>
            </div>
          </div>
        </div>

        {/* Glow */}
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Trophy Cabinet (Badges) */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white font-['Fredoka'] flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Armoire aux Trophées & Badges
            </h2>
            <p className="text-xs text-slate-400">
              Débloque des récompenses en révisant régulièrement et en réussissant tes quiz.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-300">
            {activeProfile.badges?.length || 0} / {allPossibleBadges.length} débloqués
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {allPossibleBadges.map((badge) => {
            const unlocked = activeProfile.badges?.some((b) => b.id === badge.id);
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  unlocked
                    ? 'bg-gradient-to-b from-indigo-950/40 to-slate-900 border-indigo-500/40 shadow-md'
                    : 'bg-slate-900/40 border-slate-800 opacity-40 grayscale'
                }`}
              >
                <div className="text-3xl mb-2">{badge.icon}</div>
                <strong className="text-xs font-bold text-white block mb-1">{badge.name}</strong>
                <p className="text-[10px] text-slate-400 leading-tight">{badge.desc}</p>
                {unlocked && (
                  <span className="inline-block mt-2 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                    ✓ Débloqué
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Revision History & Difficult Points */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revision Sessions History */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-4 shadow-lg">
          <h2 className="text-lg font-bold text-white font-['Fredoka'] flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Historique des Révisions ({sessions.length})
          </h2>

          {sessions.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              Aucune session enregistrée pour l'instant. Lance un premier mini-jeu !
            </p>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <strong className="text-white block font-medium line-clamp-1">
                      {sess.courseTitle}
                    </strong>
                    <span className="text-[11px] text-slate-400">
                      {sess.subject} • Mode {sess.mode === 'timed' ? 'Chrono ⏱️' : 'Zen 🧘'}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-bold font-mono text-xs block ${
                        sess.scorePercent >= 80 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {sess.scorePercent}% ({sess.correctCount}/{sess.questionCount})
                    </span>
                    <span className="text-[10px] text-indigo-400 font-mono">
                      +{sess.xpEarned} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Difficult Concepts (Ancrage mémoriel) */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-4 shadow-lg">
          <h2 className="text-lg font-bold text-white font-['Fredoka'] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Concepts à renforcer ({allMistakes.length})
          </h2>

          {allMistakes.length === 0 ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs text-emerald-300">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              <p className="font-semibold">Tout est clair !</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Aucune erreur récente enregistrée. Continue sur cette belle lancée !
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {allMistakes.slice(0, 8).map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300">{m.concept}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Erreur passée</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{m.question}</p>
                  <p className="text-emerald-400 text-[11px]">
                    <strong>Réponse exacte :</strong> {m.correctAnswer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
