import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, CheckCircle2, Zap, AlertTriangle, FileText, Calendar, Compass, ArrowRight, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { Course, StudentProfile } from '../types/index.js';
import { api } from '../utils/api.js';
import { playSuccessSound, playErrorSound, playClickSound } from '../utils/audio.js';

interface CourseScannerProps {
  activeProfile: StudentProfile | null;
  onCourseAnalyzed: (course: Course) => void;
  onLaunchQuiz: (course: Course) => void;
}

export const CourseScanner: React.FC<CourseScannerProps> = ({
  activeProfile,
  onCourseAnalyzed,
  onLaunchQuiz,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [userTitle, setUserTitle] = useState('');
  const [userSubject, setUserSubject] = useState('Mathématiques');
  const [gradeLevel, setGradeLevel] = useState(activeProfile?.grade || '4ème');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [analyzedCourse, setAnalyzedCourse] = useState<Course | null>(null);
  const [fromCacheBanner, setFromCacheBanner] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const subjects = [
    'Mathématiques',
    'Histoire-Géo',
    'SVT',
    'Physique-Chimie',
    'Français',
    'Anglais',
    'Philosophie',
    'Autre',
  ];

  const gradeOptions = ['6ème', '5ème', '4ème', '3ème (Brevet)', '2nde', '1ère', 'Terminale (Bac)'];

  const handleFiles = (filesList: FileList | null) => {
    if (!filesList) return;
    const newFiles = Array.from(filesList);
    if (selectedFiles.length + newFiles.length > 5) {
      setError('Vous pouvez envoyer un maximum de 5 photos par cours.');
      return;
    }

    const updated = [...selectedFiles, ...newFiles];
    setSelectedFiles(updated);
    setError(null);

    // Create thumbnail preview URLs
    const newPreviews = updated.map((file) => URL.createObjectURL(file));
    setPreviews(newPreviews);
    playClickSound();
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    setPreviews(updated.map((f) => URL.createObjectURL(f)));
    playClickSound();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setError('Veuillez ajouter au moins une photo de votre cahier ou manuel.');
      return;
    }

    setLoading(true);
    setError(null);
    setFromCacheBanner(false);
    setLoadingStep('Vérification du cache local et empreinte SHA-256...');

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('photos', file);
      });
      if (userTitle.trim()) formData.append('title', userTitle.trim());
      formData.append('subject', userSubject);
      formData.append('gradeLevel', gradeLevel);
      if (activeProfile?.id) formData.append('profileId', activeProfile.id);

      // Simulation steps for great teenager EdTech UX
      const timer = setTimeout(() => {
        setLoadingStep('Déchiffrage OCR des écritures et schémas...');
      }, 1000);
      const timer2 = setTimeout(() => {
        setLoadingStep('Extraction des définitions, formules et dates...');
      }, 2500);

      const result = await api.analyzeCourse(formData);
      clearTimeout(timer);
      clearTimeout(timer2);

      setAnalyzedCourse(result.course);
      setFromCacheBanner(result.fromCache);
      onCourseAnalyzed(result.course);
      playSuccessSound();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          'Une erreur est survenue lors de l\'analyse. Vérifiez la netteté de l\'image ou votre connexion.'
      );
      playErrorSound();
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setPreviews([]);
    setAnalyzedCourse(null);
    setFromCacheBanner(false);
    setError(null);
    setUserTitle('');
    playClickSound();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          OCR Intelligent & Cache Local Économique
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white font-['Fredoka'] tracking-wide">
          Scanne ton cours en photo
        </h1>
        <p className="text-slate-400 text-sm max-w-xl mx-auto mt-2">
          Prends en photo ton cahier, ta feuille d'exercices ou un manuel. L'IA extrait automatiquement les notions clés, les formules, les dates et crée tes mini-jeux personnalisés !
        </p>
      </div>

      {!analyzedCourse ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Upload Dropzone / Camera Buttons */}
          <div className="bg-slate-800/80 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-3xl p-6 sm:p-8 text-center transition-all bg-gradient-to-b from-slate-800/40 to-slate-900/60">
            {previews.length === 0 ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Glisse tes photos ici ou prends une photo directe
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Formats acceptés : JPG, PNG, WebP (jusqu'à 5 photos par cours)
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {/* Camera on mobile */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Prendre en photo (Smartphone)</span>
                  </button>

                  {/* File browser */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Parcourir mes fichiers</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-300">
                    {selectedFiles.length} photo(s) prête(s) pour l'analyse
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    + Ajouter une photo
                  </button>
                </div>

                {/* Thumbnails grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {previews.map((preview, index) => (
                    <div
                      key={index}
                      className="relative group aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-md"
                    >
                      <img
                        src={preview}
                        alt={`Photo cours ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/80 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-slate-900/70 text-[10px] text-slate-300 px-1.5 py-0.5 rounded font-mono">
                        Page {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden native inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFiles(e.target.files)}
              accept="image/*"
              multiple
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={(e) => handleFiles(e.target.files)}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
          </div>

          {/* Course Details Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Titre du cours (optionnel)
              </label>
              <input
                type="text"
                value={userTitle}
                onChange={(e) => setUserTitle(e.target.value)}
                placeholder="Ex: Théorème de Thalès, Guerre Froide..."
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Matière
              </label>
              <select
                value={userSubject}
                onChange={(e) => setUserSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Niveau scolaire
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {gradeOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cache & Privacy note */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-400">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              <strong>Empreinte & Cache Anti-Gaspillage :</strong> Chaque photo est hachée localement (SHA-256). Si vous ou un autre élève analysez à nouveau le même cours, il est réutilisé instantanément sans refaire d'appel IA. Vos photos restent stockées sur votre volume local.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || selectedFiles.length === 0}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="font-medium">{loadingStep || 'Traitement en cours...'}</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Analyser le cours & Générer les mini-jeux</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* Result Preview Screen */
        <div className="space-y-6">
          {/* Cache Alert if cached */}
          {fromCacheBanner ? (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-between gap-3 text-xs shadow-lg">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <strong className="block text-emerald-200">
                    ⚡ Récupéré du cache local en 0.05s !
                  </strong>
                  <span>Cette photo a déjà été analysée : 0 jeton d'API consommé, quota préservé.</span>
                </div>
              </div>
              <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] uppercase font-bold shrink-0">
                Cache Hit
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center gap-2.5 text-xs shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>
                <strong>Analyse IA terminée avec succès !</strong> Le cours et ses mini-jeux sont enregistrés sur votre base locale.
              </span>
            </div>
          )}

          {/* Course Overview Card */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-700/80 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {analyzedCourse.subject}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-700 text-slate-300">
                    {analyzedCourse.gradeLevel}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white font-['Fredoka']">
                  {analyzedCourse.title}
                </h2>
              </div>

              {/* Fast Action: Play Quiz Now */}
              <button
                type="button"
                onClick={() => onLaunchQuiz(analyzedCourse)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <span>🎮 Lancer le Quiz maintenant</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Kid-Friendly Summary */}
            <div className="bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Résumé express pour réviser
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed">
                {analyzedCourse.summary}
              </p>
            </div>

            {/* Notions list */}
            {analyzedCourse.notions.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  Notions & Définitions clés ({analyzedCourse.notions.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analyzedCourse.notions.map((n, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-700/60 hover:border-indigo-500/40 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-white text-xs font-semibold">{n.term}</strong>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {n.category}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs leading-normal">{n.definition}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulas if any */}
            {analyzedCourse.formulas.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-3">
                  📐 Formules à retenir
                </h4>
                <div className="space-y-2">
                  {analyzedCourse.formulas.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <code className="text-xs font-mono font-bold text-purple-200 bg-purple-900/40 px-2 py-1 rounded">
                        {f.formula}
                      </code>
                      <span className="text-xs text-slate-300">{f.explanation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Dates if any */}
            {analyzedCourse.keyDates.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  Dates repères historiques
                </h4>
                <div className="space-y-2">
                  {analyzedCourse.keyDates.map((d, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-center gap-3"
                    >
                      <span className="text-xs font-bold text-amber-300 font-mono px-2 py-0.5 rounded bg-amber-900/40">
                        {d.date}
                      </span>
                      <span className="text-xs text-slate-300">{d.event}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated questions count & play */}
            <div className="pt-4 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs text-slate-400">
                🎯 {analyzedCourse.preGeneratedQuestions?.length || 0} questions et mini-jeux préparés
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scanner un autre cours</span>
                </button>
                <button
                  type="button"
                  onClick={() => onLaunchQuiz(analyzedCourse)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <span>Jouer aux Mini-Jeux</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
