import { GoogleGenAI, Type } from '@google/genai';
import { Course, CourseNotion, QuizQuestion } from '../src/types/index.js';

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

interface AnalyzeImagesInput {
  files: Array<{ buffer: Buffer; mimetype: string; filename: string }>;
  userTitle?: string;
  userSubject?: string;
  gradeLevel?: string;
  modelName?: string;
}

export async function analyzeCourseImages({
  files,
  userTitle,
  userSubject,
  gradeLevel,
  modelName = 'gemini-3.8-flash',
}: AnalyzeImagesInput): Promise<{
  title: string;
  subject: string;
  gradeLevel: string;
  summary: string;
  rawText: string;
  notions: CourseNotion[];
  keyDates: Array<{ date: string; event: string }>;
  formulas: Array<{ formula: string; explanation: string }>;
  questions: QuizQuestion[];
}> {
  const ai = getAiClient();

  const imageParts = files.map(file => ({
    inlineData: {
      mimeType: file.mimetype || 'image/jpeg',
      data: file.buffer.toString('base64'),
    },
  }));

  const promptText = `Tu es un professeur expert en pédagogie EdTech pour collégiens et lycéens (élèves de 11 à 17 ans).
Analyse ces photos de cahiers/cours/manuels scolaires manuscrits ou imprimés.

Tâches impératives :
1. OCR & Transcription : Déchiffre le texte même si l'écriture est manuscrite ou penchée.
2. Détermine le titre exact du cours, la matière scolaire (ex: Mathématiques, Histoire-Géo, SVT, Physique-Chimie, Français, Anglais, Philosophie) et le niveau estimé (${gradeLevel || 'Collège/Lycée'}).
3. Rédige un résumé clair, engageant et vulgarisé pour un adolescent de 11 à 17 ans (pas de jargon inutile, explications concrètes).
4. Extrais les notions clés (terme + définition accessible, catégorie 'definition' | 'formula' | 'date' | 'key_concept', importance 'essential' | 'bonus').
5. Extrais les dates historiques importantes (si applicable).
6. Extrais les formules scientifiques ou mathématiques avec explications claires (si applicable).
7. Génère au minimum 10 questions interactives prêtes pour les mini-jeux, couvrant impérativement :
   - Des QCM (avec 4 options crédibles, l'explication du bon choix, et un indice 'hint')
   - Des Vrai / Faux (avec question piège et justification 'explanation')
   - Des Textes à trous ('fill_in_blank' avec 'blankSentence' contenant "___", 'blankOptions' avec 4 choix de mots, et 'correctAnswer')
   - Des Flashcards ('flashcardFront' et 'flashcardBack')
   - Des Associations de paires ('match_pairs' avec 4 paires { left: 'terme', right: 'définition' })

${userTitle ? `Titre suggéré par l'élève : "${userTitle}".` : ''}
${userSubject ? `Matière suggérée : "${userSubject}".` : ''}

Réponds STRICTEMENT sous forme de JSON valide conforme au schéma demandé.`;

  const response = await ai.models.generateContent({
    model: modelName || 'gemini-3.8-flash',
    contents: {
      parts: [...imageParts, { text: promptText }],
    },
    config: {
      systemInstruction: 'Tu es un tuteur scolaire bienveillant et stimulant pour ados. Réponds exclusivement en français au format JSON structuré.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Titre clair du cours' },
          subject: { type: Type.STRING, description: 'Matière (Mathématiques, Histoire-Géo, SVT, Physique-Chimie, Français, etc.)' },
          gradeLevel: { type: Type.STRING, description: 'Niveau (ex: 4ème, 3ème, Seconde)' },
          summary: { type: Type.STRING, description: 'Résumé pédagogique accessible aux adolescents' },
          rawText: { type: Type.STRING, description: 'Transcription textuelle des notes' },
          notions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                definition: { type: Type.STRING },
                category: { type: Type.STRING, enum: ['definition', 'formula', 'date', 'key_concept'] },
                importance: { type: Type.STRING, enum: ['essential', 'bonus'] },
              },
              required: ['term', 'definition', 'category', 'importance'],
            },
          },
          keyDates: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                event: { type: Type.STRING },
              },
              required: ['date', 'event'],
            },
          },
          formulas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                formula: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ['formula', 'explanation'],
            },
          },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['qcm', 'fill_in_blank', 'true_false', 'flashcard', 'match_pairs'] },
                question: { type: Type.STRING },
                concept: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING },
                hint: { type: Type.STRING },
                blankSentence: { type: Type.STRING },
                blankOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                pairs: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      left: { type: Type.STRING },
                      right: { type: Type.STRING },
                    },
                    required: ['left', 'right'],
                  },
                },
                flashcardFront: { type: Type.STRING },
                flashcardBack: { type: Type.STRING },
              },
              required: ['id', 'type', 'question', 'concept', 'correctAnswer', 'explanation'],
            },
          },
        },
        required: ['title', 'subject', 'gradeLevel', 'summary', 'rawText', 'notions', 'questions'],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("L'IA n'a retourné aucun contenu pour l'analyse.");
  }

  const parsed = JSON.parse(text);

  // Normalize questions with unique IDs
  const questions: QuizQuestion[] = (parsed.questions || []).map((q: any, i: number) => ({
    ...q,
    id: q.id || `gen_q_${Date.now()}_${i}`,
  }));

  return {
    title: parsed.title || userTitle || 'Cours analysé',
    subject: parsed.subject || userSubject || 'Général',
    gradeLevel: parsed.gradeLevel || gradeLevel || 'Collège/Lycée',
    summary: parsed.summary || 'Résumé en cours de consolidation.',
    rawText: parsed.rawText || '',
    notions: parsed.notions || [],
    keyDates: parsed.keyDates || [],
    formulas: parsed.formulas || [],
    questions,
  };
}

export async function generateCustomQuestionsForCourse({
  course,
  formats,
  count,
  modelName = 'gemini-3.8-flash',
}: {
  course: Course;
  formats: string[];
  count: number;
  modelName?: string;
}): Promise<QuizQuestion[]> {
  const ai = getAiClient();

  const prompt = `À partir du cours suivant :
Titre : ${course.title}
Matière : ${course.subject} (${course.gradeLevel})
Résumé : ${course.summary}
Notions : ${JSON.stringify(course.notions)}
Dates : ${JSON.stringify(course.keyDates)}
Formules : ${JSON.stringify(course.formulas)}

Génère exactement ${count} questions interactives de révision pour ados.
Formats demandés exclusivement parmi : ${formats.join(', ')}.
Garantis une variété de formats, des explications motivantes et pédagogiques.
Pour les QCM : 4 choix distincts, l'un est la bonne réponse.
Pour les Vrai/Faux : question affirmative, réponse "Vrai" ou "Faux", explication détaillée.
Pour les Textes à trous (fill_in_blank) : phrase avec "___", 4 mots au choix dans blankOptions.
Pour les flashcards : recto et verso clairs.
Pour les match_pairs : 4 paires terme-définition distinctes.`;

  const response = await ai.models.generateContent({
    model: modelName || 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: 'Tu es un enseignant ludique pour collégiens et lycéens. Génère uniquement un JSON structuré.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['qcm', 'fill_in_blank', 'true_false', 'flashcard', 'match_pairs'] },
            question: { type: Type.STRING },
            concept: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            hint: { type: Type.STRING },
            blankSentence: { type: Type.STRING },
            blankOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            pairs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  left: { type: Type.STRING },
                  right: { type: Type.STRING },
                },
                required: ['left', 'right'],
              },
            },
            flashcardFront: { type: Type.STRING },
            flashcardBack: { type: Type.STRING },
          },
          required: ['id', 'type', 'question', 'concept', 'correctAnswer', 'explanation'],
        },
      },
    },
  });

  const text = response.text;
  if (!text) return [];

  const questions: QuizQuestion[] = JSON.parse(text);
  return questions.map((q, i) => ({
    ...q,
    id: q.id || `cust_q_${Date.now()}_${i}`,
  }));
}
