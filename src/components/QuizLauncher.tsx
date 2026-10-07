import React, { useState } from 'react';
import { Play, Sparkles, Clock, CheckSquare, Layers, HelpCircle, X, Shield, Zap } from 'lucide-react';
import { Course, GameMode, QuestionFormat } from '../types/index.js';
import { playClickSound } from '../utils/audio.js';

interface QuizLauncherProps {
  course: Course;
  onClose: () => void;
  onStartGame: (config: {
    course: Course;
    count: number;
    formats: QuestionFormat[];
    mode: GameMode;
  }) => void;
}

export const QuizLauncher: React.FC<QuizLauncherProps> = ({
  course,
  onClose,
  onStartGame,
}) => {
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [selectedFormats, setSelectedFormats] = useState<QuestionFormat[]>([
    'qcm',
    'true_false',
    'fill_in_blank',
    'flashcard',
    'match_pairs',
  ]);
  const [mode, setMode] = useState<GameMode>('zen');

  const availableFormats: Array<{
    id: QuestionFormat;
    name: string;
    icon: string;
    desc: string;
  }> = [
    {
      id: 'qcm',
      name: 'QCM Classique',
      icon: '🔘',
      desc: 'Choix multiple avec 4 propositions et indice.',
    },
    {
      id: 'fill_in_blank',
      name: 'Textes à trous',
      icon: '🧩',
      desc: 'Mots manquants à insérer dans la formule ou phrase.',
    },
    {
      id: 'true_false',
      name: 'Vrai ou Faux ?',
      icon: '⚖️',
      desc: 'Démêle le vrai du faux et évite les pièges.',
    },
    {
      id: 'flashcard',
      name: 'Flashcards 3D',
      icon: '🎴',
      desc: 'Carte recto-verso mémorielle avec auto-évaluation.',
    },
    {
      id: 'match_pairs',
      name: 'Association de paires',
      icon: '🔗',
      desc: 'Relie chaque notion à sa bonne définition.',
    },
  ];

  const toggleFormat = (formatId: QuestionFormat) => {
    playClickSound();
    if (selectedFormats.includes(formatId)) {
      if (selectedFormats.length === 1) return; // Keep at least one format
      setSelectedFormats(selectedFormats.filter((f) => f !== formatId));
    } else {
      setSelectedFormats([...selectedFormats, formatId]);
    }
  };

  const handleLaunch = () => {
    playClickSound();
    onStartGame({
      course,
      count: questionCount,
      formats: selectedFormats,
      mode,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={() => {
            onClose();
            playClickSound();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {course.subject}
            </span>
            <span className="text-xs text-slate-400 font-semibold">{course.gradeLevel}</span>
          </div>
          <h2 className="text-2xl font-bold text-white font-['Fredoka']">
            Configurer ma session de révision
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Cours : <strong className="text-slate-200">{course.title}</strong>
          </p>
        </div>

        {/* 1. Select Question Count */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
            1. Nombre de questions
          </label>
          <div className="grid grid-cols-4 gap-2.5">
            {[5, 10, 15, 20].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  setQuestionCount(num);
                  playClickSound();
                }}
                className={`py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  questionCount === num
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-600/30 scale-105'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 border border-slate-700/60'
                }`}
              >
                {num} questions
              </button>
            ))}
          </div>
        </div>

        {/* 2. Select Combinable Game Formats */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              2. Formats de mini-jeux combinables
            </label>
            <span className="text-[10px] text-slate-500 font-mono">
              {selectedFormats.length} sélectionné(s)
            </span>
          </div>

          <div className="space-y-2">
            {availableFormats.map((fmt) => {
              const isSelected = selectedFormats.includes(fmt.id);
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => toggleFormat(fmt.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{fmt.icon}</span>
                    <div>
                      <div className="font-semibold text-xs text-white flex items-center gap-2">
                        <span>{fmt.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{fmt.desc}</span>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-indigo-500 text-white'
                        : 'border border-slate-600 text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Game Mode: Zen vs Timed */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
            3. Mode de jeu
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setMode('zen');
                playClickSound();
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                mode === 'zen'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-md'
                  : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                <span>🧘</span>
                <span>Entraînement Zen</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sans chronomètre. Prends tout ton temps pour assimiler et réfléchir.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('timed');
                playClickSound();
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                mode === 'timed'
                  ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-md'
                  : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Contre-la-montre</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Chrono actif par question ! Multiplicateur de combo XP et adrénaline.
              </p>
            </button>
          </div>
        </div>

        {/* Start Game Action */}
        <button
          type="button"
          onClick={handleLaunch}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>C'est parti, lancer la session !</span>
        </button>
      </div>
    </div>
  );
};
