import React, { useState, useMemo } from 'react';
import { SeasonalMoment, SeasonalMomentComputed } from '../types/microstock';
import { computeSeasonalMoment, formatIndonesianDate, getTodayDateString } from '../utils/calculator';
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Plus, 
  Edit2, 
  Save, 
  X, 
  ArrowRight,
  Search,
  Filter,
  Info
} from 'lucide-react';

interface SeasonalCalendarViewProps {
  moments: SeasonalMoment[];
  onUpdateMomentPeakDate: (momentId: string, newPeakDate: string) => void;
  onAddCustomMoment: (moment: Omit<SeasonalMoment, 'id'>) => void;
  onDeleteMoment: (momentId: string) => void;
  onResearchKeyword: (keyword: string) => void;
}

export const SeasonalCalendarView: React.FC<SeasonalCalendarViewProps> = ({
  moments,
  onUpdateMomentPeakDate,
  onAddCustomMoment,
  onDeleteMoment,
  onResearchKeyword,
}) => {
  const [filterTab, setFilterTab] = useState<'semua' | 'active' | 'upcoming_30' | 'mendatang'>('semua');
  const [editingMomentId, setEditingMomentId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Add custom moment form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Perayaan Musiman');
  const [newPeakDate, setNewPeakDate] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newKeywords, setNewKeywords] = useState('');

  // Compute all moments with their upload windows
  const computedMoments: SeasonalMomentComputed[] = useMemo(() => {
    return moments.map((m) => computeSeasonalMoment(m));
  }, [moments]);

  // Filtered moments
  const filteredMoments = useMemo(() => {
    let list = computedMoments;

    if (filterTab === 'active') {
      list = list.filter((m) => m.status === 'active');
    } else if (filterTab === 'upcoming_30') {
      list = list.filter((m) => m.status === 'upcoming_30');
    } else if (filterTab === 'mendatang') {
      list = list.filter((m) => m.status === 'active' || m.status === 'upcoming_30' || m.status === 'far_future');
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.keywordsRecommendation.some((k) => k.toLowerCase().includes(q))
      );
    }

    // Urutkan berdasarkan sisa hari menuju hari puncak
    return list.sort((a, b) => a.daysUntilPeak - b.daysUntilPeak);
  }, [computedMoments, filterTab, searchFilter]);

  const activeCount = useMemo(() => computedMoments.filter((m) => m.status === 'active').length, [computedMoments]);
  const upcomingCount = useMemo(() => computedMoments.filter((m) => m.status === 'upcoming_30').length, [computedMoments]);

  const handleStartEditDate = (m: SeasonalMomentComputed) => {
    setEditingMomentId(m.id);
    setEditDateValue(m.peakDate);
  };

  const handleSaveEditDate = (id: string) => {
    if (editDateValue) {
      onUpdateMomentPeakDate(id, editDateValue);
    }
    setEditingMomentId(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPeakDate) return;

    const kwList = newKeywords
      .split(/[,;\n]+/)
      .map((k) => k.trim())
      .filter(Boolean);

    onAddCustomMoment({
      name: newName.trim(),
      category: newCategory,
      peakDate: newPeakDate,
      description: newDesc.trim() || 'Momen musiman khusus kontributor.',
      keywordsRecommendation: kwList,
      isCustom: true,
    });

    setIsAddModalOpen(false);
    setNewName('');
    setNewPeakDate('');
    setNewDesc('');
    setNewKeywords('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Upload Window Formula Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Kalender Musiman Microstock
            </h2>
            <p className="text-xs text-slate-500">
              Jendela unggah ideal dihitung otomatis: <strong className="text-slate-700">120 hingga 60 hari sebelum tanggal puncak</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Momen Kustom
          </button>
        </div>

        {/* Status Highlight Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {activeCount}
            </div>
            <div>
              <span className="font-bold text-emerald-900 block">
                Sedang dalam Jendela Unggah (Prioritas Sekarang)
              </span>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Waktu ideal agar aset terkurasi &amp; terindeks sempurna sebelum puncak pencarian pembeli.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-950">
            <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {upcomingCount}
            </div>
            <div>
              <span className="font-bold text-amber-900 block">
                Segera Masuk Jendela (&lt; 30 Hari Lagi)
              </span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Persiapkan riset kata kunci dan produksi materi sekarang sebelum jendela dibuka.
              </p>
            </div>
          </div>
        </div>

        {/* Rule note: Tanggal pasti */}
        <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg text-slate-600 text-xs">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            <strong>Catatan Keakuratan:</strong> Anda memegang kendali penuh atas tanggal puncak. Jika hari raya berbasis kalender lunar/hijriah bergeser, cukup sunting tanggal puncak langsung di kartu momen.
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Interactive Segmented Filter */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterTab('semua')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              filterTab === 'semua' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Momen ({moments.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              filterTab === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sedang Aktif ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('upcoming_30')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              filterTab === 'upcoming_30' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Segera Tiba ({upcomingCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari momen atau kata kunci..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Grid of Seasonal Moments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMoments.map((moment) => {
          const isEditing = editingMomentId === moment.id;

          // Status styling
          const isAct = moment.status === 'active';
          const isUpc = moment.status === 'upcoming_30';
          const isApp = moment.status === 'approaching';
          const isPass = moment.status === 'passed';

          const cardBorder = isAct
            ? 'border-emerald-500 ring-2 ring-emerald-500/10'
            : isUpc
            ? 'border-amber-400 ring-2 ring-amber-400/10'
            : 'border-slate-200';

          return (
            <div
              key={moment.id}
              className={`bg-white rounded-xl border p-4 sm:p-5 space-y-3.5 shadow-2xs transition-all ${cardBorder}`}
            >
              {/* Header Momen */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      {moment.category}
                    </span>
                    {moment.isCustom && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        Kustom
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{moment.name}</h3>
                </div>

                {/* Status Badge */}
                <div className="text-right shrink-0">
                  {isAct && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white font-bold text-[11px] rounded-md shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Dalam Jendela
                    </span>
                  )}
                  {isUpc && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white font-bold text-[11px] rounded-md">
                      Segera Masuk (&lt;30hr)
                    </span>
                  )}
                  {isApp && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-[11px] rounded-md">
                      Mendekati Puncak
                    </span>
                  )}
                  {isPass && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 font-semibold text-[11px] rounded-md">
                      Puncak Lewat
                    </span>
                  )}
                  {moment.status === 'far_future' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 font-medium text-[11px] rounded-md">
                      Mendatang
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed">
                {moment.description}
              </p>

              {/* Peak Date & Calculation Box */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                {/* Tanggal Puncak Editable */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Tanggal Puncak (Peak):</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        value={editDateValue}
                        onChange={(e) => setEditDateValue(e.target.value)}
                        className="text-xs bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditDate(moment.id)}
                        className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                        title="Simpan"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingMomentId(null)}
                        className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 cursor-pointer"
                        title="Batal"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {formatIndonesianDate(moment.peakDate)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEditDate(moment)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                        title="Ubah Tanggal Puncak"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Jendela Unggah Ideal Range */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                  <span className="text-slate-500 font-medium">Jendela Unggah Ideal (120-60 hr):</span>
                  <span className="font-mono font-semibold text-slate-800 text-[11px]">
                    {formatIndonesianDate(moment.idealWindowStart)} &rarr; {formatIndonesianDate(moment.idealWindowEnd)}
                  </span>
                </div>

                {/* Status Countdown */}
                <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Hitung Mundur:</span>
                  <span className="font-bold text-slate-700">{moment.statusLabel}</span>
                </div>
              </div>

              {/* Recommended Keywords to Research */}
              {moment.keywordsRecommendation.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                    Ide Kata Kunci Rekomendasi:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {moment.keywordsRecommendation.map((kw, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onResearchKeyword(kw)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs rounded-md border border-slate-200 transition-colors cursor-pointer group"
                        title="Klik untuk riset kata kunci ini di Form"
                      >
                        <span>{kw}</span>
                        <ArrowRight className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Moment Delete */}
              {moment.isCustom && (
                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Hapus momen "${moment.name}"?`)) {
                        onDeleteMoment(moment.id);
                      }
                    }}
                    className="text-xs text-rose-500 hover:underline cursor-pointer"
                  >
                    Hapus Momen Kustom
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Tambah Momen Kustom */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Tambah Momen Musiman Kustom
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Momen / Acara <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Piala Dunia FIFA / Harbolnas 12.12"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800"
                  >
                    <option value="Perayaan Musiman">Perayaan Musiman</option>
                    <option value="Komersial & Bisnis">Komersial & Bisnis</option>
                    <option value="Keagamaan">Keagamaan</option>
                    <option value="Olahraga">Olahraga</option>
                    <option value="Nasional">Nasional</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Puncak <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newPeakDate}
                    onChange={(e) => setNewPeakDate(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  placeholder="Karakteristik visual yang banyak dicari..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Rekomendasi Kata Kunci (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: world cup soccer ball, stadium cheering"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs cursor-pointer"
                >
                  Simpan Momen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
