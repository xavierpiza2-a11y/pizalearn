import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Course, StudentProfile, QuizSessionResult, AppConfig, AdminStats } from '../src/types/index.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface DatabaseSchema {
  profiles: StudentProfile[];
  courses: Course[];
  sessions: QuizSessionResult[];
  config: {
    aiModel: string;
    aiProvider?: 'gemini' | 'anthropic' | 'openai';
    totalApiCalls: number;
    totalCacheHits: number;
    totalTokensSaved: number;
    adminPin: string;
  };
}

const INITIAL_PROFILES: StudentProfile[] = [
  {
    id: 'prof_emma',
    name: 'Emma',
    avatar: '🦊',
    grade: '4ème',
    xp: 840,
    level: 4,
    streakDays: 5,
    lastActiveDate: new Date().toISOString().split('T')[0],
    badges: [
      { id: 'b_welcome', name: 'Premier Pas', icon: '🚀', description: 'Premier cours révisé avec succès', unlockedAt: '2026-10-01' },
      { id: 'b_streak3', name: 'En Flammes', icon: '🔥', description: 'Série de 3 jours consécutifs', unlockedAt: '2026-10-03' },
      { id: 'b_maths_fan', name: 'As du Calcul', icon: '📐', description: 'Score parfait en Mathématiques', unlockedAt: '2026-10-05' }
    ],
    createdAt: '2026-09-15T10:00:00.000Z'
  },
  {
    id: 'prof_thomas',
    name: 'Thomas',
    avatar: '⚡',
    grade: '3ème (Brevet)',
    xp: 1250,
    level: 6,
    streakDays: 3,
    lastActiveDate: new Date().toISOString().split('T')[0],
    badges: [
      { id: 'b_welcome', name: 'Premier Pas', icon: '🚀', description: 'Premier cours révisé avec succès', unlockedAt: '2026-09-20' },
      { id: 'b_historian', name: 'Chrono Maître', icon: '🏛️', description: 'Toutes les dates d\'histoire maîtrisées', unlockedAt: '2026-09-28' },
      { id: 'b_zen_master', name: 'Sérénité Totale', icon: '🧘', description: '10 sessions d\'entraînement zen terminées', unlockedAt: '2026-10-04' }
    ],
    createdAt: '2026-09-10T14:30:00.000Z'
  },
  {
    id: 'prof_lucas',
    name: 'Lucas',
    avatar: '🎮',
    grade: 'Seconde',
    xp: 420,
    level: 2,
    streakDays: 1,
    lastActiveDate: new Date().toISOString().split('T')[0],
    badges: [
      { id: 'b_welcome', name: 'Premier Pas', icon: '🚀', description: 'Premier cours révisé avec succès', unlockedAt: '2026-10-06' }
    ],
    createdAt: '2026-10-06T11:00:00.000Z'
  }
];

const INITIAL_COURSES: Course[] = [
  {
    id: 'course_pythagore',
    title: 'Théorème de Pythagore et Réciproque',
    subject: 'Mathématiques',
    gradeLevel: '4ème / 3ème',
    hash: 'mock_hash_pythagore_math_4e',
    imageUrls: ['/demo/pythagore.png'],
    summary: 'Dans un triangle rectangle, le carré de l\'hypoténuse est égal à la somme des carrés des deux autres côtés : BC² = AB² + AC². La réciproque permet de prouver qu\'un triangle est rectangle.',
    rawText: 'Chapitre 3 : Triangle rectangle et Pythagore.\n1. L\'hypoténuse est le côté opposé à l\'angle droit et le plus long côté du triangle.\n2. Énoncé : Si ABC est rectangle en A, alors BC² = AB² + AC².\n3. Exemple d\'application : AB = 3 cm, AC = 4 cm. BC² = 9 + 16 = 25 donc BC = √25 = 5 cm.\n4. Réciproque de Pythagore : Si BC² = AB² + AC², alors le triangle ABC est rectangle en A.',
    notions: [
      { term: 'Hypoténuse', definition: 'Le plus long côté d\'un triangle rectangle, situé directement en face de l\'angle droit.', category: 'definition', importance: 'essential' },
      { term: 'Théorème direct', definition: 'Permet de calculer la longueur d\'un côté inconnu dans un triangle rectangle si l\'on connaît les deux autres.', category: 'key_concept', importance: 'essential' },
      { term: 'Réciproque de Pythagore', definition: 'Permet de démontrer qu\'un triangle est rectangle en vérifiant l\'égalité des carrés.', category: 'key_concept', importance: 'essential' },
      { term: 'Racine carrée (√)', definition: 'Opération inverse de l\'élévation au carré, utilisée pour trouver la longueur finale.', category: 'definition', importance: 'bonus' }
    ],
    keyDates: [],
    formulas: [
      { formula: 'BC² = AB² + AC²', explanation: 'Égalité de Pythagore pour un triangle ABC rectangle en A' },
      { formula: 'BC = √(AB² + AC²)', explanation: 'Calcul direct de la longueur de l\'hypoténuse' },
      { formula: 'AB² = BC² - AC²', explanation: 'Calcul d\'un côté de l\'angle droit connaissant l\'hypoténuse' }
    ],
    preGeneratedQuestions: [
      {
        id: 'q_pyth_1',
        type: 'qcm',
        question: 'Quel est le côté appelé "hypoténuse" dans un triangle rectangle ?',
        concept: 'Hypoténuse',
        options: ['Le plus petit côté', 'Le côté opposé à l\'angle droit', 'N\'importe quel côté adjacent', 'La hauteur issue de l\'angle droit'],
        correctAnswer: 'Le côté opposé à l\'angle droit',
        explanation: 'L\'hypoténuse est toujours le côté le plus long et il est situé en face de l\'angle droit.',
        hint: 'Regarde le côté le plus long qui fait face au coin à 90°.'
      },
      {
        id: 'q_pyth_2',
        type: 'qcm',
        question: 'Si AB = 6 cm et AC = 8 cm dans un triangle ABC rectangle en A, combien mesure BC ?',
        concept: 'Calcul d\'hypoténuse',
        options: ['10 cm', '14 cm', '100 cm', '12 cm'],
        correctAnswer: '10 cm',
        explanation: 'BC² = AB² + AC² = 6² + 8² = 36 + 64 = 100. Donc BC = √100 = 10 cm.',
        hint: 'Fais 36 + 64 puis cherche la racine carrée.'
      },
      {
        id: 'q_pyth_3',
        type: 'true_false',
        question: 'La réciproque du théorème de Pythagore sert à calculer la longueur d\'un côté manquant.',
        concept: 'Réciproque vs Théorème direct',
        correctAnswer: 'Faux',
        explanation: 'C\'est le théorème direct qui calcule une longueur. La réciproque sert à prouver qu\'un triangle est rectangle !',
        hint: 'Attention au piège classique entre direct (calcul) et réciproque (démonstration).'
      },
      {
        id: 'q_pyth_4',
        type: 'fill_in_blank',
        question: 'Complète la formule de Pythagore pour le triangle rectangle en A :',
        blankSentence: 'Dans le triangle ABC rectangle en A, l\'égalité s\'écrit : BC² = ___ + AC².',
        blankOptions: ['AB²', 'AB', 'BC', '2AB'],
        correctAnswer: 'AB²',
        concept: 'Formule de Pythagore',
        explanation: 'Le carré de l\'hypoténuse BC est égal à la somme des carrés des côtés AB et AC.',
        hint: 'N\'oublie pas l\'exposant 2 !'
      },
      {
        id: 'q_pyth_5',
        type: 'flashcard',
        question: 'Flashcard Révision : Qu\'est-ce que l\'hypoténuse ?',
        concept: 'Vocabulaire géométrie',
        correctAnswer: 'Le plus long côté d\'un triangle rectangle, opposé à l\'angle droit.',
        flashcardFront: '📐 Qu\'est-ce que l\'hypoténuse et où se situe-t-elle ?',
        flashcardBack: 'C\'est le plus long côté du triangle rectangle. Il se situe toujours en face de l\'angle droit (90°).',
        explanation: 'Notion fondamentale pour tout calcul de trigonométrie et de Pythagore.'
      },
      {
        id: 'q_pyth_6',
        type: 'match_pairs',
        question: 'Relie chaque notion de géométrie à sa fonction exacte :',
        concept: 'Distinction théorèmes',
        correctAnswer: 'Association complète',
        explanation: 'Bien distinguer l\'outil de calcul de l\'outil de preuve géométrique.',
        pairs: [
          { left: 'Théorème direct', right: 'Calculer une longueur inconnue' },
          { left: 'Réciproque', right: 'Prouver qu\'un triangle est rectangle' },
          { left: 'Hypoténuse', right: 'Côté opposé à l\'angle droit' },
          { left: 'Angle droit', right: 'Angle de mesure 90 degrés' }
        ]
      }
    ],
    profileId: 'prof_emma',
    archived: false,
    createdAt: '2026-10-01T14:00:00.000Z',
    analysisTokensSaved: 3200,
    timesPracticed: 6
  },
  {
    id: 'course_revolution',
    title: 'La Révolution Française et l\'Empire (1789-1815)',
    subject: 'Histoire-Géo',
    gradeLevel: '4ème / 3ème',
    hash: 'mock_hash_revolution_histoire_4e',
    imageUrls: ['/demo/revolution.png'],
    summary: 'De la fin de la monarchie absolue avec les États généraux et la prise de la Bastille en 1789 jusqu\'à la proclamation de la Ière République (1792) et l\'Empire napoléonien (1804-1815).',
    rawText: 'Chapitre Histoire : Temps forts de la Révolution.\n- 5 mai 1789 : Ouverture des États généraux à Versailles.\n- 20 juin 1789 : Serment du Jeu de Paume.\n- 14 juillet 1789 : Prise de la Bastille par les Parisiens.\n- 26 août 1789 : Déclaration des Droits de l\'Homme et du Citoyen (DDHC).\n- 21 septembre 1792 : Proclamation de la Première République.\n- 1804 : Napoléon Bonaparte sacré empereur des Français.',
    notions: [
      { term: 'Monarchie absolue', definition: 'Régime politique où le roi concentre tous les pouvoirs (législatif, exécutif, judiciaire) de droit divin.', category: 'definition', importance: 'essential' },
      { term: 'Souveraineté nationale', definition: 'Principe selon lequel le pouvoir politique appartient à la nation (les citoyens représentés).', category: 'key_concept', importance: 'essential' },
      { term: 'Tiers-État', definition: 'Ordre de l\'Ancien Régime regroupant 97% de la population (paysans, artisans, bourgeois) sans privilèges.', category: 'definition', importance: 'essential' },
      { term: 'DDHC', definition: 'Texte fondamental proclamant l\'égalité en droits et la liberté de tous les hommes dès la naissance.', category: 'key_concept', importance: 'essential' }
    ],
    keyDates: [
      { date: '14 juillet 1789', event: 'Prise de la Bastille, symbole de l\'arbitraire royal renversé' },
      { date: '26 août 1789', event: 'Adoption de la Déclaration des Droits de l\'Homme et du Citoyen' },
      { date: '21 septembre 1792', event: 'Proclamation de la Première République française' },
      { date: '2 décembre 1804', event: 'Sacre de Napoléon Ier à la cathédrale Notre-Dame de Paris' }
    ],
    formulas: [],
    preGeneratedQuestions: [
      {
        id: 'q_rev_1',
        type: 'qcm',
        question: 'Quel événement marquant s\'est déroulé le 14 juillet 1789 ?',
        concept: 'Prise de la Bastille',
        options: ['La prise de la Bastille', 'Le sacre de Napoléon', 'Le serment du Jeu de Paume', 'L\'exécution de Louis XVI'],
        correctAnswer: 'La prise de la Bastille',
        explanation: 'Le peuple de Paris prend d\'assaut la prison forteresse royale de la Bastille pour s\'emparer de poudre et d\'armes.',
        hint: 'C\'est la date commémorée lors de notre fête nationale !'
      },
      {
        id: 'q_rev_2',
        type: 'true_false',
        question: 'En 1789, le Tiers-État représentait environ 50% de la population française.',
        concept: 'Société d\'Ancien Régime',
        correctAnswer: 'Faux',
        explanation: 'Le Tiers-État représentait plus de 97% de la population française ! Le clergé et la noblesse formaient moins de 3%.',
        hint: 'La grande majorité des Français appartenait à cet ordre écrasé d\'impôts.'
      },
      {
        id: 'q_rev_3',
        type: 'fill_in_blank',
        question: 'Complète la date essentielle de la DDHC :',
        blankSentence: 'La Déclaration des Droits de l\'Homme et du Citoyen est votée le 26 ___ 1789.',
        blankOptions: ['août', 'juillet', 'mai', 'décembre'],
        correctAnswer: 'août',
        concept: 'Chronologie DDHC',
        explanation: 'La DDHC a été votée par l\'Assemblée nationale constituante le 26 août 1789.',
        hint: 'C\'est juste le mois qui suit la prise de la Bastille.'
      },
      {
        id: 'q_rev_4',
        type: 'match_pairs',
        question: 'Relie chaque date clé de la Révolution à son événement historique :',
        concept: 'Frise chronologique Révolution',
        correctAnswer: 'Association complète',
        explanation: 'Ces quatre dates sont incontournables au collège pour le Brevet.',
        pairs: [
          { left: '14 juillet 1789', right: 'Prise de la Bastille' },
          { left: '26 août 1789', right: 'Déclaration Droits de l\'Homme' },
          { left: '21 sept. 1792', right: '1ère République proclamée' },
          { left: '2 déc. 1804', right: 'Sacre de Napoléon Ier' }
        ]
      },
      {
        id: 'q_rev_5',
        type: 'flashcard',
        question: 'Flashcard : Qu\'est-ce que la souveraineté nationale ?',
        concept: 'Notion civique',
        correctAnswer: 'Le pouvoir suprême appartient à la nation de citoyens réunis.',
        flashcardFront: '🏛️ Définition : La souveraineté nationale',
        flashcardBack: 'Principe selon lequel le pouvoir suprême n\'appartient plus au Roi par droit divin, mais à l\'ensemble des citoyens (la Nation).',
        explanation: 'Cœur du passage de l\'Ancien Régime à la démocratie républicaine.'
      }
    ],
    profileId: 'prof_thomas',
    archived: false,
    createdAt: '2026-10-02T09:15:00.000Z',
    analysisTokensSaved: 4100,
    timesPracticed: 9
  },
  {
    id: 'course_photosynthese',
    title: 'La Photosynthèse et la Nutrition des Végétaux',
    subject: 'SVT',
    gradeLevel: '5ème / 4ème',
    hash: 'mock_hash_svt_photosynthese',
    imageUrls: ['/demo/svt.png'],
    summary: 'Les plantes chlorophylliennes produisent leur propre matière organique (glucose, amidon) grâce à la lumière du soleil, au dioxyde de carbone (CO2) absorbé par les feuilles et à l\'eau puisée par les racines. Elles rejettent du dioxygène (O2).',
    rawText: 'SVT Chapitre 2 : Nutrition végétale.\n1. Organismes autotrophes : fabriquent leur propre matière organique.\n2. Équation bilan : Eau + Dioxyde de carbone + Énergie lumineuse -> Glucose (matière organique) + Dioxygène (O2).\n3. Rôle de la chlorophylle : pigment vert situé dans les chloroplastes qui capte les photons lumineux.\n4. Rôle des stomates : pores à la surface des feuilles permettant les échanges gazeux.',
    notions: [
      { term: 'Autotrophe', definition: 'Être vivant capable de fabriquer sa propre matière organique à partir de matière minérale et de lumière.', category: 'definition', importance: 'essential' },
      { term: 'Chloroplaste', definition: 'Organite cellulaire végétal contenant la chlorophylle où se déroule la photosynthèse.', category: 'definition', importance: 'essential' },
      { term: 'Stomate', definition: 'Minuscule orifice sur la face inférieure des feuilles régulant les entrées et sorties de gaz (CO2, O2, vapeur d\'eau).', category: 'definition', importance: 'bonus' },
      { term: 'Sève brute', definition: 'Liquide composé d\'eau et de sels minéraux circulant des racines vers les feuilles.', category: 'key_concept', importance: 'essential' }
    ],
    keyDates: [],
    formulas: [
      { formula: '6 CO₂ + 6 H₂O + Lumière → C₆H₁₂O₆ + 6 O₂', explanation: 'Équation chimique simplifiée de la photosynthèse végétale' }
    ],
    preGeneratedQuestions: [
      {
        id: 'q_svt_1',
        type: 'qcm',
        question: 'Quel gaz est absorbé par les feuilles des plantes pendant la photosynthèse ?',
        concept: 'Échanges gazeux',
        options: ['Le dioxyde de carbone (CO2)', 'Le dioxygène (O2)', 'L\'azote pur', 'Le monoxyde de carbone'],
        correctAnswer: 'Le dioxyde de carbone (CO2)',
        explanation: 'La plante capte le CO2 de l\'air pour en fixer le carbone dans le glucose, et rejette en retour de l\'O2.',
        hint: 'Le gaz à effet de serre que les plantes contribuent à recycler.'
      },
      {
        id: 'q_svt_2',
        type: 'true_false',
        question: 'La photosynthèse peut se produire en pleine nuit dans l\'obscurité totale.',
        concept: 'Conditions de la photosynthèse',
        correctAnswer: 'Faux',
        explanation: 'La photosynthèse exige impérativement de la lumière (énergie solaire) pour casser les molécules d\'eau.',
        hint: '"Photo" signifie "lumière" en grec ancien.'
      },
      {
        id: 'q_svt_3',
        type: 'fill_in_blank',
        question: 'Complète le terme biologique exact :',
        blankSentence: 'Le pigment vert qui absorbe l\'énergie lumineuse s\'appelle la ___.',
        blankOptions: ['chlorophylle', 'mélanine', 'kératine', 'glucose'],
        correctAnswer: 'chlorophylle',
        concept: 'Pigment végétal',
        explanation: 'La chlorophylle donne sa couleur verte aux feuilles et capte les longueurs d\'onde utiles.',
        hint: 'Commence par "chloro-".'
      },
      {
        id: 'q_svt_4',
        type: 'match_pairs',
        question: 'Relie chaque structure de la plante à son rôle dans la nutrition :',
        concept: 'Anatomie végétale',
        correctAnswer: 'Association complète',
        explanation: 'Chaque organe végétal coopère pour la fabrication d\'énergie vitale.',
        pairs: [
          { left: 'Racines', right: 'Puiser l\'eau et les sels minéraux' },
          { left: 'Feuilles vertes', right: 'Capter la lumière et le CO2' },
          { left: 'Chloroplastes', right: 'Lieu de réaction chimique' },
          { left: 'Stomates', right: 'Pores d\'échanges gazeux' }
        ]
      }
    ],
    profileId: 'prof_emma',
    archived: false,
    createdAt: '2026-10-04T16:20:00.000Z',
    analysisTokensSaved: 2800,
    timesPracticed: 4
  },
  {
    id: 'course_physique_gravite',
    title: 'Gravitation Universelle et Poids d\'un Corps',
    subject: 'Physique-Chimie',
    gradeLevel: '3ème (Cycle 4)',
    hash: 'mock_hash_physique_gravite_3e',
    imageUrls: ['/demo/physique.png'],
    summary: 'Deux corps massifs s\'attirent mutuellement à distance avec une force proportionnelle à leurs masses et inversement proportionnelle au carré de la distance. Distinction fondamentale entre la masse (en kg, constante) et le poids (en Newtons, dépend du lieu).',
    rawText: 'Physique-Chimie Chapitre 4 : Mécanique et Gravitation.\n1. Isaac Newton formule la loi en 1687.\n2. Relation entre Poids et Masse : P = m × g.\n- P en Newtons (N), mesuré avec un dynamomètre.\n- m en kilogrammes (kg), mesurée avec une balance.\n- g intensité de la pesanteur (sur Terre g ≈ 9.8 N/kg ou 10 N/kg).\n3. La masse ne change jamais où qu\'on aille dans l\'Univers. Le poids diminue sur la Lune car la Lune est moins massive.',
    notions: [
      { term: 'Masse', definition: 'Quantité de matière contenue dans un objet. S\'exprime en kg et ne change jamais selon l\'endroit.', category: 'definition', importance: 'essential' },
      { term: 'Poids (P)', definition: 'Force d\'attraction gravitationnelle exercée par un astre sur un objet. S\'exprime en Newtons (N).', category: 'definition', importance: 'essential' },
      { term: 'Intensité de pesanteur (g)', definition: 'Coefficient exprimé en N/kg dépendant de la masse et du rayon de l\'astre (sur Terre g ≈ 9,8 N/kg, sur la Lune g ≈ 1,6 N/kg).', category: 'key_concept', importance: 'essential' }
    ],
    keyDates: [
      { date: '1687', event: 'Publication des Principia par Isaac Newton exposant la loi de la gravitation universelle' }
    ],
    formulas: [
      { formula: 'P = m × g', explanation: 'Relation fondamentale entre Poids (N), masse (kg) et pesanteur (N/kg)' },
      { formula: 'F = G × (m₁ × m₂) / d²', explanation: 'Loi de la gravitation universelle de Newton entre deux corps distants de d' }
    ],
    preGeneratedQuestions: [
      {
        id: 'q_phys_1',
        type: 'qcm',
        question: 'Quelle est l\'unité légale du Poids dans le Système International ?',
        concept: 'Unités de mesure',
        options: ['Le Newton (N)', 'Le Kilogramme (kg)', 'Le Joule (J)', 'Le Watt (W)'],
        correctAnswer: 'Le Newton (N)',
        explanation: 'Le poids est une force d\'attraction, il se mesure en Newtons avec un dynamomètre.',
        hint: 'Nommé d\'après le savant de la pomme.'
      },
      {
        id: 'q_phys_2',
        type: 'true_false',
        question: 'Si un astronaute va sur la Lune, sa masse diminue car la Lune est plus petite.',
        concept: 'Différence Masse vs Poids',
        correctAnswer: 'Faux',
        explanation: 'La masse (en kg) ne change jamais ! C\'est son POIDS (en Newtons) qui diminue car la gravité lunaire est 6 fois plus faible.',
        hint: 'Le nombre d\'atomes dans ton corps ne s\'évapore pas dans l\'espace.'
      },
      {
        id: 'q_phys_3',
        type: 'fill_in_blank',
        question: 'Complète la formule reliant le poids et la masse :',
        blankSentence: 'La relation mathématique s\'écrit : P = m × ___.',
        blankOptions: ['g', 'd²', 'v', 't'],
        correctAnswer: 'g',
        concept: 'Formule P = m x g',
        explanation: 'P = m × g où g est l\'intensité de pesanteur en N/kg.',
        hint: 'La lettre de la pesanteur ou gravité.'
      }
    ],
    profileId: 'prof_thomas',
    archived: false,
    createdAt: '2026-10-05T11:45:00.000Z',
    analysisTokensSaved: 3500,
    timesPracticed: 5
  }
];

const INITIAL_SESSIONS: QuizSessionResult[] = [
  {
    id: 'sess_1',
    profileId: 'prof_emma',
    courseId: 'course_pythagore',
    courseTitle: 'Théorème de Pythagore et Réciproque',
    subject: 'Mathématiques',
    mode: 'timed',
    questionCount: 6,
    correctCount: 5,
    scorePercent: 83,
    xpEarned: 130,
    durationSeconds: 94,
    mistakes: [
      {
        question: 'La réciproque du théorème de Pythagore sert à calculer la longueur d\'un côté manquant.',
        studentAnswer: 'Vrai',
        correctAnswer: 'Faux',
        concept: 'Réciproque vs Théorème direct',
        explanation: 'La réciproque sert à prouver qu\'un triangle est rectangle, pas à calculer une longueur.'
      }
    ],
    createdAt: '2026-10-06T18:20:00.000Z'
  },
  {
    id: 'sess_2',
    profileId: 'prof_thomas',
    courseId: 'course_revolution',
    courseTitle: 'La Révolution Française et l\'Empire (1789-1815)',
    subject: 'Histoire-Géo',
    mode: 'zen',
    questionCount: 5,
    correctCount: 5,
    scorePercent: 100,
    xpEarned: 150,
    durationSeconds: 120,
    mistakes: [],
    createdAt: '2026-10-07T08:00:00.000Z'
  }
];

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.config) {
          parsed.config = {};
        }
        if (!parsed.config.adminPin) {
          parsed.config.adminPin = '000000';
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading db.json, reinitializing:', e);
    }

    const initial: DatabaseSchema = {
      profiles: INITIAL_PROFILES,
      courses: INITIAL_COURSES,
      sessions: INITIAL_SESSIONS,
      config: {
        aiModel: 'gemini-3.8-flash',
        totalApiCalls: 4,
        totalCacheHits: 12,
        totalTokensSaved: 13600,
        adminPin: '000000'
      }
    };
    this.saveData(initial);
    return initial;
  }

  private saveData(data: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing db.json:', err);
    }
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  public setRawData(newData: DatabaseSchema) {
    this.data = newData;
    this.saveData(this.data);
  }

  // --- Profiles ---
  public getProfiles(): StudentProfile[] {
    return this.data.profiles;
  }

  public getProfileById(id: string): StudentProfile | undefined {
    return this.data.profiles.find(p => p.id === id);
  }

  public createProfile(profile: Omit<StudentProfile, 'id' | 'xp' | 'level' | 'streakDays' | 'badges' | 'createdAt' | 'lastActiveDate'>): StudentProfile {
    const newProfile: StudentProfile = {
      ...profile,
      id: `prof_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      xp: 0,
      level: 1,
      streakDays: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      badges: [
        { id: 'b_welcome', name: 'Nouveau Héros', icon: '🌟', description: 'Profil créé, prêt à réviser !', unlockedAt: new Date().toISOString().split('T')[0] }
      ],
      createdAt: new Date().toISOString()
    };
    this.data.profiles.push(newProfile);
    this.saveData(this.data);
    return newProfile;
  }

  public updateProfile(id: string, updates: Partial<StudentProfile>): StudentProfile | null {
    const idx = this.data.profiles.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.data.profiles[idx] = { ...this.data.profiles[idx], ...updates };
    this.saveData(this.data);
    return this.data.profiles[idx];
  }

  public deleteProfile(id: string): boolean {
    const len = this.data.profiles.length;
    this.data.profiles = this.data.profiles.filter(p => p.id !== id);
    if (this.data.profiles.length < len) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public awardXp(profileId: string, amount: number): { profile: StudentProfile; levelUp: boolean } {
    const p = this.getProfileById(profileId);
    if (!p) throw new Error('Profile not found');

    const oldLevel = p.level;
    p.xp += amount;
    // Simple level curve: level N requires N * 200 XP
    p.level = Math.max(1, Math.floor(p.xp / 250) + 1);

    // Update streak if needed
    const today = new Date().toISOString().split('T')[0];
    if (p.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (p.lastActiveDate === yesterday) {
        p.streakDays += 1;
      } else {
        p.streakDays = 1;
      }
      p.lastActiveDate = today;
    }

    const levelUp = p.level > oldLevel;
    this.saveData(this.data);
    return { profile: p, levelUp };
  }

  // --- Courses & Caching ---
  public getCourses(includeArchived = false): Course[] {
    if (includeArchived) return this.data.courses;
    return this.data.courses.filter(c => !c.archived);
  }

  public getCourseById(id: string): Course | undefined {
    return this.data.courses.find(c => c.id === id);
  }

  public findCourseByHash(hash: string): Course | undefined {
    return this.data.courses.find(c => c.hash === hash);
  }

  public addCourse(course: Course): Course {
    this.data.courses.unshift(course);
    this.data.config.totalApiCalls += 1;
    this.saveData(this.data);
    return course;
  }

  public recordCacheHit(courseId: string, tokensSaved = 3200): Course | undefined {
    const course = this.getCourseById(courseId);
    if (course) {
      course.analysisTokensSaved = (course.analysisTokensSaved || 0) + tokensSaved;
      this.data.config.totalCacheHits += 1;
      this.data.config.totalTokensSaved += tokensSaved;
      this.saveData(this.data);
    }
    return course;
  }

  public updateCourse(id: string, updates: Partial<Course>): Course | null {
    const idx = this.data.courses.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.courses[idx] = { ...this.data.courses[idx], ...updates };
    this.saveData(this.data);
    return this.data.courses[idx];
  }

  public deleteCourse(id: string): boolean {
    const idx = this.data.courses.findIndex(c => c.id === id);
    if (idx === -1) return false;
    const [removed] = this.data.courses.splice(idx, 1);
    // Optionally delete uploaded files
    if (removed && removed.imageUrls) {
      for (const imgUrl of removed.imageUrls) {
        if (imgUrl.startsWith('/uploads/')) {
          const filePath = path.join(UPLOADS_DIR, path.basename(imgUrl));
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (_) {}
          }
        }
      }
    }
    this.saveData(this.data);
    return true;
  }

  public incrementCoursePractice(id: string): void {
    const course = this.getCourseById(id);
    if (course) {
      course.timesPracticed = (course.timesPracticed || 0) + 1;
      this.saveData(this.data);
    }
  }

  // --- Sessions & Activity ---
  public getSessions(limit = 50): QuizSessionResult[] {
    return [...this.data.sessions].reverse().slice(0, limit);
  }

  public recordSession(session: QuizSessionResult): void {
    this.data.sessions.push(session);
    this.incrementCoursePractice(session.courseId);
    this.saveData(this.data);
  }

  // --- Stats for Admin Supervision ---
  public getAdminStats(): AdminStats {
    const totalAnalyses = this.data.config.totalApiCalls + this.data.config.totalCacheHits;
    const cacheHits = this.data.config.totalCacheHits;
    const tokensSavedEstimated = this.data.config.totalTokensSaved;
    const totalCourses = this.data.courses.length;
    const totalProfiles = this.data.profiles.length;
    const totalQuizSessions = this.data.sessions.length;

    let avgScore = 0;
    if (totalQuizSessions > 0) {
      const sum = this.data.sessions.reduce((acc, s) => acc + s.scorePercent, 0);
      avgScore = Math.round(sum / totalQuizSessions);
    }

    const subjectDistribution: Record<string, number> = {};
    for (const c of this.data.courses) {
      subjectDistribution[c.subject] = (subjectDistribution[c.subject] || 0) + 1;
    }

    // Aggregate mistakes
    const conceptMistakeCount: Record<string, { count: number; subject: string }> = {};
    for (const s of this.data.sessions) {
      for (const m of s.mistakes) {
        const key = m.concept || 'Concept général';
        if (!conceptMistakeCount[key]) {
          conceptMistakeCount[key] = { count: 0, subject: s.subject };
        }
        conceptMistakeCount[key].count += 1;
      }
    }

    const difficultConcepts = Object.entries(conceptMistakeCount)
      .map(([concept, data]) => ({ concept, count: data.count, subject: data.subject }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalAnalyses,
      cacheHits,
      tokensSavedEstimated,
      totalCourses,
      totalProfiles,
      totalQuizSessions,
      avgScore,
      subjectDistribution,
      difficultConcepts
    };
  }

  // --- Config ---
  public getConfig(): AppConfig {
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const hasOpenAiKey = !!process.env.OPENAI_API_KEY;
    const hasApiKey = hasGeminiKey || hasAnthropicKey || hasOpenAiKey;

    let defaultProvider: 'gemini' | 'anthropic' | 'openai' = 'gemini';
    if (this.data.config.aiProvider) {
      defaultProvider = this.data.config.aiProvider;
    } else if (hasAnthropicKey && !hasGeminiKey) {
      defaultProvider = 'anthropic';
    } else if (hasOpenAiKey && !hasGeminiKey) {
      defaultProvider = 'openai';
    }

    return {
      aiModel: this.data.config.aiModel || (defaultProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : defaultProvider === 'openai' ? 'gpt-4o' : 'gemini-3.8-flash'),
      aiProvider: defaultProvider,
      hasApiKey,
      hasGeminiKey,
      hasAnthropicKey,
      hasOpenAiKey,
      totalApiCalls: this.data.config.totalApiCalls,
      totalCacheHits: this.data.config.totalCacheHits,
      totalTokensSaved: this.data.config.totalTokensSaved,
    };
  }

  public getAdminPin(): string {
    return this.data.config.adminPin || '000000';
  }

  public updateAdminPin(newPin: string): void {
    this.data.config.adminPin = newPin;
    this.saveData(this.data);
  }

  public updateConfig(updates: Partial<{ aiModel: string; aiProvider: 'gemini' | 'anthropic' | 'openai' }>) {
    if (updates.aiModel) {
      this.data.config.aiModel = updates.aiModel;
    }
    if (updates.aiProvider) {
      this.data.config.aiProvider = updates.aiProvider;
    }
    this.saveData(this.data);
    return this.getConfig();
  }
}

export const db = new Database();

export function computeSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
