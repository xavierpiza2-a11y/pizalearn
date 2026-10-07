import React, { useState } from 'react';
import { X, Play, BookOpen, FileText, Calendar, Compass, Hash, Sparkles } from 'lucide-react';
import { Course } from '../types/index.js';
import { playClickSound } from '../utils/audio.js';

interface CourseDetailModalProps {
  course: Course;
  onClose: () => void;
  onLaunchQuiz: (course: Course) => void;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  course,
  onClose,
  onLaunchQuiz,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'notions' | 'dates' | 'formulas' | 'raw'>(
    'summary'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-850 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {course.subject}
              </span>
              <span className="text-xs text-slate-400 font-semibold">{course.gradeLevel}</span>
            </div>
            <h2 className="text-2xl font-bold text-white font-['Fredoka']">{course.title}</h2>
          </div>
          <button
            onClick={() => {
              onClose();
              playClickSound();
            }}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-slate-900/60 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'summary'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Synthèse du cours
          </button>
          <button
            onClick={() => setActiveTab('notions')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'notions'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Notions & Définitions ({course.notions?.length || 0})
          </button>
          {course.formulas?.length > 0 && (
            <button
              onClick={() => setActiveTab('formulas')}
              className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'formulas'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Formules ({course.formulas.length})
            </button>
          )}
          {course.keyDates?.length > 0 && (
            <button
              onClick={() => setActiveTab('dates')}
              className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'dates'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Dates clés ({course.keyDates.length})
            </button>
          )}
          {course.rawText && (
            <button
              onClick={() => setActiveTab('raw')}
              className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'raw'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Transcription OCR brute
            </button>
          )}
        </div>

        {/* Tab content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Résumé pédagogique
                </h4>
                <p className="text-slate-200 text-sm leading-relaxed">{course.summary}</p>
              </div>

              {course.imageUrls && course.imageUrls.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Photos d'origine ({course.imageUrls.length})
                  </h4>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {course.imageUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="w-24 h-24 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0"
                      >
                        <img
                          src={url}
                          alt="Photo du cours"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notions' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {course.notions.map((n, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/60 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{n.term}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-indigo-300 font-mono">
                      {n.category}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">{n.definition}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'formulas' && (
            <div className="space-y-3">
              {course.formulas.map((f, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <code className="text-sm font-bold text-purple-200 font-mono bg-purple-900/40 px-3 py-1.5 rounded-xl">
                    {f.formula}
                  </code>
                  <span className="text-xs text-slate-300">{f.explanation}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'dates' && (
            <div className="space-y-3">
              {course.keyDates.map((d, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 flex items-center gap-3"
                >
                  <span className="text-xs font-bold text-amber-300 font-mono px-2.5 py-1 rounded-lg bg-amber-900/40 shrink-0">
                    {d.date}
                  </span>
                  <span className="text-xs text-slate-300">{d.event}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {course.rawText}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-850 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {course.preGeneratedQuestions?.length || 0} questions disponibles
          </div>
          <button
            onClick={() => {
              onLaunchQuiz(course);
              onClose();
              playClickSound();
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Lancer la révision ludique</span>
          </button>
        </div>
      </div>
    </div>
  );
};
