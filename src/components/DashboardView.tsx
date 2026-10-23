import React, { useState, useMemo } from 'react';
import { AssetType, KeywordEntry, Platform, AppSettings, KeywordWithMetrics } from '../types/microstock';
import { computeKeywordMetrics, formatIndonesianDate, getSaturationBenchmark, computeDataHealthMetrics } from '../utils/calculator';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  ExternalLink, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  Edit3, 
  Trash2, 
  PlusCircle, 
  Info,
  Calendar,
  Sparkles,
  Camera,
  Bot,
  Palette,
  FileText,
  ListPlus,
  ChevronLeft,
  ChevronRight,
  RotateCw
} from 'lucide-react';

import { HelpTooltipButton } from './HelpTooltipButton';

interface DashboardViewProps {
  keywords: KeywordEntry[];
  settings: AppSettings;
  onOpenAddModal: (prefillKeyword?: string) => void;
  onEditEntry: (entry: KeywordEntry) => void;
  onDeleteEntry: (id: string) => void;
  onViewHistory: (keyword: string) => void;
  onSelectMomentTab?: () => void;
  activeMomentCount?: number;
  onAddToProductionPlan?: (item: any) => void;
  onOpenReportModal?: () => void;
  onOpenRecheckQueue?: () => void;
  onOpenGuide?: (sectionId: string) => void;
}

const ASSET_TYPES: { type: AssetType; icon: React.ReactNode; label: string }[] = [
  { type: 'Foto nyata', icon: <Camera className="w-4 h-4" />, label: 'Foto Nyata' },
  { type: 'Foto AI-generated', icon: <Bot className="w-4 h-4" />, label: 'Foto AI' },
  { type: 'Ilustrasi AI-generated', icon: <Palette className="w-4 h-4" />, label: 'Ilustrasi AI' },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  keywords,
  settings,
  onOpenAddModal,
  onEditEntry,
  onDeleteEntry,
  onViewHistory,
  onSelectMomentTab,
  activeMomentCount = 0,
  onAddToProductionPlan,
  onOpenReportModal,
  onOpenRecheckQueue,
  onOpenGuide,
}) => {
  // CRITICAL REQUIREMENT: Tipe aset berbeda TIDAK boleh digabung dalam satu peringkat
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>('Foto nyata');
  const [platformFilter, setPlatformFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'opportunity_desc' | 'opportunity_asc' | 'results_asc' | 'results_desc' | 'date_desc' | 'demand_desc'>('opportunity_desc');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('Semua');
  const [activeReasonModal, setActiveReasonModal] = useState<KeywordWithMetrics | null>(null);

  // Fase 4: Paginasi untuk menjaga performa cepat dengan 500+ entri
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [addedKeywordToast, setAddedKeywordToast] = useState<string | null>(null);

  // Reset pagination on filter change
  const handleSelectAssetType = (type: AssetType) => {
    setSelectedAssetType(type);
    setCurrentPage(1);
  };

  // Filter dan hitung metrik STRICTLY per asset type
  const processedList = useMemo(() => {
    // 1. Filter strictly by Asset Type (Rule: tidak boleh digabung)
    const byAssetType = keywords.filter((k) => k.assetType === selectedAssetType);

    // 2. Hitung metrik rumus untuk masing-masing item
    const withMetrics: KeywordWithMetrics[] = byAssetType.map((item) => ({
      ...item,
      metrics: computeKeywordMetrics(item, settings),
    }));

    // 3. Filter platform
    let filtered = withMetrics;
    if (platformFilter !== 'Semua') {
      filtered = filtered.filter((item) => item.platform === platformFilter);
    }

    // 4. Filter skor kepercayaan
    if (confidenceFilter !== 'Semua') {
      filtered = filtered.filter((item) => item.metrics.confidenceLevel === confidenceFilter);
    }

    // 5. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.keyword.toLowerCase().includes(q) ||
          item.notes.toLowerCase().includes(q) ||
          item.demandSource.toLowerCase().includes(q) ||
          item.topAssetIds.some((id) => id.toLowerCase().includes(q))
      );
    }

    // 6. Sort
    filtered.sort((a, b) => {
      if (sortBy === 'opportunity_desc') return b.metrics.opportunityScore - a.metrics.opportunityScore;
      if (sortBy === 'opportunity_asc') return a.metrics.opportunityScore - b.metrics.opportunityScore;
      if (sortBy === 'results_asc') return a.searchResultCount - b.searchResultCount;
      if (sortBy === 'results_desc') return b.searchResultCount - a.searchResultCount;
      if (sortBy === 'demand_desc') return (b.demandScore || 0) - (a.demandScore || 0);
      if (sortBy === 'date_desc') return new Date(b.checkDate).getTime() - new Date(a.checkDate).getTime();
      return 0;
    });

    return filtered;
  }, [keywords, selectedAssetType, platformFilter, confidenceFilter, searchQuery, sortBy, settings]);

  // Overall summary metrics across the whole database
  const allWithMetrics = useMemo(() => {
    return keywords.map((k) => ({
      ...k,
      metrics: computeKeywordMetrics(k, settings),
    }));
  }, [keywords, settings]);

  const highOpportunityCount = useMemo(() => {
    return allWithMetrics.filter((k) => k.metrics.opportunityScore >= 70).length;
  }, [allWithMetrics]);

  const avgOpportunity = useMemo(() => {
    if (processedList.length === 0) return 0;
    const sum = processedList.reduce((acc, curr) => acc + curr.metrics.opportunityScore, 0);
    return Math.round((sum / processedList.length) * 10) / 10;
  }, [processedList]);

  // Fase 4: Paginasi responsif untuk performa tinggi dengan 500+ entri
  const totalPages = Math.max(1, Math.ceil(processedList.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedList = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return processedList.slice(start, start + pageSize);
  }, [processedList, safeCurrentPage, pageSize]);

  // Fase 5A: Metrik Kesehatan Data & Peringatan Typo
  const dataHealth = useMemo(() => computeDataHealthMetrics(keywords), [keywords]);
  const typoAlertsMap = useMemo(() => {
    const map = new Map<string, typeof dataHealth.typoAlerts[0]>();
    dataHealth.typoAlerts.forEach((a) => map.set(a.keywordId, a));
    return map;
  }, [dataHealth]);

  // Fase 5A: Deteksi perbandingan lintas platform dengan acuan jenuh berbeda
  const platformsInList = useMemo(() => Array.from(new Set(processedList.map((item) => item.platform))), [processedList]);
  const differingBenchmarkPlatforms = useMemo(() => {
    if (platformsInList.length <= 1) return null;
    const entries: { platform: Platform; benchmark: number }[] = platformsInList.map((p) => ({
      platform: p,
      benchmark: getSaturationBenchmark(settings, p, selectedAssetType),
    }));
    const uniqueValues = new Set(entries.map((e) => e.benchmark));
    if (uniqueValues.size > 1) {
      return entries;
    }
    return null;
  }, [platformsInList, settings, selectedAssetType]);

  // Fase 5A: Jumlah entri stale (>14 hari) untuk antrean cek ulang
  const staleKeywordsCount = useMemo(() => {
    return keywords.filter((k) => {
      const diff = Math.floor((new Date().getTime() - new Date(k.checkDate).getTime()) / (1000 * 60 * 60 * 24));
      return diff > 14;
    }).length;
  }, [keywords]);

  const handleQuickAddToPlan = (item: KeywordWithMetrics) => {
    if (onAddToProductionPlan) {
      onAddToProductionPlan({
        titleOrKeyword: item.keyword,
        assetType: item.assetType,
        platform: item.platform,
        opportunityScore: item.metrics.opportunityScore,
        sourceType: 'riset',
        sourceKeywordId: item.id,
      });
      setAddedKeywordToast(item.keyword);
      setTimeout(() => setAddedKeywordToast(null), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Universal Mandatory Notice Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-900 text-white rounded-xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Info className="w-4 h-4" />
          </span>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-100">
              Prinsip Peringkat: Indikator Relatif, Bukan Angka Mutlak
            </p>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Peringkat dipisahkan ketat per tipe aset agar foto asli, foto AI, dan ilustrasi AI dinilai secara adil.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenRecheckQueue && staleKeywordsCount > 0 && (
            <button
              type="button"
              onClick={onOpenRecheckQueue}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <RotateCw className="w-4 h-4 text-amber-700" />
              <span>Antrean Cek ({staleKeywordsCount})</span>
            </button>
          )}

          {onOpenReportModal && (
            <button
              type="button"
              onClick={onOpenReportModal}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer border border-slate-700 shadow-xs"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              Buat Laporan
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenAddModal()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Tambah Kata Kunci
          </button>
        </div>
      </div>

      {addedKeywordToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between text-xs font-semibold animate-fade-in">
          <span>&ldquo;{addedKeywordToast}&rdquo; berhasil dimasukkan ke Rencana Produksi!</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">Total Kata Kunci</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{keywords.length}</span>
            <span className="text-xs text-slate-400">entri tersimpan</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">Rata-rata Peluang ({selectedAssetType})</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-600">{avgOpportunity}</span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">Peluang Tinggi (&ge; 70)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-indigo-600">{highOpportunityCount}</span>
            <span className="text-xs text-slate-400">dari total aset</span>
          </div>
        </div>

        <div 
          onClick={onSelectMomentTab}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer group"
        >
          <span className="text-xs text-slate-500 block mb-1 flex items-center justify-between">
            <span>Jendela Unggah Aktif</span>
            <Calendar className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-600">{activeMomentCount}</span>
            <span className="text-xs text-slate-400">momen musiman</span>
          </div>
        </div>
      </div>

      {/* STRICT ASSET TYPE SELECTOR TABS */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between px-2 py-1 mb-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            Pilih Peringkat Berdasarkan Tipe Aset (Wajib Terpisah)
          </span>
          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            Tidak digabung untuk akurasi persaingan
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {ASSET_TYPES.map((item) => {
            const count = keywords.filter((k) => k.assetType === item.type).length;
            const isSelected = selectedAssetType === item.type;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => setSelectedAssetType(item.type)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-md ${
                      isSelected ? 'bg-white/10 text-white' : 'bg-white text-slate-600 shadow-2xs'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <span className="font-semibold text-xs sm:text-sm block leading-tight">
                      {item.label}
                    </span>
                    <span
                      className={`text-[11px] block mt-0.5 ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {count} kata kunci riset
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500 text-white">
                    Peringkat Aktif
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={`Cari kata kunci di kategori ${selectedAssetType}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3.5 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Platform Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium shrink-0">Platform:</span>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="Semua">Semua Platform</option>
              <option value="Adobe Stock">Adobe Stock</option>
              <option value="Shutterstock">Shutterstock</option>
              <option value="Freepik">Freepik</option>
            </select>
          </div>

          {/* Kepercayaan Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium shrink-0">Kepercayaan:</span>
            <select
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="Semua">Semua Tingkat</option>
              <option value="Tinggi">Tinggi (Valid ≤14 hr)</option>
              <option value="Sedang">Sedang</option>
              <option value="Rendah">Rendah</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="opportunity_desc">Peluang: Tertinggi &rarr; Terendah</option>
              <option value="opportunity_asc">Peluang: Terendah &rarr; Tertinggi</option>
              <option value="results_asc">Hasil: Tersedikit (Low Competition)</option>
              <option value="results_desc">Hasil: Terbanyak</option>
              <option value="demand_desc">Permintaan: Tertinggi</option>
              <option value="date_desc">Tanggal Cek: Terbaru</option>
            </select>
          </div>
        </div>

        {/* Filter Indicator / Reset */}
        {(platformFilter !== 'Semua' || confidenceFilter !== 'Semua' || searchQuery.trim()) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Menampilkan {processedList.length} kata kunci dengan filter aktif
            </span>
            <button
              type="button"
              onClick={() => {
                setPlatformFilter('Semua');
                setConfidenceFilter('Semua');
                setSearchQuery('');
              }}
              className="text-emerald-700 hover:underline font-medium cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Fase 5A Poin 1: Peringatan perbandingan lintas platform dengan acuan berbeda */}
      {differingBenchmarkPlatforms && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-amber-900 text-xs sm:text-sm">
                Peringatan Perbandingan Lintas Platform (Acuan Jenuh Pasokan Berbeda)
              </h4>
              {onOpenGuide && <HelpTooltipButton topic="acuan_jenuh" onOpenGuide={onOpenGuide} />}
            </div>
            <p className="text-amber-800 leading-relaxed text-[11px] sm:text-xs">
              Tabel ini menampilkan kata kunci dari platform yang memiliki acuan jenuh berbeda:{' '}
              <span className="font-bold font-mono">
                {differingBenchmarkPlatforms.map((e) => `${e.platform}: ${e.benchmark.toLocaleString('id-ID')}`).join(' | ')}
              </span>.
              Skor peluang antar platform di bawah tidak dapat dibandingkan secara langsung apel-ke-apel karena dihitung menggunakan basis acuan jenuh masing-masing platform.
            </p>
          </div>
        </div>
      )}

      {/* Leaderboard Table / Cards */}
      {processedList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Belum Ada Data untuk Kategori {selectedAssetType}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Mulai riset dengan menambahkan kata kunci baru untuk melihat skor peluang kompetisi pasokan dan permintaan.
          </p>
          <button
            type="button"
            onClick={() => onOpenAddModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Riset Baru
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Kata Kunci & Platform</th>
                  <th className="py-3 px-4">Skor Peluang (0-100)</th>
                  <th className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <span>Pasokan (Hasil)</span>
                      {onOpenGuide && <HelpTooltipButton topic="jumlah_hasil" onOpenGuide={onOpenGuide} />}
                    </div>
                  </th>
                  <th className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <span>Permintaan</span>
                      {onOpenGuide && <HelpTooltipButton topic="skor_permintaan" onOpenGuide={onOpenGuide} />}
                    </div>
                  </th>
                  <th className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <span>Kepercayaan</span>
                      {onOpenGuide && <HelpTooltipButton topic="skor_kepercayaan" onOpenGuide={onOpenGuide} />}
                    </div>
                  </th>
                  <th className="py-3 px-4">Tanggal Cek</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedList.map((item, index) => {
                  const rankNumber = (safeCurrentPage - 1) * pageSize + index + 1;
                  const opp = item.metrics.opportunityScore;
                  const oppColor =
                    opp >= 70
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : opp >= 50
                      ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                      : 'text-amber-700 bg-amber-50 border-amber-200';

                  const confColor =
                    item.metrics.confidenceLevel === 'Tinggi'
                      ? 'text-emerald-700'
                      : item.metrics.confidenceLevel === 'Sedang'
                      ? 'text-amber-700'
                      : 'text-rose-700';

                  const typoAlert = typoAlertsMap.get(item.id);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Peringkat Position */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400 font-mono">
                        {rankNumber === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                            1
                          </span>
                        ) : rankNumber === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 text-xs font-bold">
                            2
                          </span>
                        ) : rankNumber === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                            3
                          </span>
                        ) : (
                          `#${rankNumber}`
                        )}
                      </td>

                      {/* Kata Kunci & Platform */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 text-sm mb-1 truncate flex items-center flex-wrap gap-1.5" title={item.keyword}>
                          <span className="truncate">{item.keyword}</span>
                          {item.isAiSuggested && !item.isConfirmedByUser && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 shrink-0 font-sans tracking-tight" title="Data disarankan AI dan belum dikonfirmasi manual">
                              belum dikonfirmasi
                            </span>
                          )}
                          {typoAlert && (
                            <button
                              type="button"
                              onClick={() => onEditEntry(item)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 transition-colors cursor-pointer shrink-0"
                              title={`${typoAlert.reason} - Klik untuk verifikasi & perbaiki`}
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>Periksa kemungkinan salah ketik ({typoAlert.percentChange}%)</span>
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span
                            className={`font-semibold ${
                              item.platform === 'Adobe Stock'
                                ? 'text-red-700'
                                : item.platform === 'Shutterstock'
                                ? 'text-rose-700'
                                : 'text-blue-700'
                            }`}
                          >
                            {item.platform}
                          </span>
                          <span aria-hidden="true">&middot;</span>
                          <span>{item.assetType}</span>
                          {item.topAssetIds.length > 0 && (
                            <>
                              <span aria-hidden="true">&middot;</span>
                              <span className="font-mono text-slate-400">{item.topAssetIds.length} ID teratas</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Skor Peluang */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-md font-mono font-bold text-sm border ${oppColor}`}>
                            {opp.toFixed(1)}
                          </span>
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(100, opp)}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          indikator relatif
                        </span>
                      </td>

                      {/* Pasokan */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-slate-900 block">
                          {item.searchResultCount.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          skor: {item.metrics.supplyScore.toFixed(3)}
                        </span>
                      </td>

                      {/* Permintaan */}
                      <td className="py-3.5 px-4">
                        {item.demandScore ? (
                          <div>
                            <span className="font-semibold text-slate-800">
                              ★ {item.demandScore} / 5
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate max-w-[130px]" title={item.demandSource}>
                              {item.demandSource || '-'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum diisi</span>
                        )}
                      </td>

                      {/* Skor Kepercayaan */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => setActiveReasonModal(item)}
                          className={`inline-flex items-center gap-1 font-semibold ${confColor} hover:underline cursor-pointer`}
                          title="Klik untuk melihat rincian evaluasi kepercayaan"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{item.metrics.confidenceLevel}</span>
                          <Info className="w-3 h-3 text-slate-400" />
                        </button>
                        <div className="mt-0.5 space-y-0.5">
                          <span className="text-[11px] text-slate-400 block">
                            {item.metrics.daysAgo === 0 ? 'Hari ini' : `${item.metrics.daysAgo} hr lalu`}
                          </span>
                          {item.metrics.daysAgo > 14 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              Perlu cek ulang
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tanggal Cek */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-700 block">
                          {formatIndonesianDate(item.checkDate)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onAddToProductionPlan && (
                            <button
                              type="button"
                              onClick={() => handleQuickAddToPlan(item)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                              title="Masukkan ke Rencana Produksi"
                            >
                              <ListPlus className="w-4 h-4 text-emerald-600" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onViewHistory(item.keyword)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                            title="Lihat riwayat perkembangan grafik"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenAddModal(item.keyword)}
                            className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                            title="Catat cek baru untuk kata kunci ini"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditEntry(item)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Sunting data"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Hapus riset "${item.keyword}"?`)) {
                                onDeleteEntry(item.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Cards View */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {paginatedList.map((item, index) => {
              const rankNumber = (safeCurrentPage - 1) * pageSize + index + 1;
              const opp = item.metrics.opportunityScore;
              const oppColor =
                opp >= 70
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : opp >= 50
                  ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                  : 'text-amber-700 bg-amber-50 border-amber-200';

              const confColor =
                item.metrics.confidenceLevel === 'Tinggi'
                  ? 'text-emerald-700'
                  : item.metrics.confidenceLevel === 'Sedang'
                  ? 'text-amber-700'
                  : 'text-rose-700';

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  {/* Card Header: Rank & Keyword */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                        #{rankNumber}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug flex items-center flex-wrap gap-1.5">
                          <span>{item.keyword}</span>
                          {item.isAiSuggested && !item.isConfirmedByUser && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 shrink-0 font-sans tracking-tight">
                              belum dikonfirmasi
                            </span>
                          )}
                          {item.sumber_data && item.sumber_data !== 'manual' && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              {item.sumber_data}
                            </span>
                          )}
                          {typoAlertsMap.get(item.id) && (
                            <button
                              type="button"
                              onClick={() => onEditEntry(item)}
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1 shrink-0"
                              title={`${typoAlertsMap.get(item.id)!.reason} - Klik untuk verifikasi & perbaiki`}
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Salah ketik ({typoAlertsMap.get(item.id)!.percentChange}%)</span>
                            </button>
                          )}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-800">{item.platform}</span>
                          <span aria-hidden="true">&middot;</span>
                          <span>{item.assetType}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`px-2.5 py-1 rounded-md font-mono font-bold text-xs border ${oppColor}`}>
                        {opp.toFixed(1)}
                      </div>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        relatif
                      </span>
                    </div>
                  </div>

                  {/* Card Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">Hasil Pencarian</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {item.searchResultCount.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        pasokan: {item.metrics.supplyScore.toFixed(3)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">Permintaan</span>
                      <span className="font-semibold text-slate-800">
                        {item.demandScore ? `★ ${item.demandScore} / 5` : 'N/A'}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate" title={item.demandSource}>
                        {item.demandSource || 'Tanpa sumber'}
                      </span>
                    </div>
                  </div>

                  {/* Trust & Date Info */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveReasonModal(item)}
                      className={`inline-flex items-center gap-1 font-semibold ${confColor} cursor-pointer`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Kepercayaan: {item.metrics.confidenceLevel}</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      {item.metrics.daysAgo > 14 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          Perlu cek ulang
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {formatIndonesianDate(item.checkDate)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1.5">
                    {onAddToProductionPlan && (
                      <button
                        type="button"
                        onClick={() => handleQuickAddToPlan(item)}
                        className="py-1.5 px-2 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-md hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Masukkan ke Rencana Produksi"
                      >
                        <ListPlus className="w-3.5 h-3.5" />
                        Rencana
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onViewHistory(item.keyword)}
                      className="py-1.5 px-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Riwayat
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAddModal(item.keyword)}
                      className="py-1.5 px-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
                      title="Cek Baru"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditEntry(item)}
                      className="py-1.5 px-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
                      title="Sunting"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Hapus riset "${item.keyword}"?`)) {
                          onDeleteEntry(item.id);
                        }
                      }}
                      className="py-1.5 px-2 text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginasi Responsif (Fase 4 Poin E) */}
          {processedList.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  Menampilkan <strong>{Math.min(processedList.length, (safeCurrentPage - 1) * pageSize + 1)}</strong> - <strong>{Math.min(safeCurrentPage * pageSize, processedList.length)}</strong> dari <strong>{processedList.length}</strong> entri
                </span>
                <span className="text-slate-300 hidden sm:inline">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Per halaman:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-slate-200 bg-slate-50 rounded px-2 py-1 text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage <= 1}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-mono font-bold text-slate-800">
                    Hal {safeCurrentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage >= totalPages}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Halaman Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confidence Reason Modal / Popup */}
      {activeReasonModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Evaluasi Skor Kepercayaan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveReasonModal(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block mb-0.5 text-[11px]">Kata Kunci:</span>
                <span className="font-bold text-slate-900 text-sm">{activeReasonModal.keyword}</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-semibold text-slate-700">{activeReasonModal.platform}</span>
                  <span>&middot;</span>
                  <span>Tingkat: <strong className={
                    activeReasonModal.metrics.confidenceLevel === 'Tinggi' ? 'text-emerald-700' :
                    activeReasonModal.metrics.confidenceLevel === 'Sedang' ? 'text-amber-700' : 'text-rose-700'
                  }>{activeReasonModal.metrics.confidenceLevel}</strong></span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-900 block mb-1.5">
                  Rincian Evaluasi Kode:
                </span>
                <ul className="space-y-1.5">
                  {activeReasonModal.metrics.confidenceReasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2 bg-slate-50 p-2 rounded border border-slate-200 text-slate-700">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-2.5 bg-amber-50 rounded-lg text-amber-900 text-[11px] border border-amber-200">
                Data dianggap segar jika dicek maksimal 14 hari yang lalu, serta seluruh data permintaan dan sumber terisi lengkap.
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setActiveReasonModal(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
