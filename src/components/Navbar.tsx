import React, { useState } from 'react';
import { BookOpen, Camera, Gamepad2, Award, Shield, Volume2, VolumeX, UserCheck, Flame, ChevronDown, Plus, LogOut } from 'lucide-react';
import { StudentProfile } from '../types/index.js';
import { isSoundEnabled, toggleSound, playClickSound } from '../utils/audio.js';

interface NavbarProps {
  currentTab: 'courses' | 'scan' | 'quiz' | 'profile' | 'admin';
  onSelectTab: (tab: 'courses' | 'scan' | 'quiz' | 'profile' | 'admin') => void;
  profiles: StudentProfile[];
  activeProfile: StudentProfile | null;
  onSelectProfile: (profile: StudentProfile) => void;
  onOpenCreateProfile: () => void;
  onLockApp: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  profiles,
  activeProfile,
  onSelectProfile,
  onOpenCreateProfile,
  onLockApp,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const handleToggleSound = () => {
    const newState = toggleSound();
    setSoundOn(newState);
    playClickSound();
  };

  const navItems = [
    { id: 'courses', label: 'Mes Cours', icon: BookOpen, badge: null },
    { id: 'scan', label: 'Scanner', icon: Camera, badge: 'IA' },
    { id: 'quiz', label: 'Mini-Jeux', icon: Gamepad2, badge: 'XP' },
    { id: 'profile', label: 'Trophées', icon: Award, badge: null },
    { id: 'admin', label: 'Superviseur', icon: Shield, badge: 'PIN' },
  ] as const;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onSelectTab('courses');
                playClickSound();
              }}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                <span className="text-xl">🍕</span>
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-['Fredoka'] text-xl font-bold text-white tracking-wide">PizaLearn</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md uppercase tracking-wider">
                    EdTech
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium -mt-0.5">Révise malin & mini-jeux</p>
              </div>
            </button>
          </div>

          {/* Center Navigation for Tablet / Desktop */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-2xl border border-slate-700/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    playClickSound();
                  }}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase tracking-wider ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Profile & Sound & Lock */}
          <div className="flex items-center gap-2">
            
            {/* Audio Toggle */}
            <button
              onClick={handleToggleSound}
              title={soundOn ? 'Désactiver les sons' : 'Activer les sons'}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Profile Dropdown Selector */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/70 text-slate-200 text-xs font-medium transition-all cursor-pointer shadow-sm"
              >
                <span className="text-lg leading-none">{activeProfile?.avatar || '🎓'}</span>
                <div className="text-left hidden xs:block">
                  <div className="flex items-center gap-1 font-semibold text-white">
                    <span>{activeProfile?.name || 'Élève'}</span>
                    <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1 py-0.2 rounded font-mono">
                      Niv.{activeProfile?.level || 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-amber-400">
                    <Flame className="w-2.5 h-2.5 fill-amber-400" />
                    <span>{activeProfile?.streakDays || 1}j série</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl z-40 p-2 text-xs">
                    <div className="px-3 py-2 border-b border-slate-700/70 mb-1">
                      <p className="font-semibold text-slate-200">Changer de profil d'élève</p>
                      <p className="text-[11px] text-slate-400">Chaque profil garde ses propres scores et XP.</p>
                    </div>

                    <div className="space-y-1 max-h-52 overflow-y-auto">
                      {profiles.map((p) => {
                        const isCurrent = p.id === activeProfile?.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              onSelectProfile(p);
                              setProfileDropdownOpen(false);
                              playClickSound();
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer text-left ${
                              isCurrent
                                ? 'bg-indigo-600/20 border border-indigo-500/40 text-white font-semibold'
                                : 'hover:bg-slate-700/60 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{p.avatar}</span>
                              <div>
                                <div className="font-medium text-white flex items-center gap-1.5">
                                  <span>{p.name}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">({p.grade})</span>
                                </div>
                                <span className="text-[10px] text-indigo-400 font-mono">
                                  {p.xp} XP • Niv. {p.level}
                                </span>
                              </div>
                            </div>
                            {isCurrent && <UserCheck className="w-4 h-4 text-indigo-400" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="border-t border-slate-700/70 pt-2 mt-2 space-y-1">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onOpenCreateProfile();
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl bg-slate-700/40 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 transition-colors font-medium cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-indigo-400" />
                        <span>Créer un profil élève</span>
                      </button>

                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onLockApp();
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors font-medium cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Verrouiller l'accès</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Mobile Bottom Navigation Bar for smartphones */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                playClickSound();
              }}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'text-indigo-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl ${
                  isActive ? 'bg-indigo-600/20 text-indigo-400' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
