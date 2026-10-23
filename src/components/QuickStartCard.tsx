import React, { useState, useEffect } from 'react';
import { BookOpen, X, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

const QUICKSTART_STORAGE_KEY = 'microstock_quickstart_dismissed_v1';

interface QuickStartCardProps {
  onOpenGuide: (sectionId?: string) => void;
  onOpenAddModal: () => void;
}

export const QuickStartCard: React.FC<QuickStartCardProps> = ({
  onOpenGuide,
  onOpenAddModal,
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(QUICKSTART_STORAGE_KEY) === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(QUICKSTART_STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('Gagal menyimpan status tutup Mulai Cepat ke localStorage:', e);
    }
  };

  if (isDismissed) {
    return null;
  }

  const steps = [
    {
      num: '1',
      title: 'Buka Riset & Peringkat',
      desc: 'Ketuk tombol "+ Tambah Riset" di header atau tab Riset & Peringkat.',
    },
    {
      num: '2',
      title: 'Isi Platform, Tipe Aset & Hasil',
      desc: 'Buka situs platform, cari kata kunci yang sama, catat total hasil pencarian.',
    },
    {
      num: '3',
      title: 'Skor Permintaan (1 - 5) & Sumber',
      desc: 'Beri skor 1-5 berdasarkan laporan tren atau ide niche dan cantumkan tautan sumber.',
    },
    {
      num: '4',
      title: 'Simpan & Lihat Skor Peluang',
      desc: 'Evaluasi skor peluang (0 - 100) dan label kepercayaan (Tinggi, Sedang, Rendah).',
    },
    {
      num: '5',
      title: 'Kalender & Rencana Produksi',
      desc: 'Cek jendela musiman, masukkan ke Rencana Produksi, dan backup berkala di Pengaturan.',
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-500/10 via-white to-emerald-500/5 p-5 sm:p-6 shadow-sm mb-6 animate-fade-in">
      {/* Decorative background glow */}
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                Mulai Cepat: Panduan Riset Pertamamu
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                5 Langkah Praktis
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Panduan ringkas untuk memulai riset niche microstock pertama Anda secara efektif
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Tutup panduan mulai cepat (bisa dibuka lagi kapan saja dari menu Panduan)"
          aria-label="Tutup Mulai Cepat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 5 Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4 relative z-10">
        {steps.map((st) => (
          <div
            key={st.num}
            className="p-3 bg-white/90 backdrop-blur-xs rounded-xl border border-slate-200/80 shadow-2xs space-y-1 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                  {st.num}
                </span>
                <span className="font-bold text-xs text-slate-900 leading-snug">
                  {st.title}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {st.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-emerald-200/60 relative z-10 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <span>+ Mulai Riset Pertama</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenGuide('sec-1-mulai-cepat')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>Baca Panduan Lengkap</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
        >
          Sembunyikan panduan ini (kartu tidak akan muncul lagi)
        </button>
      </div>
    </div>
  );
};
