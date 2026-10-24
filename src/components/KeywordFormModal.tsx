import React, { useState, useEffect } from 'react';
import { AssetType, KeywordEntry, Platform, AppSettings } from '../types/microstock';
import { getTodayDateString, computeKeywordMetrics } from '../utils/calculator';
import { X, Plus, AlertCircle, Sparkles, Check, Hash, HelpCircle, ChevronDown } from 'lucide-react';
import { HelpTooltipButton } from './HelpTooltipButton';

interface KeywordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<KeywordEntry, 'id' | 'createdAt' | 'updatedAt'>, editId?: string) => void;
  editingEntry?: KeywordEntry | null;
  settings: AppSettings;
  prefillKeyword?: string;
  prefillData?: Partial<KeywordEntry> | null;
  onOpenGuide?: (sectionId: string) => void;
}

const PLATFORMS: Platform[] = ['Adobe Stock', 'Shutterstock', 'Freepik'];
const ASSET_TYPES: AssetType[] = ['Foto nyata', 'Foto AI-generated', 'Ilustrasi AI-generated'];

export const KeywordFormModal: React.FC<KeywordFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingEntry,
  settings,
  prefillKeyword = '',
  prefillData = null,
  onOpenGuide,
}) => {
  const [platform, setPlatform] = useState<Platform>('Adobe Stock');
  const [assetType, setAssetType] = useState<AssetType>('Foto nyata');
  const [keyword, setKeyword] = useState('');
  const [searchResultCount, setSearchResultCount] = useState<string>('0');
  const [checkDate, setCheckDate] = useState(getTodayDateString());
  const [demandScore, setDemandScore] = useState<number | null>(null);
  const [demandSource, setDemandSource] = useState('');
  const [topAssetInput, setTopAssetInput] = useState('');
  const [topAssetIds, setTopAssetIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [sumberData, setSumberData] = useState<'manual' | 'screenshot' | 'api'>('manual');
  const [isAiSuggested, setIsAiSuggested] = useState(false);
  const [isConfirmedByUser, setIsConfirmedByUser] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset or pre-fill form
  useEffect(() => {
    if (editingEntry) {
      setPlatform(editingEntry.platform);
      setAssetType(editingEntry.assetType);
      setKeyword(editingEntry.keyword);
      setSearchResultCount(String(editingEntry.searchResultCount));
      setCheckDate(editingEntry.checkDate);
      setDemandScore(editingEntry.demandScore);
      setDemandSource(editingEntry.demandSource || '');
      setTopAssetIds(editingEntry.topAssetIds || []);
      setNotes(editingEntry.notes || '');
      setSumberData(editingEntry.sumber_data || 'manual');
      setIsAiSuggested(Boolean(editingEntry.isAiSuggested));
      setIsConfirmedByUser(Boolean(editingEntry.isConfirmedByUser));
    } else if (prefillData) {
      setPlatform(prefillData.platform || 'Adobe Stock');
      setAssetType(prefillData.assetType || 'Foto nyata');
      setKeyword(prefillData.keyword || '');
      setSearchResultCount(String(prefillData.searchResultCount ?? '0'));
      setCheckDate(prefillData.checkDate || getTodayDateString());
      setDemandScore(prefillData.demandScore ?? null);
      setDemandSource(prefillData.demandSource || '');
      setTopAssetIds(prefillData.topAssetIds || []);
      setNotes(prefillData.notes || '');
      setSumberData(prefillData.sumber_data || 'manual');
      setIsAiSuggested(Boolean(prefillData.isAiSuggested));
      setIsConfirmedByUser(Boolean(prefillData.isConfirmedByUser));
    } else {
      setPlatform('Adobe Stock');
      setAssetType('Foto nyata');
      setKeyword(prefillKeyword || '');
      setSearchResultCount('0');
      setCheckDate(getTodayDateString());
      setDemandScore(null);
      setDemandSource('');
      setTopAssetIds([]);
      setNotes('');
      setSumberData('manual');
      setIsAiSuggested(false);
      setIsConfirmedByUser(false);
    }
    setTopAssetInput('');
    setErrors({});
  }, [editingEntry, prefillKeyword, prefillData, isOpen]);

  if (!isOpen) return null;

  // Real-time calculation preview
  const parsedCount = parseInt(searchResultCount, 10);
  const previewEntry: KeywordEntry = {
    id: 'preview',
    platform,
    assetType,
    keyword: keyword || 'contoh',
    searchResultCount: isNaN(parsedCount) ? 0 : Math.max(0, parsedCount),
    checkDate: checkDate || getTodayDateString(),
    demandScore,
    demandSource,
    topAssetIds,
    notes,
    isAiSuggested,
    isConfirmedByUser,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const previewMetrics = computeKeywordMetrics(previewEntry, settings);

  const handleAddAssetId = () => {
    if (!topAssetInput.trim()) return;
    if (topAssetIds.length >= 10) {
      setErrors((prev) => ({ ...prev, topAssetIds: 'Maksimal 10 ID aset teratas' }));
      return;
    }

    // Dukung input koma atau spasi ganda
    const rawIds = topAssetInput
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const merged = [...topAssetIds];
    for (const id of rawIds) {
      if (merged.length < 10 && !merged.includes(id)) {
        merged.push(id);
      }
    }

    setTopAssetIds(merged);
    setTopAssetInput('');
    setErrors((prev) => {
      const next = { ...prev };
      delete next.topAssetIds;
      return next;
    });
  };

  const handleRemoveAssetId = (index: number) => {
    setTopAssetIds(topAssetIds.filter((_, idx) => idx !== index));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!keyword.trim()) {
      newErrors.keyword = 'Kata kunci wajib diisi';
    }

    const countNum = parseInt(searchResultCount, 10);
    if (isNaN(countNum) || countNum < 0) {
      newErrors.searchResultCount = 'Jumlah hasil harus berupa angka non-negatif (≥ 0)';
    }

    if (!checkDate) {
      newErrors.checkDate = 'Tanggal cek wajib diisi';
    }

    // Aturan wajib: Sumber skor permintaan wajib diisi jika skor permintaan diisi
    if (demandScore !== null && (!demandSource || !demandSource.trim())) {
      newErrors.demandSource = 'Sumber skor permintaan wajib diisi jika skor permintaan dipilih';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const countNum = parseInt(searchResultCount, 10) || 0;
    onSave(
      {
        platform,
        assetType,
        keyword: keyword.trim(),
        searchResultCount: countNum,
        checkDate,
        demandScore,
        demandSource: demandSource.trim(),
        topAssetIds,
        notes: notes.trim(),
        sumber_data: sumberData,
        isAiSuggested,
        isConfirmedByUser,
      },
      editingEntry?.id
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 min-w-0">
        {/* Header Modal */}
        <div className="px-[16px] py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {editingEntry ? 'Sunting Riset Kata Kunci' : 'Form Input Riset Kata Kunci'}
            </h2>
            <p className="text-xs text-slate-500">
              Data dihitung transparan dengan rumus kode murni
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Calculation Preview Banner */}
        <div className="bg-slate-900 text-white px-[16px] py-3 flex flex-wrap items-center justify-between gap-3 text-xs overflow-hidden">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap min-w-0">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Pasokan</span>
              <span className="font-mono font-semibold text-emerald-400">
                {previewMetrics.supplyScore.toFixed(3)}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Permintaan</span>
              <span className="font-mono font-semibold text-emerald-400">
                {previewMetrics.demandScoreNormalized.toFixed(2)}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Kepercayaan</span>
                {onOpenGuide && <HelpTooltipButton topic="skor_kepercayaan" onOpenGuide={onOpenGuide} />}
              </div>
              <span
                className={`font-semibold ${
                  previewMetrics.confidenceLevel === 'Tinggi'
                    ? 'text-emerald-400'
                    : previewMetrics.confidenceLevel === 'Sedang'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {previewMetrics.confidenceLevel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-lg shrink-0">
            <span className="text-emerald-300 font-medium">Skor Peluang:</span>
            <span className="text-base font-bold text-emerald-300 font-mono">
              {previewMetrics.opportunityScore}
            </span>
            <span className="text-[10px] text-emerald-400">/ 100</span>
          </div>
        </div>

        {/* Form Body with Uniform Spacing & Tokens */}
        <form onSubmit={handleSubmit} className="px-[16px] py-[20px] space-y-[20px] max-h-[75vh] overflow-y-auto custom-scrollbar box-border w-full min-w-0">
          {/* AI Suggestion / Confirmation Banner */}
          {isAiSuggested && (
            <div className={`p-[16px] rounded-[16px] border text-xs space-y-2 box-border w-full min-w-0 ${
              isConfirmedByUser
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/80 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Isian Rekomendasi AI
                  {!isConfirmedByUser ? (
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-mono font-bold">
                      Belum Dikonfirmasi
                    </span>
                  ) : (
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-mono font-bold">
                      Dikonfirmasi Pengguna
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-semibold text-slate-600">
                  {!isConfirmedByUser ? 'Kepercayaan Maks. Sedang' : 'Kepercayaan Normal'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-700">
                Data kata kunci, estimasi hasil, atau skor permintaan ini disarankan oleh AI. Skor kepercayaan dibatasi maksimal &quot;Sedang&quot; sampai Anda mengonfirmasi atau memodifikasi nilainya secara mandiri.
              </p>
              <label className="flex items-center gap-2 pt-1 cursor-pointer bg-white/70 p-2 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={isConfirmedByUser}
                  onChange={(e) => setIsConfirmedByUser(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Saya telah memeriksa &amp; menyetujui isian data ini secara manual
                </span>
              </label>
            </div>
          )}

          {/* Row 1: Platform & Tipe Aset */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[20px]">
            {/* Field: Platform */}
            <div className="box-border w-full min-w-0 max-w-full">
              <label className="block text-[12px] font-semibold text-slate-700 uppercase tracking-[0.04em] mb-[6px]">
                Platform Microstock <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-[12px] box-border w-full min-w-0 max-w-full">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`h-[44px] text-[14px] rounded-[10px] transition-all text-center cursor-pointer flex items-center justify-center box-border min-w-0 ${
                      platform === p
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 font-normal'
                    }`}
                  >
                    {p === 'Adobe Stock' ? 'Adobe' : p === 'Shutterstock' ? 'Shutter' : 'Freepik'}
                  </button>
                ))}
              </div>
              <p className="text-[13px] text-slate-500 mt-[6px]">Terpilih: {platform}</p>
            </div>

            {/* Field: Tipe Aset */}
            <div className="box-border w-full min-w-0 max-w-full">
              <label className="block text-[12px] font-semibold text-slate-700 uppercase tracking-[0.04em] mb-[6px]">
                Tipe Aset <span className="text-rose-500">*</span>
              </label>
              <div className="relative box-border w-full min-w-0 max-w-full">
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as AssetType)}
                  className="box-border w-full min-w-0 max-w-full h-[48px] text-[16px] font-normal font-sans text-slate-900 bg-white border border-slate-300 rounded-[12px] px-[14px] pr-10 [appearance:none] [-webkit-appearance:none] focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 text-slate-400 absolute right-[14px] top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[13px] text-slate-500 mt-[6px]">
                Peringkat tiap tipe aset dipisah secara ketat.
              </p>
            </div>
          </div>

          {/* Row 2: Kata Kunci (Keyword) */}
          <div className="box-border w-full min-w-0 max-w-full">
            <label className="block text-[12px] font-semibold text-slate-700 uppercase tracking-[0.04em] mb-[6px]">
              Kata Kunci (Keyword) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: ramadan kareem greeting banner"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                if (errors.keyword) {
                  setErrors((prev) => {
                    const n = { ...prev };
                    delete n.keyword;
                    return n;
                  });
                }
              }}
              className={`box-border w-full min-w-0 max-w-full h-[48px] text-[16px] font-normal font-sans text-slate-900 placeholder:text-[16px] placeholder:text-slate-400 bg-white border rounded-[12px] px-[14px] focus:outline-hidden focus:ring-2 ${
                errors.keyword
                  ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                  : 'border-slate-300 focus:ring-emerald-500'
              }`}
            />
            {errors.keyword && (
              <p className="text-[13px] text-rose-600 mt-[6px] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" /> {errors.keyword}
              </p>
            )}
            <p className="text-[13px] text-slate-500 mt-[6px]">
              Masukkan kata kunci pencarian dalam bahasa Inggris atau Indonesia.
            </p>
          </div>

          {/* Row 3: Jumlah Hasil Pencarian & Tanggal Cek */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[20px]">
            {/* Field: Jumlah Hasil Pencarian */}
            <div className="box-border w-full min-w-0 max-w-full">
              <label className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 uppercase tracking-[0.04em] mb-[6px]">
                <span>Jumlah Hasil Pencarian <span className="text-rose-500">*</span></span>
                {onOpenGuide && <HelpTooltipButton topic="jumlah_hasil" onOpenGuide={onOpenGuide} />}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={searchResultCount}
                onChange={(e) => setSearchResultCount(e.target.value)}
                className={`box-border w-full min-w-0 max-w-full h-[48px] text-[16px] font-normal font-sans [font-variant-numeric:tabular-nums] text-slate-900 placeholder:text-[16px] placeholder:text-slate-400 bg-white border rounded-[12px] px-[14px] focus:outline-hidden focus:ring-2 ${
                  errors.searchResultCount
                    ? 'border-rose-400 focus:ring-rose-400'
                    : 'border-slate-300 focus:ring-emerald-500'
                }`}
              />
              {errors.searchResultCount && (
                <p className="text-[13px] text-rose-600 mt-[6px] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errors.searchResultCount}
                </p>
              )}
              <p className="text-[13px] text-slate-500 mt-[6px]">
                Angka hasil pencarian saat mencari kata kunci di {platform}.
              </p>
            </div>

            {/* Field: Tanggal Cek */}
            <div className="box-border w-full min-w-0 max-w-full">
              <label className="block text-[12px] font-semibold text-slate-700 uppercase tracking-[0.04em] mb-[6px]">
                Tanggal Cek <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={checkDate}
                onChange={(e) => setCheckDate(e.target.value)}
                className="box-border w-full min-w-0 max-w-full h-[48px] text-[16px] font-normal font-sans text-slate-900 bg-white border border-slate-300 rounded-[12px] px-[14px] [appearance:none] [-webkit-appearance:none] focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
              <p className="text-[13px] text-slate-500 mt-[6px]">
                Otomatis hari ini ({getTodayDateString()}). Bisa disesuaikan.
              </p>
            </div>
          </div>

          {/* Row 4: Skor Permintaan 1-5 & Sumber Skor */}
          <div className="p-[16px] bg-slate-50 border border-slate-200 rounded-[16px] space-y-[20px] box-border w-full min-w-0 max-w-full">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-[6px]">
                <label className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 uppercase tracking-[0.04em]">
                  <span>Skor Permintaan (1 - 5)</span>
                  {onOpenGuide && <HelpTooltipButton topic="skor_permintaan" onOpenGuide={onOpenGuide} />}
                </label>
                <span className="text-[13px] text-slate-500">
                  {demandScore ? `${demandScore} dari 5 bintang` : 'Belum ditentukan (opsional)'}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-[8px] box-border w-full min-w-0 max-w-full">
                <button
                  type="button"
                  onClick={() => {
                    setDemandScore(null);
                    setErrors((prev) => {
                      const n = { ...prev };
                      delete n.demandSource;
                      return n;
                    });
                  }}
                  className={`h-[44px] text-[14px] font-medium rounded-[10px] border text-center transition-all cursor-pointer flex items-center justify-center box-border min-w-0 px-0.5 leading-none whitespace-nowrap ${
                    demandScore === null
                      ? 'bg-white border-slate-400 font-bold text-slate-900 shadow-xs'
                      : 'bg-slate-100 border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  N/A
                </button>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDemandScore(s)}
                    className={`h-[44px] text-[14px] font-medium rounded-[10px] border text-center transition-all cursor-pointer flex items-center justify-center box-border min-w-0 px-0.5 leading-none whitespace-nowrap ${
                      demandScore === s
                        ? 'bg-emerald-600 border-emerald-600 font-bold text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    ★ {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate-700 uppercase tracking-[0.04em] mb-[6px]">
                Sumber Skor Permintaan {demandScore !== null && <span className="text-rose-500">* (Wajib)</span>}
              </label>
              <input
                type="text"
                placeholder="Contoh: Adobe Contributor Insights / Google Trends / Freepik Trending Tab"
                value={demandSource}
                onChange={(e) => {
                  setDemandSource(e.target.value);
                  if (errors.demandSource) {
                    setErrors((prev) => {
                      const n = { ...prev };
                      delete n.demandSource;
                      return n;
                    });
                  }
                }}
                className={`box-border w-full min-w-0 max-w-full h-[48px] text-[16px] font-normal font-sans text-slate-900 placeholder:text-[16px] placeholder:text-slate-400 bg-white border rounded-[12px] px-[14px] focus:outline-hidden focus:ring-2 ${
                  errors.demandSource
                    ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                    : 'border-slate-300 focus:ring-emerald-500'
                }`}
              />
              {errors.demandSource && (
                <p className="text-[13px] text-rose-600 mt-[6px] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errors.demandSource}
                </p>
              )}
              <p className="text-[13px] text-slate-500 mt-[6px]">
                Tulis nama sumber atau tempel tautan untuk memastikan skor kepercayaan Tinggi.
              </p>
            </div>
          </div>

          {/* Row 5: ID Aset Teratas (Hingga 10) */}
          <div className="box-border w-full min-w-0 max-w-full">
            <div className="flex items-center justify-between mb-[6px]">
              <label className="block text-[12px] font-semibold text-slate-700 uppercase tracking-[0.04em]">
                ID Aset Teratas (Opsional, Hingga 10)
              </label>
              <span className="text-[13px] text-slate-500 font-mono">
                {topAssetIds.length} / 10
              </span>
            </div>

            <div className="flex gap-[8px] box-border w-full min-w-0 max-w-full">
              <div className="relative flex-1 min-w-0">
                <Hash className="w-5 h-5 text-slate-400 absolute left-[14px] top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Ketik ID lalu tekan Tambah atau koma (mis: 89421034)"
                  value={topAssetInput}
                  onChange={(e) => setTopAssetInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAssetId();
                    }
                  }}
                  disabled={topAssetIds.length >= 10}
                  className="box-border w-full min-w-0 max-w-full h-[48px] text-[16px] font-normal font-sans text-slate-900 placeholder:text-[16px] placeholder:text-slate-400 bg-white border border-slate-300 rounded-[12px] pl-[40px] pr-[14px] focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
              <button
                type="button"
                onClick={handleAddAssetId}
                disabled={!topAssetInput.trim() || topAssetIds.length >= 10}
                className="h-[48px] px-[16px] bg-slate-800 text-white text-[14px] font-semibold rounded-[12px] hover:bg-slate-900 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Tambah ID</span>
                <span className="sm:hidden">Tambah</span>
              </button>
            </div>

            {errors.topAssetIds && (
              <p className="text-[13px] text-rose-600 mt-[6px] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" /> {errors.topAssetIds}
              </p>
            )}

            {topAssetIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-[12px] mt-[6px]">
                {topAssetIds.map((id, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-mono rounded-md shadow-2xs"
                  >
                    <span>#{id}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAssetId(index)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Hapus ID"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-[13px] text-slate-500 mt-[6px]">
              Simpan nomor ID aset terlaris pada pencarian untuk dijadikan acuan konten.
            </p>
          </div>

          {/* Row 6: Catatan */}
          <div className="box-border w-full min-w-0 max-w-full">
            <label className="block text-[12px] font-semibold text-slate-700 uppercase tracking-[0.04em] mb-[6px]">
              Catatan (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Ide variasi sudut pandang, tema warna, format orientasi (horizontal/vertical), dll."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="box-border w-full min-w-0 max-w-full text-[16px] font-normal font-sans text-slate-900 placeholder:text-[16px] placeholder:text-slate-400 bg-white border border-slate-300 rounded-[12px] p-[14px] focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[13px] text-slate-500 mt-[6px]">
              Catatan strategi produksi, komposisi, atau referensi penting lainnya.
            </p>
          </div>

          {/* Form Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <span className="text-[12px] text-slate-500 italic text-center sm:text-left">
              * Indikator relatif, bukan angka mutlak.
            </span>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto h-[48px] px-5 text-[14px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-[12px] transition-colors cursor-pointer flex items-center justify-center"
              >
                Batal
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto h-[48px] px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-[14px] font-bold rounded-[12px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {editingEntry ? 'Perbarui Data' : 'Simpan Riset'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
