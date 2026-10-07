import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';
import { db, computeSha256, UPLOADS_DIR } from './server/db.js';
import { analyzeCourseImages, generateCustomQuestionsForCourse } from './server/geminiService.js';
import { Course, QuizQuestion } from './src/types/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const GLOBAL_PASSPHRASE = 'PIZA-HOUSE';
const ADMIN_PIN = process.env.ADMIN_PIN || '000000';

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 6 }, // 20MB per photo
});

// Gatekeeper Middleware for API routes
const checkGatekeeper = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers['x-piza-key'] || req.headers['authorization'];
  if (token === GLOBAL_PASSPHRASE || token === 'Bearer PIZA-HOUSE' || token === 'piza_session_valid') {
    return next();
  }
  return res.status(401).json({ error: 'Accès verrouillé. Clé de sécurité requise.' });
};

// Admin Middleware
const checkAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const adminToken = req.headers['x-admin-key'];
  const currentPin = db.getAdminPin();
  if (adminToken === currentPin || adminToken === 'piza_admin_valid') {
    return next();
  }
  return res.status(403).json({ error: 'Accès administrateur refusé. Code PIN incorrect.' });
};

// ----------------------------------------------------
// Public Authentication endpoints
// ----------------------------------------------------
app.post('/api/auth/gatekeeper', (req, res) => {
  const { passphrase } = req.body;
  if (!passphrase || typeof passphrase !== 'string') {
    return res.status(400).json({ error: 'Veuillez saisir la clé de sécurité.' });
  }

  const cleanPass = passphrase.trim();
  if (cleanPass === GLOBAL_PASSPHRASE) {
    return res.json({
      success: true,
      token: 'piza_session_valid',
      message: 'Accès autorisé ! Bienvenue sur PizaLearn.',
    });
  }

  return res.status(401).json({ error: 'Clé de sécurité incorrecte.' });
});

app.post('/api/auth/admin', checkGatekeeper, (req, res) => {
  const { pin } = req.body;
  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ error: 'Veuillez saisir le code administrateur.' });
  }

  const cleanPin = pin.trim();
  const validPin = db.getAdminPin();
  if (cleanPin === validPin) {
    return res.json({
      success: true,
      adminToken: 'piza_admin_valid',
      message: 'Authentification superviseur validée.',
    });
  }

  return res.status(403).json({ error: 'Code administrateur incorrect.' });
});

app.post('/api/admin/change-pin', checkGatekeeper, checkAdmin, (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!currentPin || !newPin) {
    return res.status(400).json({ error: 'Veuillez renseigner l\'ancien et le nouveau code PIN.' });
  }

  const stored = db.getAdminPin();
  if (currentPin.trim() !== stored) {
    return res.status(400).json({ error: 'Le code PIN actuel est incorrect.' });
  }

  const cleanNew = newPin.trim();
  if (cleanNew.length < 4) {
    return res.status(400).json({ error: 'Le nouveau code PIN doit comporter au moins 4 chiffres.' });
  }

  db.updateAdminPin(cleanNew);
  return res.json({ success: true, message: 'Le code PIN superviseur a été modifié avec succès.' });
});

// ----------------------------------------------------
// Protected API Routes (require PIZA-HOUSE gatekeeper)
// ----------------------------------------------------

// 1. Profiles
app.get('/api/profiles', checkGatekeeper, (req, res) => {
  res.json(db.getProfiles());
});

app.post('/api/profiles', checkGatekeeper, (req, res) => {
  const { name, avatar, grade } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Le prénom ou pseudonyme de l\'élève est requis.' });
  }
  const profile = db.createProfile({
    name: name.trim(),
    avatar: avatar || '🎓',
    grade: grade || '4ème',
  });
  res.json(profile);
});

app.put('/api/profiles/:id', checkGatekeeper, (req, res) => {
  const updated = db.updateProfile(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Profil introuvable.' });
  res.json(updated);
});

app.delete('/api/profiles/:id', checkGatekeeper, (req, res) => {
  const success = db.deleteProfile(req.params.id);
  if (!success) return res.status(404).json({ error: 'Profil introuvable.' });
  res.json({ success: true });
});

// 2. Courses & Analysis (with OCR + SHA-256 local caching)
app.get('/api/courses', checkGatekeeper, (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  const profileId = req.query.profileId as string | undefined;

  let courses = db.getCourses(includeArchived);
  if (profileId) {
    courses = courses.filter(c => !c.profileId || c.profileId === profileId);
  }
  res.json(courses);
});

app.get('/api/courses/:id', checkGatekeeper, (req, res) => {
  const course = db.getCourseById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Cours introuvable.' });
  res.json(course);
});

// Upload and analyze photos (or use cache if hash matches)
app.post('/api/courses/analyze', checkGatekeeper, upload.array('photos', 6), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { title, subject, gradeLevel, profileId } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Veuillez téléverser au moins une photo de cours.' });
    }

    // 1. Calculate combined SHA-256 hash of all images to check local cache
    const combinedBuffer = Buffer.concat(files.map(f => f.buffer));
    const contentHash = computeSha256(combinedBuffer);

    // Check if course already exists in local cache
    const cachedCourse = db.findCourseByHash(contentHash);
    if (cachedCourse) {
      const updatedCache = db.recordCacheHit(cachedCourse.id, 3500);
      return res.json({
        course: { ...(updatedCache || cachedCourse), fromCache: true },
        fromCache: true,
        message: 'Cours instantanément extrait de la mémoire locale (0 jeton dépensé, économie maximale) !',
      });
    }

    // 2. Save uploaded files to /data/uploads
    const savedUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = path.extname(f.originalname) || '.jpg';
      const filename = `photo_${Date.now()}_${i}${ext}`;
      const destPath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(destPath, f.buffer);
      savedUrls.push(`/uploads/${filename}`);
    }

    // 3. Multimodal AI Analysis with Gemini
    const config = db.getConfig();
    const analysisResult = await analyzeCourseImages({
      files: files.map(f => ({
        buffer: f.buffer,
        mimetype: f.mimetype || 'image/jpeg',
        filename: f.originalname,
      })),
      userTitle: title,
      userSubject: subject,
      gradeLevel: gradeLevel,
      modelName: config.aiModel,
    });

    const newCourse: Course = {
      id: `course_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: analysisResult.title,
      subject: analysisResult.subject,
      gradeLevel: analysisResult.gradeLevel,
      hash: contentHash,
      imageUrls: savedUrls,
      summary: analysisResult.summary,
      rawText: analysisResult.rawText,
      notions: analysisResult.notions,
      keyDates: analysisResult.keyDates,
      formulas: analysisResult.formulas,
      preGeneratedQuestions: analysisResult.questions,
      profileId: profileId || null,
      archived: false,
      createdAt: new Date().toISOString(),
      analysisTokensSaved: 0,
      timesPracticed: 0,
    };

    db.addCourse(newCourse);

    return res.json({
      course: newCourse,
      fromCache: false,
      message: 'Analyse IA réussie ! Notions, dates, formules et quiz générés avec succès.',
    });
  } catch (error: any) {
    console.error('Course analysis error:', error);
    return res.status(500).json({
      error: error?.message || 'Erreur lors de l\'analyse du cours. Vérifiez la clé API ou la clarté de la photo.',
    });
  }
});

// Generate or assemble interactive quiz questions for a course
app.post('/api/courses/:id/generate-quiz', checkGatekeeper, async (req, res) => {
  try {
    const course = db.getCourseById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Cours introuvable.' });

    const { formats = ['qcm', 'true_false', 'fill_in_blank', 'flashcard', 'match_pairs'], count = 10 } = req.body;
    const requestedFormats: string[] = Array.isArray(formats) && formats.length > 0
      ? formats
      : ['qcm', 'true_false', 'fill_in_blank', 'flashcard', 'match_pairs'];
    const targetCount = Math.max(3, Math.min(25, Number(count) || 10));

    // Filter available pre-generated questions matching requested formats
    const matchedQuestions = (course.preGeneratedQuestions || []).filter(q =>
      requestedFormats.includes(q.type)
    );

    // If we have enough matched questions, shuffle and pick
    if (matchedQuestions.length >= targetCount) {
      const shuffled = [...matchedQuestions].sort(() => 0.5 - Math.random()).slice(0, targetCount);
      return res.json({ questions: shuffled, source: 'preGenerated' });
    }

    // If we have some questions but need more and have API Key, try generating supplementary ones
    if (process.env.GEMINI_API_KEY && matchedQuestions.length < targetCount) {
      try {
        const config = db.getConfig();
        const needed = targetCount - matchedQuestions.length;
        const extraQuestions = await generateCustomQuestionsForCourse({
          course,
          formats: requestedFormats,
          count: needed,
          modelName: config.aiModel,
        });

        const combined = [...matchedQuestions, ...extraQuestions].sort(() => 0.5 - Math.random());
        // Cache new questions on course
        course.preGeneratedQuestions = [...course.preGeneratedQuestions, ...extraQuestions];
        db.updateCourse(course.id, { preGeneratedQuestions: course.preGeneratedQuestions });

        return res.json({ questions: combined.slice(0, targetCount), source: 'aiGenerated' });
      } catch (aiErr) {
        console.warn('AI quiz generation fallback to available questions:', aiErr);
      }
    }

    // Fallback: return what we have (even if slightly fewer) or duplicate with varied order
    const fallbackList: QuizQuestion[] = [];
    if (matchedQuestions.length > 0) {
      while (fallbackList.length < targetCount) {
        for (const q of matchedQuestions) {
          fallbackList.push({
            ...q,
            id: `${q.id}_repeat_${fallbackList.length}`,
          });
          if (fallbackList.length >= targetCount) break;
        }
      }
    } else {
      // Create instant fallback questions from notions
      for (let i = 0; i < Math.min(course.notions.length, targetCount); i++) {
        const notion = course.notions[i];
        fallbackList.push({
          id: `notion_q_${i}`,
          type: 'qcm',
          question: `Quelle est la définition exacte du terme "${notion.term}" ?`,
          concept: notion.term,
          options: [
            notion.definition,
            `Une hypothèse non vérifiée concernant ${course.title}.`,
            `L'inverse d'un principe fondamental de ${course.subject}.`,
            `Une date de transition historique sans lien direct.`
          ].sort(() => 0.5 - Math.random()),
          correctAnswer: notion.definition,
          explanation: `${notion.term} : ${notion.definition}`,
          hint: `Rappelle-toi du mot clé principal : ${notion.term}.`
        });
      }
    }

    return res.json({ questions: fallbackList.slice(0, targetCount), source: 'notionsConstructed' });
  } catch (err: any) {
    console.error('Quiz generation error:', err);
    res.status(500).json({ error: 'Erreur lors de la génération du quiz.' });
  }
});

app.put('/api/courses/:id', checkGatekeeper, (req, res) => {
  const updated = db.updateCourse(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Cours introuvable.' });
  res.json(updated);
});

app.delete('/api/courses/:id', checkGatekeeper, (req, res) => {
  const success = db.deleteCourse(req.params.id);
  if (!success) return res.status(404).json({ error: 'Cours introuvable.' });
  res.json({ success: true });
});

// 3. Quiz Activity & Gamification (XP, Badges, Streaks)
app.get('/api/activity', checkGatekeeper, (req, res) => {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  res.json(db.getSessions(limit));
});

app.post('/api/activity', checkGatekeeper, (req, res) => {
  try {
    const {
      profileId,
      courseId,
      courseTitle,
      subject,
      mode,
      questionCount,
      correctCount,
      scorePercent,
      xpEarned,
      durationSeconds,
      mistakes,
    } = req.body;

    if (!profileId || !courseId) {
      return res.status(400).json({ error: 'Profil et Cours requis.' });
    }

    const sessionResult = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      profileId,
      courseId,
      courseTitle: courseTitle || 'Cours révisé',
      subject: subject || 'Général',
      mode: mode || 'zen',
      questionCount: Number(questionCount) || 1,
      correctCount: Number(correctCount) || 0,
      scorePercent: Number(scorePercent) || 0,
      xpEarned: Number(xpEarned) || 50,
      durationSeconds: Number(durationSeconds) || 60,
      mistakes: Array.isArray(mistakes) ? mistakes : [],
      createdAt: new Date().toISOString(),
    };

    db.recordSession(sessionResult);

    // Award XP to profile & check level up & badges
    const { profile, levelUp } = db.awardXp(profileId, sessionResult.xpEarned);

    // Check unlocked badges
    const newlyUnlockedBadges = [];
    if (profile.xp >= 500 && !profile.badges.some(b => b.id === 'b_xp_500')) {
      const badge = { id: 'b_xp_500', name: 'Élève Assidu', icon: '⭐', description: '500 XP cumulés !', unlockedAt: new Date().toISOString().split('T')[0] };
      profile.badges.push(badge);
      newlyUnlockedBadges.push(badge);
    }
    if (profile.xp >= 1500 && !profile.badges.some(b => b.id === 'b_xp_1500')) {
      const badge = { id: 'b_xp_1500', name: 'Génie en Herbe', icon: '👑', description: '1500 XP cumulés ! Champion !', unlockedAt: new Date().toISOString().split('T')[0] };
      profile.badges.push(badge);
      newlyUnlockedBadges.push(badge);
    }
    if (sessionResult.scorePercent === 100 && !profile.badges.some(b => b.id === 'b_perfect')) {
      const badge = { id: 'b_perfect', name: 'Sans Faute', icon: '🎯', description: '100% de bonnes réponses sur un quiz !', unlockedAt: new Date().toISOString().split('T')[0] };
      profile.badges.push(badge);
      newlyUnlockedBadges.push(badge);
    }
    if (sessionResult.mode === 'timed' && sessionResult.scorePercent >= 80 && !profile.badges.some(b => b.id === 'b_speed')) {
      const badge = { id: 'b_speed', name: 'Éclair Vivant', icon: '⚡', description: 'Score élevé en mode Contre-la-montre !', unlockedAt: new Date().toISOString().split('T')[0] };
      profile.badges.push(badge);
      newlyUnlockedBadges.push(badge);
    }

    db.updateProfile(profile.id, { badges: profile.badges });

    res.json({
      session: sessionResult,
      profile,
      levelUp,
      newBadges: newlyUnlockedBadges,
    });
  } catch (err: any) {
    console.error('Session record error:', err);
    res.status(500).json({ error: 'Erreur d\'enregistrement de la session.' });
  }
});

// 4. Admin Supervision & Stats
app.get('/api/admin/stats', checkGatekeeper, checkAdmin, (req, res) => {
  res.json(db.getAdminStats());
});

app.get('/api/admin/config', checkGatekeeper, (req, res) => {
  res.json(db.getConfig());
});

app.post('/api/admin/config', checkGatekeeper, checkAdmin, (req, res) => {
  const { aiModel } = req.body;
  const updated = db.updateConfig({ aiModel });
  res.json(updated);
});

app.get('/api/admin/export', checkGatekeeper, checkAdmin, (req, res) => {
  const data = db.getRawData();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=pizalearn-backup-${Date.now()}.json`);
  res.send(JSON.stringify(data, null, 2));
});

app.post('/api/admin/import', checkGatekeeper, checkAdmin, (req, res) => {
  try {
    const raw = req.body;
    if (!raw || !Array.isArray(raw.courses) || !Array.isArray(raw.profiles)) {
      return res.status(400).json({ error: 'Format de sauvegarde JSON invalide.' });
    }
    db.setRawData(raw);
    res.json({ success: true, message: 'Données restaurées avec succès.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erreur lors de la restauration des données.' });
  }
});

// ----------------------------------------------------
// Frontend Mounting: Vite dev server vs static build
// ----------------------------------------------------
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur PizaLearn démarré avec succès sur http://localhost:${PORT}`);
    console.log(`🔒 Clé globale d'accès : ${GLOBAL_PASSPHRASE}`);
    console.log(`🛡️ Code Superviseur / Admin : ${ADMIN_PIN}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
