import React, { useState, useMemo } from 'react';
import { KeywordEntry, Platform, AssetType, ProductionPlanItem, CheckHistoryItem } from '../types/microstock';
import { getDaysDifferenceFromToday, getTodayDateString, formatIndonesianDate } from '../utils/calculator';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  RotateCw, 
  Save, 
  X, 
  ListOrdered, 
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Check,
  Calendar
} from 'lucide-react';

interface RecheckQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  keywords: KeywordEntry[];
  productionPlan: ProductionPlanItem[];
  onUpdateKeyword: (entry: KeywordEntry) => void;
}

export const RecheckQueueModal: React.FC<RecheckQueueModalProps> = ({
  isOpen,
  onClose,
  keywords,
  productionPlan,
  onUpdateKeyword,
}) => {
  // Mode: 'list' (Daftar Antrean) atau 'sequential' (Cek Berurutan Satu per Satu)
  const [mode, setMode] = useState<'list' | 'sequential'>('list');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Form State untuk Cek Berurutan
  const [newResultCount, setNewResultCount] = useState<string>('');
  const [newDemandScore, setNewDemandScore] = useState<number | null>(null);
  const [newDemandSource, setNewDemandSource] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Filter entri yang bertanggal cek > 14 hari
  // Diurutkan berdasarkan skor prioritas Rencana lalu skor peluang
  const queueItems = useMemo(() => {
    const overdueKeywords = keywords.filter((k) => getDaysDifferenceFromToday(k.checkDate) > 14);

    return overdueKeywords.map((k) => {
      // Cari prioritas Rencana Produksi terkait jika ada
      const planItems = productionPlan.filter(
        (p) => p.sourceKeywordId === k.id || p.titleOrKeyword.toLowerCase() === k.keyword.toLowerCase()
      );
      const maxPlanPriority = planItems.length > 0 
        ? Math.max(...planItems.map((p) => p.priorityScore)) 
        : -1;

      return {
        ...k,
        planPriority: maxPlanPriority,
        daysAgo: getDaysDifferenceFromToday(k.checkDate),
      };
    }).sort((a, b) => {
      // Urutkan berdasarkan prioritas Rencana tertinggi dulu
      if (b.planPriority !== a.planPriority) {
        return b.planPriority - a.planPriority;
      }
      // Jika sama, urutkan berdasarkan jumlah hari terlambat
      return b.daysAgo - a.daysAgo;
    });
  }, [keywords, productionPlan]);

  const currentItem = queueItems[currentIndex];

  // Inisialisasi form ketika pindah entri di sequential mode
  const loadEntryToForm = (item: typeof queueItems[0] | undefined) => {
    if (!item) return;
    setNewResultCount(String(item.searchResultCount));
    setNewDemandScore(item.demandScore);
    setNewDemandSource(item.demandSource || '');
    setNewNotes(item.notes || '');
    setSaveSuccessMsg(null);
  };

  const handleStartSequential = (startIndex = 0) => {
    setCurrentIndex(startIndex);
    setMode('sequential');
    loadEntryToForm(queueItems[startIndex]);
  };

  const handleNext = () => {
    if (currentIndex < queueItems.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      loadEntryToForm(queueItems[nextIdx]);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      loadEntryToForm(queueItems[prevIdx]);
    }
  };

  const handleSaveCurrentSnapshot = () => {
    if (!currentItem) return;

    const countNumber = parseInt(newResultCount, 10);
    if (isNaN(countNumber) || countNumber < 0) {
      alert('Jumlah hasil pencarian harus berupa angka valid non-negatif.');
      return;
    }

    if (newDemandScore !== null && (!newDemandSource || !newDemandSource.trim())) {
      alert('Sumber skor permintaan wajib diisi jika skor permintaan ditentukan.');
      return;
    }

    // Buat snapshot dari data lama sebelum diperbarui
    const snapshot: CheckHistoryItem = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      checkDate: currentItem.checkDate,
      searchResultCount: currentItem.searchResultCount,
      demandScore: currentItem.demandScore,
      demandSource: currentItem.demandSource,
      notes: currentItem.notes,
      recordedAt: new Date().toISOString(),
    };

    const existingHistory = Array.isArray(currentItem.checkHistory) ? currentItem.checkHistory : [];

    const updatedEntry: KeywordEntry = {
      ...currentItem,
      searchResultCount: countNumber,
      checkDate: getTodayDateString(),
      demandScore: newDemandScore,
      demandSource: newDemandSource.trim(),
      notes: newNotes.trim(),
      isConfirmedByUser: true,
      checkHistory: [...existingHistory, snapshot],
      updatedAt: new Date().toISOString(),
    };

    onUpdateKeyword(updatedEntry);
    setSaveSuccessMsg(`Snapshot tersimpan untuk "${currentItem.keyword}".`);

    setTimeout(() => {
      // Otomatis lanjut ke entri berikutnya
      if (currentIndex < queueItems.length - 1) {
        handleNext();
      } else {
        setSaveSuccessMsg('Semua entri dalam antrean telah selesai diperiksa!');
      }
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <RotateCw className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Antrean Cek Ulang Data Riset
              </h3>
              <p className="text-[11px] text-slate-500">
                Entri bertanggal cek &gt; 14 hari diurutkan dari prioritas Rencana Produksi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-header Mode Tabs */}
        <div className="px-5 py-2.5 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('list')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                mode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Antrean ({queueItems.length})
            </button>
            {queueItems.length > 0 && (
              <button
                type="button"
                onClick={() => handleStartSequential(0)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mode === 'sequential'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                Mode Cek Berurutan
              </button>
            )}
          </div>

          <span className="text-[11px] font-mono text-slate-500 font-semibold">
            {queueItems.length === 0 ? 'Semua data segar' : `${queueItems.length} entri perlu pembaruan`}
          </span>
        </div>

        {/* Modal Content */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {queueItems.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Entri Kedaluwarsa</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Seluruh kata kunci riset Anda diperiksa dalam 14 hari terakhir. Tingkat kepercayaan data tetap tinggi.
              </p>
            </div>
          ) : mode === 'list' ? (
            /* ================================================= */
            /* MODE 1: DAFTAR ANTREAN                            */
            /* ================================================= */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 pb-1">
                <span>Diurutkan berdasarkan: <strong>Skor Prioritas Rencana &rarr; Usia Hari</strong></span>
                <button
                  type="button"
                  onClick={() => handleStartSequential(0)}
                  className="font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                >
                  Mulai dari Awal <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {queueItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {item.keyword}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {item.platform}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>Tipe: <strong>{item.assetType}</strong></span>
                        <span>&bull;</span>
                        <span className="text-rose-600 font-bold flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> Diperiksa {item.daysAgo} hari lalu ({formatIndonesianDate(item.checkDate)})
                        </span>
                        <span>&bull;</span>
                        <span>Hasil lama: <strong>{item.searchResultCount.toLocaleString('id-ID')}</strong></span>
                      </div>

                      {item.planPriority > 0 && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 mt-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>Ada di Rencana Produksi (Prioritas: {item.planPriority.toFixed(1)})</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartSequential(idx)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-300 text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      Cek Entri Ini <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ================================================= */
            /* MODE 2: FORMULIR RINGKAS CEK BERURUTAN            */
            /* ================================================= */
            currentItem && (
              <div className="space-y-4">
                {/* Progress bar sequential */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Pemeriksaan Berurutan: Entri {currentIndex + 1} dari {queueItems.length}</span>
                  <span className="text-amber-700 font-mono">
                    {Math.round(((currentIndex + 1) / queueItems.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / queueItems.length) * 100}%` }}
                  />
                </div>

                {saveSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-bold animate-fadeIn">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                {/* Kartu Informasi Entri Lama */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Data Lama Terakhir
                    </span>
                    <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-[10px]">
                      {currentItem.daysAgo} hari yang lalu
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-base">
                    {currentItem.keyword}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 pt-1">
                    <div>Platform: <strong className="text-slate-800">{currentItem.platform}</strong></div>
                    <div>Tipe: <strong className="text-slate-800">{currentItem.assetType}</strong></div>
                    <div>Hasil Lama: <strong className="text-slate-800">{currentItem.searchResultCount.toLocaleString('id-ID')}</strong></div>
                    <div>Permintaan: <strong className="text-slate-800">{currentItem.demandScore ? `${currentItem.demandScore}/5` : 'Kosong'}</strong></div>
                  </div>
                  {currentItem.demandSource && (
                    <div className="text-[11px] text-slate-500 pt-0.5">
                      Sumber lama: <em>{currentItem.demandSource}</em>
                    </div>
                  )}
                </div>

                {/* Formulir Input Data Baru */}
                <div className="p-4 bg-white border-2 border-amber-300/80 rounded-xl space-y-3 text-xs shadow-xs">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Save className="w-4 h-4 text-amber-600" />
                    Masukkan Data Pemeriksaan Hari Ini ({formatIndonesianDate(getTodayDateString())})
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Jumlah Hasil Baru (Pasokan): <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newResultCount}
                        onChange={(e) => setNewResultCount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        placeholder="Contoh: 1820"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Skor Permintaan Baru (1 - 5):
                      </label>
                      <select
                        value={newDemandScore ?? ''}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value, 10) : null;
                          setNewDemandScore(val);
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                      >
                        <option value="">(Kosong / Belum ada data permintaan)</option>
                        <option value="1">1 - Sangat Rendah</option>
                        <option value="2">2 - Rendah</option>
                        <option value="3">3 - Sedang</option>
                        <option value="4">4 - Tinggi</option>
                        <option value="5">5 - Sangat Tinggi</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Sumber Skor Permintaan:
                      {newDemandScore !== null && <span className="text-rose-600 ml-1">*</span>}
                    </label>
                    <input
                      type="text"
                      value={newDemandSource}
                      onChange={(e) => setNewDemandSource(e.target.value)}
                      placeholder="Contoh: Adobe Contributor Insights / The Shot List / Freepik Trending"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Catatan Tambahan (Opsional):
                    </label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Catatan sudut pandang, gaya visual, atau kompetitor..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Navigasi & Aksi Sequential */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentIndex === 0}
                      onClick={handlePrev}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Sebelumnya
                    </button>
                    <button
                      type="button"
                      disabled={currentIndex >= queueItems.length - 1}
                      onClick={handleNext}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center gap-1 cursor-pointer"
                    >
                      Lewati <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveCurrentSnapshot}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Simpan Snapshot &amp; Lanjut
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
