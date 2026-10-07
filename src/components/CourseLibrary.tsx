import React, { useState } from 'react';
import { BookOpen, Search, Play, Eye, Sparkles, Zap, Flame, Compass, Plus, Brain } from 'lucide-react';
import { Course } from '../types/index.js';
import { playClickSound } from '../utils/audio.js';

interface CourseLibraryProps {
  courses: Course[];
  onSelectCourseForQuiz: (course: Course) => void;
  onViewCourseDetails: (course: Course) => void;
  onNavigateToScan: () => void;
}

export const CourseLibrary: React.FC<CourseLibraryProps> = ({
  courses,
  onSelectCourseForQuiz,
  onViewCourseDetails,
  onNavigateToScan,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const subjects = ['all', ...Array.from(new Set(courses.map((c) => c.subject)))];

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || course.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      {/* Top Banner / Welcome for Teenagers */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-500/30 p-6 sm:p-8 mb-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Bibliothèque de cours auto-hébergée
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold text-white font-['Fredoka'] mb-2">
            Révise tes cours comme dans un jeu vidéo ! 🎮
          </h1>
          <p className="text-slate-300 text-sm mb-5">
            Choisis un cours déjà analysé pour lancer une session de quiz, de flashcards ou d'association de paires, ou prends une nouvelle photo de ton cahier.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                onNavigateToScan();
                playClickSound();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un nouveau cours en photo</span>
            </button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un chapitre, une notion..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Subject Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {subjects.map((subj) => (
            <button
              key={subj}
              onClick={() => {
                setSelectedSubject(subj);
                playClickSound();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedSubject === subj
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              {subj === 'all' ? 'Toutes les matières' : subj}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/40 rounded-3xl border border-slate-700/50 p-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-3">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Aucun cours trouvé</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto mb-4">
            Prenez en photo votre cahier ou votre livre pour créer votre première fiche de révision interactive.
          </p>
          <button
            onClick={() => {
              onNavigateToScan();
              playClickSound();
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer"
          >
            Scanner mon premier cours
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => {
            const hasDates = course.keyDates && course.keyDates.length > 0;
            const hasFormulas = course.formulas && course.formulas.length > 0;
            const notionsCount = course.notions?.length || 0;
            const questionsCount = course.preGeneratedQuestions?.length || 0;

            return (
              <div
                key={course.id}
                className="group relative flex flex-col justify-between bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 rounded-3xl p-5 sm:p-6 transition-all duration-200 shadow-lg hover:shadow-indigo-950/40"
              >
                <div>
                  {/* Top Tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {course.subject}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {course.gradeLevel}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-white font-['Fredoka'] group-hover:text-indigo-300 transition-colors line-clamp-2 mb-2">
                    {course.title}
                  </h3>

                  {/* Short Summary */}
                  <p className="text-slate-400 text-xs line-clamp-3 mb-4 leading-relaxed">
                    {course.summary}
                  </p>

                  {/* Stats & Features pills */}
                  <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px]">
                    <span className="flex items-center gap-1 text-slate-300 bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-700/60">
                      <Compass className="w-3 h-3 text-indigo-400" />
                      {notionsCount} notions
                    </span>
                    {hasFormulas && (
                      <span className="flex items-center gap-1 text-purple-300 bg-purple-950/30 px-2 py-0.5 rounded-md border border-purple-500/20">
                        📐 Formules
                      </span>
                    )}
                    {hasDates && (
                      <span className="flex items-center gap-1 text-amber-300 bg-amber-950/30 px-2 py-0.5 rounded-md border border-amber-500/20">
                        📅 Dates clés
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-emerald-300 bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <Brain className="w-3 h-3 text-emerald-400" />
                      {questionsCount} quiz prêts
                    </span>
                  </div>
                </div>

                {/* Footer metadata & buttons */}
                <div className="pt-3 border-t border-slate-700/60">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" />
                      <span>{course.timesPracticed || 0} révisions</span>
                    </div>
                    {course.analysisTokensSaved > 0 && (
                      <div className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                        <Zap className="w-3 h-3" />
                        <span>{course.analysisTokensSaved} jetons sauvés</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onViewCourseDetails(course);
                        playClickSound();
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>Voir la fiche</span>
                    </button>

                    <button
                      onClick={() => {
                        onSelectCourseForQuiz(course);
                        playClickSound();
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Jouer</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
