import React, { useState } from 'react';
import { X, Sparkles, User } from 'lucide-react';
import { api, setStoredProfileId } from '../utils/api.js';
import { StudentProfile } from '../types/index.js';
import { playClickSound, playSuccessSound } from '../utils/audio.js';

interface CreateProfileModalProps {
  onClose: () => void;
  onProfileCreated: (profile: StudentProfile) => void;
}

export const CreateProfileModal: React.FC<CreateProfileModalProps> = ({
  onClose,
  onProfileCreated,
}) => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('4ème');
  const [avatar, setAvatar] = useState('🦊');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const avatars = ['🦊', '⚡', '🎮', '🚀', '🌟', '🦄', '🦁', '🦉', '🎨', '🔬', '🥋', '🐱'];
  const grades = ['6ème', '5ème', '4ème', '3ème (Brevet)', '2nde', '1ère', 'Terminale'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Veuillez entrer un prénom ou pseudo.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const created = await api.createProfile({
        name: name.trim(),
        avatar,
        grade,
      });
      setStoredProfileId(created.id);
      playSuccessSound();
      onProfileCreated(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la création du profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <button
          onClick={() => {
            onClose();
            playClickSound();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-3xl mb-3">
            {avatar}
          </div>
          <h2 className="text-2xl font-bold text-white font-['Fredoka']">
            Créer un profil élève
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Garde tes propres scores, tes badges et ton niveau d'XP en toute autonomie.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Prénom ou Pseudo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Ex: Thomas, Chloé..."
              autoFocus
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Classe / Niveau
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {grades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Choisis ton Avatar
            </label>
            <div className="grid grid-cols-6 gap-2">
              {avatars.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => {
                    setAvatar(av);
                    playClickSound();
                  }}
                  className={`text-xl p-2.5 rounded-xl transition-transform cursor-pointer ${
                    avatar === av
                      ? 'bg-indigo-600 scale-110 shadow-md shadow-indigo-600/40 ring-2 ring-indigo-400'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-rose-400 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Commencer à réviser</span>
          </button>
        </form>
      </div>
    </div>
  );
};
