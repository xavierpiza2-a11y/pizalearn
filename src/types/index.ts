export type QuestionFormat = 'qcm' | 'fill_in_blank' | 'true_false' | 'flashcard' | 'match_pairs';

export type GameMode = 'zen' | 'timed';

export interface StudentProfile {
  id: string;
  name: string;
  avatar: string;
  grade: string;
  xp: number;
  level: number;
  streakDays: number;
  lastActiveDate: string;
  badges: StudentBadge[];
  createdAt: string;
}

export interface StudentBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockedAt: string;
}

export interface CourseNotion {
  term: string;
  definition: string;
  category: 'definition' | 'formula' | 'date' | 'key_concept';
  importance: 'essential' | 'bonus';
}

export interface QuizQuestion {
  id: string;
  type: QuestionFormat;
  question: string;
  concept: string;
  options?: string[]; // for QCM
  correctAnswer: string; // string or "Vrai" / "Faux" or answer
  explanation: string;
  hint?: string;
  blankSentence?: string; // e.g. "Napoléon a été couronné en ___ à Notre-Dame."
  blankOptions?: string[]; // words to choose from
  pairs?: Array<{ left: string; right: string }>; // for match_pairs
  flashcardFront?: string;
  flashcardBack?: string;
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  hash: string;
  imageUrls: string[];
  summary: string;
  rawText: string;
  notions: CourseNotion[];
  keyDates: Array<{ date: string; event: string }>;
  formulas: Array<{ formula: string; explanation: string }>;
  preGeneratedQuestions: QuizQuestion[];
  profileId: string | null;
  archived: boolean;
  createdAt: string;
  analysisTokensSaved: number;
  timesPracticed: number;
  fromCache?: boolean;
}

export interface QuizSessionResult {
  id: string;
  profileId: string;
  courseId: string;
  courseTitle: string;
  subject: string;
  mode: GameMode;
  questionCount: number;
  correctCount: number;
  scorePercent: number;
  xpEarned: number;
  durationSeconds: number;
  mistakes: Array<{
    question: string;
    studentAnswer: string;
    correctAnswer: string;
    concept: string;
    explanation: string;
  }>;
  createdAt: string;
}

export interface AppConfig {
  aiModel: string;
  hasApiKey: boolean;
  totalApiCalls: number;
  totalCacheHits: number;
  totalTokensSaved: number;
}

export interface AdminStats {
  totalAnalyses: number;
  cacheHits: number;
  tokensSavedEstimated: number;
  totalCourses: number;
  totalProfiles: number;
  totalQuizSessions: number;
  avgScore: number;
  subjectDistribution: Record<string, number>;
  difficultConcepts: Array<{ concept: string; count: number; subject: string }>;
}
