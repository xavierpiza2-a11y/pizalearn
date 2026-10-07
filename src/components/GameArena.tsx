import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Play,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Flame,
  Award,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Zap,
  Check,
  AlertCircle
} from 'lucide-react';
import { Course, GameMode, QuestionFormat, QuizQuestion, StudentProfile } from '../types/index.js';
import { api } from '../utils/api.js';
import {
  playSuccessSound,
  playErrorSound,
  playVictorySound,
  playClickSound,
} from '../utils/audio.js';

interface GameArenaProps {
  course: Course;
  count: number;
  formats: QuestionFormat[];
  mode: GameMode;
  activeProfile: StudentProfile | null;
  onExit: () => void;
  onSessionComplete: (updatedProfile: StudentProfile) => void;
}

export const GameArena: React.FC<GameArenaProps> = ({
  course,
  count,
  formats,
  mode,
  activeProfile,
  onExit,
  onSessionComplete,
}) => {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Gameplay state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [combo, setCombo] = useState(1);
  const [sessionXp, setSessionXp] = useState(0);

  // Timed mode state
  const [timeLeft, setTimeLeft] = useState(mode === 'timed' ? 30 : 0);
  const timerRef = useRef<any>(null);

  // Summary & Mistakes tracking
  const [isGameOver, setIsGameOver] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [mistakes, setMistakes] = useState<
    Array<{
      question: string;
      studentAnswer: string;
      correctAnswer: string;
      concept: string;
      explanation: string;
    }>
  >([]);
  const [sessionStartTime] = useState(Date.now());
  const [savingSession, setSavingSession] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ levelUp: boolean; newBadges: any[] } | null>(null);

  // State for Fill-in-the-blank
  const [selectedBlankWord, setSelectedBlankWord] = useState<string | null>(null);

  // State for Flashcard 3D flip
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // State for Match-pairs
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [shuffledRights, setShuffledRights] = useState<string[]>([]);

  // Fetch or assemble questions on mount
  useEffect(() => {
    let isMounted = true;
    const loadQuestions = async () => {
      try {
        setLoading(true);
        const data = await api.generateQuiz(course.id, {
          formats,
          count,
          mode,
        });
        if (isMounted) {
          setQuestions(data.questions);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
        // Fallback to preGenerated
        if (isMounted) {
          setQuestions((course.preGeneratedQuestions || []).slice(0, count));
          setLoading(false);
        }
      }
    };

    loadQuestions();
    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [course.id, count, formats, mode]);

  // Handle Timed countdown
  useEffect(() => {
    if (mode !== 'timed' || isAnswered || isGameOver || loading) return;

    setTimeLeft(25);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentIndex, isAnswered, isGameOver, loading, mode]);

  // Setup match-pairs whenever a match_pairs question comes up
  useEffect(() => {
    const q = questions[currentIndex];
    if (q && q.type === 'match_pairs' && q.pairs) {
      setMatchedPairs([]);
      setSelectedLeft(null);
      setSelectedRight(null);
      // Shuffle rights
      const rights = q.pairs.map((p) => p.right).sort(() => 0.5 - Math.random());
      setShuffledRights(rights);
    }
    // Reset specific states
    setSelectedBlankWord(null);
    setIsCardFlipped(false);
    setShowHint(false);
    setSelectedOption(null);
    setIsAnswered(false);
  }, [currentIndex, questions]);

  const handleTimeExpired = () => {
    const q = questions[currentIndex];
    setIsAnswered(true);
    setIsCorrect(false);
    setCombo(1);
    playErrorSound();

    setMistakes((prev) => [
      ...prev,
      {
        question: q.question,
        studentAnswer: 'Temps écoulé ⏱️',
        correctAnswer: q.correctAnswer,
        concept: q.concept,
        explanation: q.explanation,
      },
    ]);
  };

  const handleSelectQcmOption = (option: string) => {
    if (isAnswered) return;
    const q = questions[currentIndex];
    setSelectedOption(option);
    setIsAnswered(true);

    const isRight = option.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    setIsCorrect(isRight);

    if (isRight) {
      handleAnswerSuccess();
    } else {
      handleAnswerFailure(option, q.correctAnswer);
    }
  };

  const handleSelectTrueFalse = (choice: 'Vrai' | 'Faux') => {
    if (isAnswered) return;
    const q = questions[currentIndex];
    setSelectedOption(choice);
    setIsAnswered(true);

    const isRight = choice.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    setIsCorrect(isRight);

    if (isRight) {
      handleAnswerSuccess();
    } else {
      handleAnswerFailure(choice, q.correctAnswer);
    }
  };

  const handleValidateBlankWord = (word: string) => {
    if (isAnswered) return;
    setSelectedBlankWord(word);
    const q = questions[currentIndex];
    setIsAnswered(true);

    const isRight = word.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    setIsCorrect(isRight);

    if (isRight) {
      handleAnswerSuccess();
    } else {
      handleAnswerFailure(word, q.correctAnswer);
    }
  };

  const handleFlashcardSelfEvaluation = (knewIt: boolean) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setIsCorrect(knewIt);
    const q = questions[currentIndex];

    if (knewIt) {
      handleAnswerSuccess();
    } else {
      handleAnswerFailure("À consolider", q.correctAnswer || q.flashcardBack || '');
    }
  };

  // Match Pairs clicks
  const handleLeftClick = (leftText: string) => {
    if (isAnswered || matchedPairs.includes(leftText)) return;
    playClickSound();
    setSelectedLeft(leftText);
    if (selectedRight) {
      checkPairMatch(leftText, selectedRight);
    }
  };

  const handleRightClick = (rightText: string) => {
    if (isAnswered || matchedPairs.some((l) => isRightPaired(l, rightText))) return;
    playClickSound();
    setSelectedRight(rightText);
    if (selectedLeft) {
      checkPairMatch(selectedLeft, rightText);
    }
  };

  const isRightPaired = (left: string, right: string) => {
    const q = questions[currentIndex];
    const pair = q.pairs?.find((p) => p.left === left);
    return pair?.right === right;
  };

  const checkPairMatch = (left: string, right: string) => {
    const q = questions[currentIndex];
    const valid = q.pairs?.find((p) => p.left === left && p.right === right);

    if (valid) {
      playSuccessSound();
      const newMatched = [...matchedPairs, left];
      setMatchedPairs(newMatched);
      setSelectedLeft(null);
      setSelectedRight(null);

      // Check if all pairs matched
      if (newMatched.length === (q.pairs?.length || 4)) {
        setIsAnswered(true);
        setIsCorrect(true);
        handleAnswerSuccess();
      }
    } else {
      playErrorSound();
      setSelectedLeft(null);
      setSelectedRight(null);
    }
  };

  const handleAnswerSuccess = () => {
    playSuccessSound();
    setCorrectAnswersCount((prev) => prev + 1);

    // Combo multiplier
    const nextCombo = combo < 4 ? combo + 1 : 4;
    setCombo(nextCombo);

    // XP calculation: base 25 XP * combo
    const bonusXp = 25 * combo;
    setSessionXp((prev) => prev + bonusXp);

    // Trigger subtle confetti burst
    try {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#6366f1', '#a855f7', '#10b981', '#f59e0b'],
      });
    } catch (_) {}
  };

  const handleAnswerFailure = (studentAnswer: string, correctAnswer: string) => {
    playErrorSound();
    setCombo(1);
    const q = questions[currentIndex];

    setMistakes((prev) => [
      ...prev,
      {
        question: q.question,
        studentAnswer,
        correctAnswer,
        concept: q.concept,
        explanation: q.explanation,
      },
    ]);
  };

  const handleNextQuestion = () => {
    playClickSound();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      finishGameSession();
    }
  };

  const finishGameSession = async () => {
    setIsGameOver(true);
    playVictorySound();

    // Trigger celebratory grand confetti
    try {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.5 },
      });
    } catch (_) {}

    // Record session if student profile active
    if (activeProfile) {
      setSavingSession(true);
      const totalQ = questions.length || 1;
      const scorePercent = Math.round((correctAnswersCount / totalQ) * 100);
      const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);

      try {
        const res = await api.recordSession({
          profileId: activeProfile.id,
          courseId: course.id,
          courseTitle: course.title,
          subject: course.subject,
          mode,
          questionCount: totalQ,
          correctCount: correctAnswersCount,
          scorePercent,
          xpEarned: Math.max(50, sessionXp),
          durationSeconds,
          mistakes,
        });

        setLevelUpData({ levelUp: res.levelUp, newBadges: res.newBadges });
        onSessionComplete(res.profile);
      } catch (err) {
        console.error('Error saving session:', err);
      } finally {
        setSavingSession(false);
      }
    }
  };

  // ----------------------------------------------------
  // Render: Loading Screen
  // ----------------------------------------------------
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 shadow-xl shadow-indigo-900/30">
          <Sparkles className="w-10 h-10 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-white font-['Fredoka'] mb-2">
          Préparation de tes mini-jeux...
        </h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Assemblage des questions, calcul des pièges et calibration des indices pour {course.title}.
        </p>
      </div>
    );
  }

  // Fallback if no questions
  if (questions.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Aucune question disponible</h3>
        <p className="text-xs text-slate-400 mb-6">
          Vérifiez que le cours contient suffisamment de matière extraite.
        </p>
        <button
          onClick={onExit}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Retour aux cours
        </button>
      </div>
    );
  }

  // ----------------------------------------------------
  // Render: Game Over Celebration Screen
  // ----------------------------------------------------
  if (isGameOver) {
    const totalQ = questions.length;
    const scorePercent = Math.round((correctAnswersCount / totalQ) * 100);

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6">
          
          {/* Trophy Header */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-indigo-500/20 to-purple-500/20 border border-amber-500/30 text-amber-300 text-4xl shadow-xl">
            🏆
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
              Session Terminée !
            </span>
            <h2 className="text-3xl font-bold text-white font-['Fredoka'] mt-3">
              {scorePercent >= 80 ? 'Incroyable Performance ! 🎉' : scorePercent >= 50 ? 'Bien Joué ! 👏' : 'Bel Effort, Continue ! 💪'}
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Cours révisé : <strong className="text-slate-200">{course.title}</strong>
            </p>
          </div>

          {/* KPI Badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
              <span className="block text-[11px] text-slate-400 font-medium">Score</span>
              <strong className="text-xl sm:text-2xl font-bold text-white font-mono">
                {correctAnswersCount} / {totalQ}
              </strong>
              <span className="block text-[10px] text-indigo-400 font-bold">{scorePercent}%</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30">
              <span className="block text-[11px] text-indigo-300 font-medium">XP Gagné</span>
              <strong className="text-xl sm:text-2xl font-bold text-indigo-300 font-mono">
                +{Math.max(50, sessionXp)}
              </strong>
              <span className="block text-[10px] text-purple-300 font-bold">Points d'XP</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30">
              <span className="block text-[11px] text-amber-300 font-medium">Combo Max</span>
              <strong className="text-xl sm:text-2xl font-bold text-amber-400 font-mono">
                x{combo} 🔥
              </strong>
              <span className="block text-[10px] text-amber-300/80 font-bold">Multiplicateur</span>
            </div>
          </div>

          {/* Level up / Badge alerts */}
          {levelUpData?.levelUp && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/40 text-purple-200 text-xs flex items-center justify-center gap-3 animate-bounce">
              <Award className="w-5 h-5 text-amber-400 shrink-0" />
              <span><strong>LEVEL UP !</strong> Tu passes au niveau supérieur ! 🚀</span>
            </div>
          )}

          {levelUpData?.newBadges && levelUpData.newBadges.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-center gap-3">
              <span className="text-xl">{levelUpData.newBadges[0].icon}</span>
              <span><strong>Nouveau Trophée débloqué :</strong> {levelUpData.newBadges[0].name} !</span>
            </div>
          )}

          {/* Mistakes review (À retenir) */}
          {mistakes.length > 0 ? (
            <div className="text-left bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                À retenir pour la prochaine fois ({mistakes.length})
              </h4>
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {mistakes.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1">
                    <p className="font-semibold text-white">{m.question}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="text-rose-400">Ta réponse : {m.studentAnswer}</span>
                      <span className="text-emerald-400 font-semibold">Bonne réponse : {m.correctAnswer}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed pt-1 border-t border-slate-700/40">
                      💡 <strong>Astuce :</strong> {m.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span><strong>Zéro faute !</strong> Tu maîtrises parfaitement ce chapitre !</span>
            </div>
          )}

          {/* Exit / Replay Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => {
                setIsGameOver(false);
                setCurrentIndex(0);
                setCorrectAnswersCount(0);
                setMistakes([]);
                setCombo(1);
                setSessionXp(0);
                playClickSound();
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rejouer une session</span>
            </button>

            <button
              onClick={() => {
                onExit();
                playClickSound();
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Retourner aux cours</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Render: Active Question Screen
  // ----------------------------------------------------
  const currentQuestion = questions[currentIndex];
  const progressPercent = Math.round(((currentIndex) / questions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      
      {/* Top Header: Progress & Game Stats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700 font-mono text-[11px]">
              Question {currentIndex + 1} / {questions.length}
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">{course.subject}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Combo flame */}
            <div className={`flex items-center gap-1 font-bold ${combo > 1 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>
              <Flame className="w-4 h-4 fill-amber-400" />
              <span>x{combo}</span>
            </div>

            {/* Timed countdown if applicable */}
            {mode === 'timed' && (
              <div className={`flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                timeLeft <= 5 ? 'bg-rose-500/20 text-rose-400 animate-bounce' : 'bg-slate-800 text-slate-300'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{timeLeft}s</span>
              </div>
            )}

            <button
              onClick={() => {
                if (confirm('Veux-tu vraiment quitter la session en cours ?')) onExit();
              }}
              className="text-slate-500 hover:text-slate-300 text-xs cursor-pointer ml-1"
            >
              Quitter
            </button>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
        
        {/* Concept Pill & Format badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
            {currentQuestion.type === 'qcm' && '🔘 QCM'}
            {currentQuestion.type === 'true_false' && '⚖️ Vrai ou Faux'}
            {currentQuestion.type === 'fill_in_blank' && '🧩 Texte à trous'}
            {currentQuestion.type === 'flashcard' && '🎴 Flashcard 3D'}
            {currentQuestion.type === 'match_pairs' && '🔗 Association'}
          </span>

          <span className="text-[11px] text-slate-400 font-medium">
            Notion : <strong>{currentQuestion.concept}</strong>
          </span>
        </div>

        {/* Question Text */}
        <h3 className="text-xl sm:text-2xl font-bold text-white font-['Fredoka'] leading-snug">
          {currentQuestion.question}
        </h3>

        {/* Hint button if available */}
        {currentQuestion.hint && !isAnswered && (
          <div>
            {!showHint ? (
              <button
                type="button"
                onClick={() => {
                  setShowHint(true);
                  playClickSound();
                }}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Besoin d'un indice ?</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span><strong>Indice :</strong> {currentQuestion.hint}</span>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* FORMAT 1 : QCM (Multiple Choices) */}
        {/* ---------------------------------------------------- */}
        {currentQuestion.type === 'qcm' && currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx); // A, B, C, D
              const isPicked = selectedOption === opt;
              const isCorrectOpt = opt.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();

              let btnStyle = 'bg-slate-900/60 hover:bg-slate-750 border-slate-700/80 text-slate-200';
              if (isAnswered) {
                if (isCorrectOpt) {
                  btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold';
                } else if (isPicked && !isCorrectOpt) {
                  btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-200';
                } else {
                  btnStyle = 'opacity-40 border-slate-800 text-slate-500';
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => handleSelectQcmOption(opt)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left text-xs sm:text-sm transition-all cursor-pointer ${btnStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-mono font-bold text-xs text-indigo-400 shrink-0">
                      {letter}
                    </span>
                    <span>{opt}</span>
                  </div>
                  {isAnswered && isCorrectOpt && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {isAnswered && isPicked && !isCorrectOpt && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* FORMAT 2 : Vrai ou Faux ? */}
        {/* ---------------------------------------------------- */}
        {currentQuestion.type === 'true_false' && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            {(['Vrai', 'Faux'] as const).map((choice) => {
              const isPicked = selectedOption === choice;
              const isCorrectOpt = choice.toLowerCase() === currentQuestion.correctAnswer.toLowerCase();

              let btnStyle = 'bg-slate-900/60 hover:bg-slate-750 border-slate-700 text-slate-200';
              if (isAnswered) {
                if (isCorrectOpt) {
                  btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold';
                } else if (isPicked && !isCorrectOpt) {
                  btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-200';
                } else {
                  btnStyle = 'opacity-40 border-slate-800 text-slate-500';
                }
              }

              return (
                <button
                  key={choice}
                  disabled={isAnswered}
                  onClick={() => handleSelectTrueFalse(choice)}
                  className={`p-5 rounded-2xl border text-center transition-all cursor-pointer ${btnStyle}`}
                >
                  <span className="text-2xl block mb-1">{choice === 'Vrai' ? '👍' : '👎'}</span>
                  <span className="text-base font-bold">{choice}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* FORMAT 3 : Textes à trous (fill_in_blank) */}
        {/* ---------------------------------------------------- */}
        {currentQuestion.type === 'fill_in_blank' && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700 text-sm leading-relaxed text-slate-200">
              {currentQuestion.blankSentence ? (
                currentQuestion.blankSentence.split('___').map((part, idx, arr) => (
                  <React.Fragment key={idx}>
                    {part}
                    {idx < arr.length - 1 && (
                      <span className="inline-block px-3 py-1 mx-1.5 rounded-lg border border-dashed border-indigo-400 bg-indigo-500/10 text-indigo-300 font-bold font-mono">
                        {selectedBlankWord || '____?____'}
                      </span>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <span>Complète le mot manquant</span>
              )}
            </div>

            <div>
              <p className="text-xs text-slate-400 font-semibold mb-2">Choisis le mot manquant :</p>
              <div className="flex flex-wrap gap-2">
                {(currentQuestion.blankOptions || [currentQuestion.correctAnswer]).map((word, idx) => {
                  const isCorrectWord = word.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
                  let pillStyle = 'bg-slate-700/80 hover:bg-slate-700 text-white';

                  if (isAnswered) {
                    if (isCorrectWord) pillStyle = 'bg-emerald-600 text-white font-bold';
                    else if (selectedBlankWord === word) pillStyle = 'bg-rose-600 text-white';
                    else pillStyle = 'opacity-40 bg-slate-800 text-slate-500';
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAnswered}
                      onClick={() => handleValidateBlankWord(word)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${pillStyle}`}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* FORMAT 4 : Flashcards 3D Interactive */}
        {/* ---------------------------------------------------- */}
        {currentQuestion.type === 'flashcard' && (
          <div className="space-y-4">
            <div
              onClick={() => {
                setIsCardFlipped(!isCardFlipped);
                playClickSound();
              }}
              className="relative min-h-[160px] rounded-2xl p-6 bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/40 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 transition-all shadow-inner group"
            >
              {!isCardFlipped ? (
                <div>
                  <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider block mb-2">
                    Recto • Clique pour voir la réponse
                  </span>
                  <p className="text-base sm:text-lg font-bold text-white">
                    {currentQuestion.flashcardFront || currentQuestion.question}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs text-indigo-400 mt-4 group-hover:scale-105 transition-transform">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retourner la carte
                  </span>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider block mb-2">
                    Verso • Réponse / Définition
                  </span>
                  <p className="text-sm sm:text-base font-semibold text-slate-200">
                    {currentQuestion.flashcardBack || currentQuestion.correctAnswer}
                  </p>
                </div>
              )}
            </div>

            {/* Self assessment buttons once flipped */}
            {isCardFlipped && !isAnswered && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleFlashcardSelfEvaluation(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-650 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  🔁 À revoir
                </button>
                <button
                  type="button"
                  onClick={() => handleFlashcardSelfEvaluation(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  👍 Je maîtrise (+XP)
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* FORMAT 5 : Association de Paires (match_pairs) */}
        {/* ---------------------------------------------------- */}
        {currentQuestion.type === 'match_pairs' && currentQuestion.pairs && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Clique sur un terme à gauche, puis sur sa définition correspondante à droite.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Left Column (Terms) */}
              <div className="space-y-2">
                {currentQuestion.pairs.map((p, i) => {
                  const isPaired = matchedPairs.includes(p.left);
                  const isCurrent = selectedLeft === p.left;

                  let style = 'bg-slate-900/60 border-slate-700 text-slate-200 hover:border-indigo-400';
                  if (isPaired) style = 'bg-emerald-950/40 border-emerald-500 text-emerald-300 opacity-60';
                  else if (isCurrent) style = 'bg-indigo-600/40 border-indigo-400 text-white font-bold ring-2 ring-indigo-500/50';

                  return (
                    <button
                      key={i}
                      disabled={isPaired}
                      onClick={() => handleLeftClick(p.left)}
                      className={`w-full p-3 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${style}`}
                    >
                      <span>{p.left}</span>
                      {isPaired && <Check className="w-4 h-4 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Right Column (Definitions shuffled) */}
              <div className="space-y-2">
                {shuffledRights.map((rightText, i) => {
                  const isPaired = matchedPairs.some((l) => isRightPaired(l, rightText));
                  const isCurrent = selectedRight === rightText;

                  let style = 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-purple-400';
                  if (isPaired) style = 'bg-emerald-950/40 border-emerald-500 text-emerald-300 opacity-60';
                  else if (isCurrent) style = 'bg-purple-600/40 border-purple-400 text-white font-bold ring-2 ring-purple-500/50';

                  return (
                    <button
                      key={i}
                      disabled={isPaired}
                      onClick={() => handleRightClick(rightText)}
                      className={`w-full p-3 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${style}`}
                    >
                      <span className="line-clamp-2">{rightText}</span>
                      {isPaired && <Check className="w-4 h-4 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* Instant Feedback Panel on Answer */}
        {/* ---------------------------------------------------- */}
        {isAnswered && (
          <div
            className={`p-4 sm:p-5 rounded-2xl border text-xs space-y-2 transition-all ${
              isCorrect
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Exact ! Super réponse (+{25 * combo} XP)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-400" />
                    <span>Oups ! Pas tout à fait...</span>
                  </>
                )}
              </div>
            </div>

            <p className="text-slate-200 text-xs leading-relaxed pt-1">
              <strong>Explication :</strong> {currentQuestion.explanation}
            </p>

            {/* Next question action button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleNextQuestion}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <span>{currentIndex + 1 < questions.length ? 'Question suivante' : 'Voir mon bilan'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
