import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import { getStoredPasscode, setStoredPasscode } from '../utils/geminiClient';

interface PasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  errorMessage?: string;
}

export const PasscodeModal: React.FC<PasscodeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  errorMessage,
}) => {
  const [passcode, setPasscode] = useState(getStoredPasscode());
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(errorMessage || null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcode.trim();
    if (!clean) {
      setError('Kode akses tidak boleh kosong.');
      return;
    }
    setStoredPasscode(clean);
    setSavedSuccess(true);
    setError(null);
    setTimeout(() => {
      setSavedSuccess(false);
      if (onSuccess) onSuccess();
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Kode Akses Fitur AI
              </h3>
              <p className="text-[11px] text-slate-500">
                Diperlukan untuk mengakses panggilan Gemini di server publik
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Proteksi Kuota &amp; Keamanan</span>
            </div>
            <p>
              Fitur AI (Ide Niche, Baca Screenshot, dan Insight AI) di server Vercel dilindungi kode akses untuk mencegah eksploitasi kuota API. Fitur non-AI (riset manual, kalender, portofolio) tetap aktif tanpa kode akses.
            </p>
          </div>

          {(error || errorMessage) && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-medium">
              {error || errorMessage}
            </div>
          )}

          {savedSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>Kode akses berhasil disimpan di perangkat ini.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kode Akses (APP_PASSCODE)
            </label>
            <div className="relative">
              <input
                type={showPasscode ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Masukkan kode akses..."
                autoFocus
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 pr-10 text-xs text-slate-900 font-mono tracking-wider focus:outline-emerald-600 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                title={showPasscode ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Kode ini disimpan secara lokal di browser perangkat Anda (localStorage).
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Simpan Kode Akses
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
