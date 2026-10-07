import React, { useState } from 'react';
import { Lock, ShieldCheck, Sparkles, Key, AlertCircle } from 'lucide-react';
import { api, setStoredKey } from '../utils/api.js';

interface GatekeeperModalProps {
  onUnlock: () => void;
}

export const GatekeeperModal: React.FC<GatekeeperModalProps> = ({ onUnlock }) => {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) {
      setError('Veuillez saisir la clé de sécurité.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.verifyGatekeeper(passphrase.trim());
      onUnlock();
    } catch (err: any) {
      setError(err?.message || 'Clé de sécurité incorrecte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-800 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/50 text-center overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 mb-5 shadow-inner">
            <Lock className="w-8 h-8 text-indigo-400 animate-pulse" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Accès Sécurisé • EdTech 11-17 ans
          </span>

          <h2 className="text-2xl font-bold text-white font-['Fredoka'] tracking-wide mb-2">
            PizaLearn Révisions
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Cette application est privée et auto-hébergée. Entrez votre clé de sécurité globale pour accéder à l'espace de révision.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Key className="w-5 h-5 text-indigo-400" />
              </div>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => {
                  setPassphrase(e.target.value);
                  setError('');
                }}
                placeholder="Entrez votre clé de sécurité"
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-slate-900/80 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 rounded-xl text-white placeholder-slate-500 text-base font-mono tracking-wider transition-all outline-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Vérification...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Déverrouiller l'accès</span>
                </>
              )}
            </button>
          </form>

          {/* Privacy note */}
          <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col items-center">
            <p className="text-[11px] text-slate-500">
              Protection sécurisée anti-intrusion pour usage familial ou scolaire
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
