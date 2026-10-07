/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { GatekeeperModal } from './components/GatekeeperModal.js';
import { CourseLibrary } from './components/CourseLibrary.js';
import { CourseScanner } from './components/CourseScanner.js';
import { CourseDetailModal } from './components/CourseDetailModal.js';
import { QuizLauncher } from './components/QuizLauncher.js';
import { GameArena } from './components/GameArena.js';
import { ProfileHub } from './components/ProfileHub.js';
import { AdminPanel } from './components/AdminPanel.js';
import { CreateProfileModal } from './components/CreateProfileModal.js';
import { Course, GameMode, QuestionFormat, StudentProfile } from './types/index.js';
import { api, getStoredKey, getStoredProfileId, setStoredProfileId, clearStoredKey } from './utils/api.js';

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Active navigation tab
  const [currentTab, setCurrentTab] = useState<'courses' | 'scan' | 'quiz' | 'profile' | 'admin'>('courses');

  // App data
  const [courses, setCourses] = useState<Course[]>([]);
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<StudentProfile | null>(null);

  // Modals & Active Game states
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState<Course | null>(null);
  const [selectedCourseForQuiz, setSelectedCourseForQuiz] = useState<Course | null>(null);
  const [activeGameConfig, setActiveGameConfig] = useState<{
    course: Course;
    count: number;
    formats: QuestionFormat[];
    mode: GameMode;
  } | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);

  // Initial authentication check & data preload
  useEffect(() => {
    const initApp = async () => {
      const stored = getStoredKey();
      if (!stored) {
        setIsUnlocked(false);
        setCheckingAuth(false);
        return;
      }

      try {
        await loadData();
        setIsUnlocked(true);
      } catch (err: any) {
        if (err?.message === 'AUTH_REQUIRED') {
          setIsUnlocked(false);
        }
      } finally {
        setCheckingAuth(false);
      }
    };

    initApp();
  }, []);

  const loadData = async () => {
    try {
      const [profilesData, coursesData] = await Promise.all([
        api.getProfiles(),
        api.getCourses(),
      ]);

      setProfiles(profilesData);
      setCourses(coursesData);

      // Restore active profile or set first
      const storedProfId = getStoredProfileId();
      const found = profilesData.find((p) => p.id === storedProfId);
      if (found) {
        setActiveProfile(found);
      } else if (profilesData.length > 0) {
        setActiveProfile(profilesData[0]);
        setStoredProfileId(profilesData[0].id);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      throw err;
    }
  };

  const handleUnlock = async () => {
    setIsUnlocked(true);
    await loadData();
  };

  const handleLockApp = () => {
    clearStoredKey();
    setIsUnlocked(false);
  };

  const handleSelectProfile = (p: StudentProfile) => {
    setActiveProfile(p);
    setStoredProfileId(p.id);
  };

  const handleProfileCreated = (newProf: StudentProfile) => {
    setProfiles((prev) => [...prev, newProf]);
    setActiveProfile(newProf);
  };

  const handleCourseAnalyzed = (course: Course) => {
    setCourses((prev) => [course, ...prev.filter((c) => c.id !== course.id)]);
  };

  const handleStartGame = (config: {
    course: Course;
    count: number;
    formats: QuestionFormat[];
    mode: GameMode;
  }) => {
    setSelectedCourseForQuiz(null);
    setActiveGameConfig(config);
  };

  const handleSessionComplete = (updatedProfile: StudentProfile) => {
    setActiveProfile(updatedProfile);
    setProfiles((prev) => prev.map((p) => (p.id === updatedProfile.id ? updatedProfile : p)));
    // Also reload courses practice count
    api.getCourses().then(setCourses).catch(console.error);
  };

  // ----------------------------------------------------
  // Gatekeeper Lock Screen
  // ----------------------------------------------------
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isUnlocked) {
    return <GatekeeperModal onUnlock={handleUnlock} />;
  }

  // ----------------------------------------------------
  // Active Gamified Session Full Screen Arena
  // ----------------------------------------------------
  if (activeGameConfig) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-indigo-500 selection:text-white">
        <GameArena
          course={activeGameConfig.course}
          count={activeGameConfig.count}
          formats={activeGameConfig.formats}
          mode={activeGameConfig.mode}
          activeProfile={activeProfile}
          onExit={() => setActiveGameConfig(null)}
          onSessionComplete={handleSessionComplete}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // Main Navigation App Views
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white pb-20 md:pb-10">
      
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        profiles={profiles}
        activeProfile={activeProfile}
        onSelectProfile={handleSelectProfile}
        onOpenCreateProfile={() => setIsCreatingProfile(true)}
        onLockApp={handleLockApp}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'courses' && (
          <CourseLibrary
            courses={courses}
            onSelectCourseForQuiz={(course) => setSelectedCourseForQuiz(course)}
            onViewCourseDetails={(course) => setSelectedCourseForDetail(course)}
            onNavigateToScan={() => setCurrentTab('scan')}
          />
        )}

        {currentTab === 'scan' && (
          <CourseScanner
            activeProfile={activeProfile}
            onCourseAnalyzed={handleCourseAnalyzed}
            onLaunchQuiz={(course) => setSelectedCourseForQuiz(course)}
          />
        )}

        {currentTab === 'quiz' && (
          courses.length > 0 ? (
            <div className="max-w-4xl mx-auto px-4 py-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white font-['Fredoka']">
                  Choisis un cours pour lancer ton défi 🎮
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Tous les formats interactifs (QCM, Vrai/Faux, Textes à trous, Flashcards, Paires) sont prêts !
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="p-5 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-indigo-500/50 flex flex-col justify-between gap-4 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                          {course.subject}
                        </span>
                        <span className="text-xs text-slate-400">{course.gradeLevel}</span>
                      </div>
                      <h3 className="text-base font-bold text-white font-['Fredoka']">{course.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">{course.summary}</p>
                    </div>
                    <button
                      onClick={() => setSelectedCourseForQuiz(course)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Configurer la session</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto px-4 py-16 text-center">
              <p className="text-slate-400 text-xs mb-4">Aucun cours disponible.</p>
              <button
                onClick={() => setCurrentTab('scan')}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
              >
                Scanner un cours
              </button>
            </div>
          )
        )}

        {currentTab === 'profile' && (
          <ProfileHub
            activeProfile={activeProfile}
            onSelectCourse={(courseId) => {
              const c = courses.find((item) => item.id === courseId);
              if (c) setSelectedCourseForQuiz(c);
            }}
          />
        )}

        {currentTab === 'admin' && (
          <AdminPanel
            courses={courses}
            profiles={profiles}
            onRefreshAll={loadData}
          />
        )}
      </main>

      {/* Course Detail Modal */}
      {selectedCourseForDetail && (
        <CourseDetailModal
          course={selectedCourseForDetail}
          onClose={() => setSelectedCourseForDetail(null)}
          onLaunchQuiz={(course) => {
            setSelectedCourseForDetail(null);
            setSelectedCourseForQuiz(course);
          }}
        />
      )}

      {/* Quiz Launcher Configuration Modal */}
      {selectedCourseForQuiz && (
        <QuizLauncher
          course={selectedCourseForQuiz}
          onClose={() => setSelectedCourseForQuiz(null)}
          onStartGame={handleStartGame}
        />
      )}

      {/* Create Profile Modal */}
      {isCreatingProfile && (
        <CreateProfileModal
          onClose={() => setIsCreatingProfile(false)}
          onProfileCreated={handleProfileCreated}
        />
      )}

    </div>
  );
}
