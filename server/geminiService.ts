import { GoogleGenAI, Type } from '@google/genai';
import { Course, CourseNotion, QuizQuestion, AIProvider } from '../src/types/index.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

function extractCleanJson(raw: string): any {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

function isTransientError(err: any): boolean {
  const msg = (err?.message || err?.statusText || JSON.stringify(err) || '').toLowerCase();
  const status = err?.status || err?.code || err?.statusCode || 0;
  return (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    status === 504 ||
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('spikes in demand') ||
    msg.includes('overloaded') ||
    msg.includes('rate limit') ||
    msg.includes('resource_exhausted')
  );
}

// Resilient Gemini runner with retries and model fallbacks
async function executeWithRetryAndFallback<T>(
  preferredModel: string,
  operation: (modelName: string) => Promise<T>
): Promise<T> {
  const candidateModels = [
    preferredModel || 'gemini-3.8-flash',
    preferredModel !== 'gemini-3.1-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash',
    'gemini-flash-latest',
  ];

  const uniqueModels = Array.from(new Set(candidateModels));
  let lastError: any = null;

  for (const model of uniqueModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await operation(model);
      } catch (err: any) {
        lastError = err;
        const transient = isTransientError(err);
        console.warn(`[PizaLearn IA] Tentative ${attempt}/2 sur ${model} échouée (transient: ${transient}) :`, err?.message || err);

        if (!transient) {
          throw err;
        }

        const delay = attempt * 1500;
        await sleep(delay);
      }
    }
    console.warn(`[PizaLearn IA Fallback] Le modèle ${model} connaît une forte affluence (503). Bascule vers modèle alternatif...`);
  }

  throw new Error(
    "Les serveurs d'IA Google connaissent actuellement une saturation temporaire (Erreur 503 : forte demande). L'application a effectué 4 tentatives automatiques avec bascule de modèle. Veuillez patienter 1 à 2 minutes avant de relancer l'analyse ou utiliser vos cours en cache local."
  );
}

// ----------------------------------------------------
// Anthropic Claude 3.5 Integration (Native REST Fetch)
// ----------------------------------------------------
async function callClaudeMessages({
  model = 'claude-3-5-sonnet-20241022',
  prompt,
  images,
}: {
  model?: string;
  prompt: string;
  images?: Array<{ buffer: Buffer; mimetype: string }>;
}): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("La clé ANTHROPIC_API_KEY n'est pas configurée dans le fichier .env.");
  }

  const contentParts: any[] = [];
  if (images && images.length > 0) {
    for (const img of images) {
      contentParts.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mimetype || 'image/jpeg',
          data: img.buffer.toString('base64'),
        },
      });
    }
  }
  contentParts.push({
    type: 'text',
    text: `${prompt}\n\nIMPORTANT: Réponds STRICTEMENT avec un JSON valide, sans texte d'introduction ni balises markdown additionnelles.`,
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model.startsWith('claude') ? model : 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{ role: 'user', content: contentParts }],
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Erreur API Claude (${res.status})`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Claude n'a retourné aucune réponse pour l'analyse.");
  return extractCleanJson(text);
}

// ----------------------------------------------------
// OpenAI GPT-4o Integration (Native REST Fetch)
// ----------------------------------------------------
async function callOpenAiChat({
  model = 'gpt-4o',
  prompt,
  images,
}: {
  model?: string;
  prompt: string;
  images?: Array<{ buffer: Buffer; mimetype: string }>;
}): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("La clé OPENAI_API_KEY n'est pas configurée dans le fichier .env.");
  }

  const contentParts: any[] = [{ type: 'text', text: prompt }];
  if (images && images.length > 0) {
    for (const img of images) {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:${img.mimetype || 'image/jpeg'};base64,${img.buffer.toString('base64')}`,
        },
      });
    }
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model.startsWith('gpt') ? model : 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: contentParts }],
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Erreur API OpenAI (${res.status})`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI n'a retourné aucune réponse pour l'analyse.");
  return extractCleanJson(text);
}

interface AnalyzeImagesInput {
  files: Array<{ buffer: Buffer; mimetype: string; filename: string }>;
  userTitle?: string;
  userSubject?: string;
  gradeLevel?: string;
  modelName?: string;
  provider?: AIProvider;
}

export async function analyzeCourseImages({
  files,
  userTitle,
  userSubject,
  gradeLevel,
  modelName = 'gemini-3.8-flash',
  provider = 'gemini',
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

Réponds STRICTEMENT sous forme de JSON valide avec les clés :
"title", "subject", "gradeLevel", "summary", "rawText", "notions" (tableau d'objets term, definition, category, importance), "keyDates" (tableau date, event), "formulas" (tableau formula, explanation), "questions" (tableau d'objets id, type, question, concept, options, correctAnswer, explanation, hint, blankSentence, blankOptions, pairs, flashcardFront, flashcardBack).`;

  let parsed: any;

  const resolvedProvider: AIProvider =
    provider ||
    (modelName.startsWith('claude') ? 'anthropic' : modelName.startsWith('gpt') ? 'openai' : 'gemini');

  if (resolvedProvider === 'anthropic' || modelName.startsWith('claude')) {
    parsed = await callClaudeMessages({
      model: modelName,
      prompt: promptText,
      images: files,
    });
  } else if (resolvedProvider === 'openai' || modelName.startsWith('gpt')) {
    parsed = await callOpenAiChat({
      model: modelName,
      prompt: promptText,
      images: files,
    });
  } else {
    // Default Google Gemini via SDK with 503 fallback
    const ai = getAiClient();
    const imageParts = files.map((file) => ({
      inlineData: {
        mimeType: file.mimetype || 'image/jpeg',
        data: file.buffer.toString('base64'),
      },
    }));

    parsed = await executeWithRetryAndFallback(modelName, async (activeModel) => {
      const response = await ai.models.generateContent({
        model: activeModel,
        contents: {
          parts: [...imageParts, { text: promptText }],
        },
        config: {
          systemInstruction:
            'Tu es un tuteur scolaire bienveillant et stimulant pour ados. Réponds exclusivement en français au format JSON structuré.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subject: { type: Type.STRING },
              gradeLevel: { type: Type.STRING },
              summary: { type: Type.STRING },
              rawText: { type: Type.STRING },
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
                    type: {
                      type: Type.STRING,
                      enum: ['qcm', 'fill_in_blank', 'true_false', 'flashcard', 'match_pairs'],
                    },
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
      if (!text) throw new Error("L'IA n'a retourné aucun contenu pour l'analyse.");
      return JSON.parse(text);
    });
  }

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
  provider = 'gemini',
}: {
  course: Course;
  formats: string[];
  count: number;
  modelName?: string;
  provider?: AIProvider;
}): Promise<QuizQuestion[]> {
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
Pour les match_pairs : 4 paires terme-définition distinctes.
Réponds avec un tableau JSON d'objets questions.`;

  let parsed: any;
  const resolvedProvider: AIProvider =
    provider ||
    (modelName.startsWith('claude') ? 'anthropic' : modelName.startsWith('gpt') ? 'openai' : 'gemini');

  if (resolvedProvider === 'anthropic' || modelName.startsWith('claude')) {
    parsed = await callClaudeMessages({
      model: modelName,
      prompt,
    });
  } else if (resolvedProvider === 'openai' || modelName.startsWith('gpt')) {
    parsed = await callOpenAiChat({
      model: modelName,
      prompt,
    });
  } else {
    const ai = getAiClient();
    parsed = await executeWithRetryAndFallback(modelName, async (activeModel) => {
      const response = await ai.models.generateContent({
        model: activeModel,
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
                type: {
                  type: Type.STRING,
                  enum: ['qcm', 'fill_in_blank', 'true_false', 'flashcard', 'match_pairs'],
                },
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
      return JSON.parse(text);
    });
  }

  const questions: QuizQuestion[] = Array.isArray(parsed) ? parsed : [];
  return questions.map((q, i) => ({
    ...q,
    id: q.id || `cust_q_${Date.now()}_${i}`,
  }));
}
