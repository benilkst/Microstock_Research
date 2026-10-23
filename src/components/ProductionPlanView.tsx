import React, { useState, useMemo } from 'react';
import { 
  ProductionPlanItem, 
  ProductionStatus, 
  AssetType, 
  Platform, 
  AppSettings,
  SeasonalMoment,
  MyDataAsset,
  KeywordEntry
} from '../types/microstock';
import { 
  calculatePriorityScore, 
  determineSeasonalFactor, 
  evaluateSeasonalFactorDetail,
  determineDataFactor, 
  computeSeasonalMoment, 
  computeAssetTypeAnalytics,
  formatIndonesianDate,
  getTodayDateString,
  getDaysDifferenceFromToday,
  isReadyForEvaluation
} from '../utils/calculator';
import { 
  exportProductionPlanToCSV, 
  triggerDownloadFile 
} from '../utils/storage';
import { 
  ListPlus, 
  Filter, 
  Download, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  BarChart2, 
  Layers, 
  Trash2, 
  Edit3, 
  ArrowUpDown, 
  HelpCircle, 
  ChevronRight,
  ExternalLink,
  Tag,
  Flame,
  Check,
  X,
  FileCheck2
} from 'lucide-react';
import { BacktestEvaluationModal } from './BacktestEvaluationModal';
import { HelpTooltipButton } from './HelpTooltipButton';

interface ProductionPlanViewProps {
  planItems: ProductionPlanItem[];
  settings: AppSettings;
  seasonalMoments: SeasonalMoment[];
  myDataAssets: MyDataAsset[];
  keywords?: KeywordEntry[];
  onUpdatePlanItems: (items: ProductionPlanItem[]) => void;
  onSelectTab: (tab: any) => void;
  onOpenSettings: () => void;
  onOpenGuide?: (sectionId: string) => void;
}

const STATUS_LIST: { status: ProductionStatus; label: string; color: string; badgeColor: string }[] = [
  { status: 'Ide', label: '1. Ide', color: 'border-slate-300', badgeColor: 'bg-slate-100 text-slate-800 border-slate-300' },
  { status: 'Riset', label: '2. Riset', color: 'border-indigo-300', badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { status: 'Produksi', label: '3. Produksi', color: 'border-amber-300', badgeColor: 'bg-amber-50 text-amber-800 border-amber-200' },
  { status: 'Diunggah', label: '4. Diunggah', color: 'border-blue-300', badgeColor: 'bg-blue-50 text-blue-800 border-blue-200' },
  { status: 'Dievaluasi', label: '5. Dievaluasi', color: 'border-emerald-300', badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
];

export const ProductionPlanView: React.FC<ProductionPlanViewProps> = ({
  planItems,
  settings,
  seasonalMoments,
  myDataAssets,
  keywords,
  onUpdatePlanItems,
  onSelectTab,
  onOpenSettings,
  onOpenGuide,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('Semua');
  const [onlyReadyForEvaluation, setOnlyReadyForEvaluation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'priority_desc' | 'priority_asc' | 'opportunity_desc' | 'date_desc'>('priority_desc');

  // Backtest Modal State (Fase 5A)
  const [isBacktestModalOpen, setIsBacktestModalOpen] = useState(false);

  // Modal / Form state for Add or Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductionPlanItem | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formAssetType, setFormAssetType] = useState<AssetType>('Foto nyata');
  const [formPlatform, setFormPlatform] = useState<Platform>('Adobe Stock');
  const [formStatus, setFormStatus] = useState<ProductionStatus>('Ide');
  const [formOpportunity, setFormOpportunity] = useState<number>(75);
  const [formCategory, setFormCategory] = useState('');
  const [formMomentName, setFormMomentName] = useState('');
  const [formUploadedDate, setFormUploadedDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // 1. Analitik Data Saya untuk mencocokkan faktor data
  const myDataAnalytics = useMemo(() => {
    return computeAssetTypeAnalytics(myDataAssets, settings.categoryThresholds);
  }, [myDataAssets, settings.categoryThresholds]);

  // 2. Evaluasi Momen Musiman untuk mencocokkan faktor musim
  const computedMoments = useMemo(() => {
    return seasonalMoments.map((m) => computeSeasonalMoment(m));
  }, [seasonalMoments]);

  // Hitung ulang skor prioritas untuk setiap item dengan faktor terbaru
  const itemsWithComputedScores = useMemo(() => {
    return planItems.map((item) => {
      // a. Tentukan faktor musim & alasan mendalam
      const seasonDetail = evaluateSeasonalFactorDetail(
        item.seasonalMomentName,
        seasonalMoments,
        settings.productionFactors
      );
      const seasonalFactor = seasonDetail.factor;

      // b. Tentukan status kategori jika ada
      let catStatus: any = null;
      if (item.categoryName) {
        const typeCats = myDataAnalytics[item.assetType]?.categories || [];
        const found = typeCats.find((c) => c.category.toLowerCase() === item.categoryName?.toLowerCase());
        if (found) catStatus = found.status;
      }
      const dataFactor = determineDataFactor(catStatus, settings.productionFactors);

      const priorityScore = calculatePriorityScore(item.opportunityScore, seasonalFactor, dataFactor);

      // Cek evaluasi 60 hari jika status Diunggah
      const evalStatus = isReadyForEvaluation(item.uploadedDate, 60);

      return {
        ...item,
        seasonalFactor,
        seasonalReason: seasonDetail.reason,
        seasonalEmptyPeakWarning: seasonDetail.hasEmptyPeakDate,
        dataFactor,
        priorityScore,
        isReadyEval: item.status === 'Diunggah' && evalStatus.ready,
        daysSinceUpload: evalStatus.daysAgo,
      };
    });
  }, [planItems, settings.productionFactors, seasonalMoments, myDataAnalytics]);

  // Hitung berapa banyak item yang siap dievaluasi (60+ hari)
  const readyForEvalCount = useMemo(() => {
    return itemsWithComputedScores.filter((item) => item.isReadyEval).length;
  }, [itemsWithComputedScores]);

  // Filter & Urutkan
  const filteredItems = useMemo(() => {
    let result = itemsWithComputedScores;

    // Filter Siap Evaluasi khusus
    if (onlyReadyForEvaluation) {
      result = result.filter((item) => item.isReadyEval);
    } else if (statusFilter !== 'Semua') {
      result = result.filter((item) => item.status === statusFilter);
    }

    if (assetTypeFilter !== 'Semua') {
      result = result.filter((item) => item.assetType === assetTypeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.titleOrKeyword.toLowerCase().includes(q) ||
          item.notes?.toLowerCase().includes(q) ||
          item.categoryName?.toLowerCase().includes(q) ||
          item.seasonalMomentName?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'priority_desc') return b.priorityScore - a.priorityScore;
      if (sortBy === 'priority_asc') return a.priorityScore - b.priorityScore;
      if (sortBy === 'opportunity_desc') return b.opportunityScore - a.opportunityScore;
      if (sortBy === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

    return result;
  }, [itemsWithComputedScores, onlyReadyForEvaluation, statusFilter, assetTypeFilter, searchQuery, sortBy]);

  // Manual Status Change
  const handleChangeStatus = (id: string, newStatus: ProductionStatus) => {
    const now = getTodayDateString();
    const updated = planItems.map((item) => {
      if (item.id === id) {
        // Jika status berpindah ke 'Diunggah' dan belum ada tanggal unggah, catat hari ini
        const uploadedDate = newStatus === 'Diunggah' ? (item.uploadedDate || now) : item.uploadedDate;
        return {
          ...item,
          status: newStatus,
          uploadedDate,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });
    onUpdatePlanItems(updated);
  };

  // Delete Item
  const handleDeleteItem = (id: string) => {
    if (confirm('Hapus item ini dari Rencana Produksi?')) {
      const next = planItems.filter((i) => i.id !== id);
      onUpdatePlanItems(next);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormAssetType('Foto nyata');
    setFormPlatform('Adobe Stock');
    setFormStatus('Ide');
    setFormOpportunity(70);
    setFormCategory('');
    setFormMomentName('');
    setFormUploadedDate('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: ProductionPlanItem) => {
    setEditingItem(item);
    setFormTitle(item.titleOrKeyword);
    setFormAssetType(item.assetType);
    setFormPlatform(item.platform);
    setFormStatus(item.status);
    setFormOpportunity(item.opportunityScore);
    setFormCategory(item.categoryName || '');
    setFormMomentName(item.seasonalMomentName || '');
    setFormUploadedDate(item.uploadedDate || '');
    setFormNotes(item.notes || '');
    setIsModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const now = new Date().toISOString();

    // Hitung faktor awal
    const sFactor = settings.productionFactors.seasonalNone;
    const dFactor = settings.productionFactors.dataPertahankan;
    const pScore = calculatePriorityScore(formOpportunity, sFactor, dFactor);

    if (editingItem) {
      const updated = planItems.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              titleOrKeyword: formTitle.trim(),
              assetType: formAssetType,
              platform: formPlatform,
              status: formStatus,
              opportunityScore: formOpportunity,
              categoryName: formCategory.trim() || undefined,
              seasonalMomentName: formMomentName.trim() || undefined,
              uploadedDate: formStatus === 'Diunggah' ? (formUploadedDate || getTodayDateString()) : formUploadedDate || undefined,
              notes: formNotes.trim() || undefined,
              updatedAt: now,
            }
          : item
      );
      onUpdatePlanItems(updated);
    } else {
      const newItem: ProductionPlanItem = {
        id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        titleOrKeyword: formTitle.trim(),
        assetType: formAssetType,
        platform: formPlatform,
        status: formStatus,
        opportunityScore: formOpportunity,
        seasonalFactor: sFactor,
        dataFactor: dFactor,
        priorityScore: pScore,
        sourceType: 'manual',
        categoryName: formCategory.trim() || undefined,
        seasonalMomentName: formMomentName.trim() || undefined,
        uploadedDate: formStatus === 'Diunggah' ? (formUploadedDate || getTodayDateString()) : undefined,
        notes: formNotes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      onUpdatePlanItems([newItem, ...planItems]);
    }

    setIsModalOpen(false);
  };

  // Ekspor CSV Rencana Produksi
  const handleExportCSV = () => {
    const csvContent = exportProductionPlanToCSV(planItems);
    triggerDownloadFile(
      csvContent,
      `rencana_produksi_${getTodayDateString()}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner & Priority Formula Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white tracking-wide">
                <ListPlus className="w-3.5 h-3.5 text-emerald-400" />
                Alur Produksi Konten
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {planItems.length} item dalam rencana
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Rencana Produksi &amp; Skor Prioritas
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Kelola alur kerja dari Ide &rarr; Riset &rarr; Produksi &rarr; Diunggah &rarr; Dievaluasi. Skor prioritas dikalkulasi secara matematis menggabungkan potensi pasar, momentum musim, dan data portofolio Anda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBacktestModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Buka Evaluasi Riset & Backtest 60 hari"
            >
              <FileCheck2 className="w-4 h-4 text-indigo-600" />
              Evaluasi Riset (Backtest)
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-200 text-indigo-900 text-[10px] font-mono">
                {planItems.filter((i) => i.status === 'Dievaluasi').length}
              </span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor CSV Rencana
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Rencana Manual
            </button>
          </div>
        </div>

        {/* Priority Formula Transparency Box */}
        <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold">
                Rumus Skor Prioritas:
              </span>
              <code className="bg-black/50 px-2 py-0.5 rounded font-mono text-xs text-emerald-300">
                skor_prioritas = peluang &times; faktor_musim &times; faktor_data
              </code>
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-xs text-slate-300 hover:text-white underline cursor-pointer"
            >
              Ubah Faktor di Pengaturan &rarr;
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px] text-slate-300 pt-1 border-t border-slate-800">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 block font-semibold">Faktor Musim:</span>
                <HelpTooltipButton topic="faktor_musim" onOpenGuide={onOpenGuide} className="text-slate-400 hover:text-white" />
              </div>
              <span>1,2 (dalam jendela) &bull; 1,0 (normal/tidak ada) &bull; 0,5 (lewat)</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Faktor Data:</span>
              <span>1,2 (Perbanyak) &bull; 1,0 (Pertahankan/belum cukup) &bull; 0,7 (Kurangi)</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Siklus Evaluasi 60 Hari:</span>
              <span>Setelah 60 hari berstatus Diunggah, siap ditinjau dengan data nyata.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Ready Notification Banner */}
      {readyForEvalCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                Ada {readyForEvalCount} item siap dievaluasi (&ge; 60 hari sejak diunggah)
              </h4>
              <p className="text-xs text-slate-600">
                Aset-aset ini telah tayang di pasar selama 2 bulan. Periksa performa unduhan aslinya di tab Data Saya.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setOnlyReadyForEvaluation(!onlyReadyForEvaluation);
                setStatusFilter('Semua');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                onlyReadyForEvaluation
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-50'
              }`}
            >
              {onlyReadyForEvaluation ? 'Tampilkan Semua Status' : 'Filter Siap Dievaluasi Saja'}
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('mydata')}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              Buka Data Saya
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Filter and Status Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('Semua');
                setOnlyReadyForEvaluation(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'Semua' && !onlyReadyForEvaluation
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({planItems.length})
            </button>

            {STATUS_LIST.map((s) => {
              const count = planItems.filter((i) => i.status === s.status).length;
              const active = statusFilter === s.status && !onlyReadyForEvaluation;
              return (
                <button
                  key={s.status}
                  type="button"
                  onClick={() => {
                    setStatusFilter(s.status);
                    setOnlyReadyForEvaluation(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-slate-900 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{s.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setOnlyReadyForEvaluation(!onlyReadyForEvaluation)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                onlyReadyForEvaluation
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span>Siap Dievaluasi (60+ Hari)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${onlyReadyForEvaluation ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                {readyForEvalCount}
              </span>
            </button>
          </div>

          {/* Asset Type Filter & Sort */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={assetTypeFilter}
              onChange={(e) => setAssetTypeFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Semua">Semua Tipe Aset</option>
              <option value="Foto nyata">Foto nyata</option>
              <option value="Foto AI-generated">Foto AI</option>
              <option value="Ilustrasi AI-generated">Ilustrasi AI</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="priority_desc">Skor Prioritas Tertinggi</option>
              <option value="priority_asc">Skor Prioritas Terendah</option>
              <option value="opportunity_desc">Skor Peluang Tertinggi</option>
              <option value="date_desc">Terbaru Ditambahkan</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cari rencana produksi berdasarkan judul, kata kunci, kategori, atau momen musiman..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 pl-9 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ITEMS LIST */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-3">
          <ListPlus className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">Tidak ada item rencana yang cocok</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {onlyReadyForEvaluation
              ? 'Belum ada aset yang diunggah lebih dari 60 hari yang lalu.'
              : 'Tambahkan rencana baru secara manual atau gunakan tombol "Masukkan ke Rencana" dari tabel riset kata kunci dan ide niche.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Rencana Baru
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const currentStatusCfg = STATUS_LIST.find((s) => s.status === item.status) || STATUS_LIST[0];

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300 ${
                  item.isReadyEval ? 'border-emerald-300 bg-emerald-50/20 ring-1 ring-emerald-300' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Info & Badges */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${currentStatusCfg.badgeColor}`}>
                        {item.status}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {item.assetType}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {item.platform}
                      </span>
                      {item.isReadyEval && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white animate-pulse">
                          Siap Dievaluasi (60+ Hari)
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-base">
                      {item.titleOrKeyword}
                    </h3>

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {item.categoryName && (
                        <span>
                          Kategori: <strong className="text-slate-800">{item.categoryName}</strong>
                        </span>
                      )}
                      {item.seasonalMomentName && (
                        <span>
                          &bull; Musim: <strong className="text-slate-800">{item.seasonalMomentName}</strong>
                        </span>
                      )}
                      {item.uploadedDate && (
                        <span>
                          &bull; Tanggal Unggah: <strong>{formatIndonesianDate(item.uploadedDate)}</strong>
                          <span className="text-[11px] text-slate-400 ml-1">({item.daysSinceUpload} hari lalu)</span>
                        </span>
                      )}
                      {item.sourceType && (
                        <span>
                          &bull; Sumber: <span className="capitalize">{item.sourceType}</span>
                        </span>
                      )}
                    </div>

                    {/* Faktor Musim dan Alasannya */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        item.seasonalFactor === 1.2
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : item.seasonalFactor === 0.5
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{item.seasonalReason}</span>
                      </span>

                      {item.seasonalEmptyPeakWarning && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Peringatan: Tanggal puncak momen ini kosong di Kalender!</span>
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Right: Scores & Action Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:self-center shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                    {/* Scores Calculation Display */}
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center min-w-[170px]">
                      <div className="text-[10px] text-slate-500 font-semibold mb-0.5 flex items-center justify-center gap-1">
                        <span>Peluang</span>
                        <span>&times;</span>
                        <span className="inline-flex items-center gap-0.5">
                          Musim
                          <HelpTooltipButton topic="faktor_musim" onOpenGuide={onOpenGuide} className="text-slate-400 hover:text-slate-700" />
                        </span>
                        <span>&times;</span>
                        <span>Data</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-700 font-medium">
                        {item.opportunityScore} &times; {item.seasonalFactor} &times; {item.dataFactor}
                      </div>
                      <div className="mt-1 pt-1 border-t border-slate-200/80 flex items-center justify-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Prioritas:</span>
                        <span className="font-mono text-sm font-black text-emerald-700">
                          {item.priorityScore}
                        </span>
                      </div>
                    </div>

                    {/* Manual Status Stepper / Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Pindahkan Status:
                      </label>
                      <div className="flex items-center gap-1">
                        {STATUS_LIST.map((s) => {
                          const isCurrent = item.status === s.status;
                          return (
                            <button
                              key={s.status}
                              type="button"
                              onClick={() => handleChangeStatus(item.id, s.status)}
                              className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-slate-900 text-white shadow-2xs ring-1 ring-slate-900'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                              title={`Ubah status ke ${s.status}`}
                            >
                              {s.status}
                            </button>
                          );
                        })}
                      </div>

                      {item.isReadyEval && (
                        <button
                          type="button"
                          onClick={() => onSelectTab('mydata')}
                          className="w-full mt-1.5 text-center text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-1 rounded border border-emerald-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          Tautkan ke Data Saya &rarr;
                        </button>
                      )}
                    </div>

                    {/* Edit & Delete */}
                    <div className="flex items-center gap-1 sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Item Rencana"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Tambah / Edit Rencana Produksi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="font-bold text-slate-900 text-base">
                {editingItem ? 'Edit Item Rencana Produksi' : 'Tambah Rencana Produksi'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Judul Konten / Kata Kunci Target *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="misal: Lanskap Sawah Terasering Jatiluwih Bali"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tipe Aset *
                  </label>
                  <select
                    value={formAssetType}
                    onChange={(e) => setFormAssetType(e.target.value as AssetType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                  >
                    <option value="Foto nyata">Foto nyata</option>
                    <option value="Foto AI-generated">Foto AI-generated</option>
                    <option value="Ilustrasi AI-generated">Ilustrasi AI-generated</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Platform Microstock *
                  </label>
                  <select
                    value={formPlatform}
                    onChange={(e) => setFormPlatform(e.target.value as Platform)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                  >
                    <option value="Adobe Stock">Adobe Stock</option>
                    <option value="Shutterstock">Shutterstock</option>
                    <option value="Freepik">Freepik</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Status Alur Kerja *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ProductionStatus)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                  >
                    <option value="Ide">Ide</option>
                    <option value="Riset">Riset</option>
                    <option value="Produksi">Produksi</option>
                    <option value="Diunggah">Diunggah</option>
                    <option value="Dievaluasi">Dievaluasi</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Skor Peluang Basis (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formOpportunity}
                    onChange={(e) => setFormOpportunity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-mono"
                  />
                </div>
              </div>

              {formStatus === 'Diunggah' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Unggah (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={formUploadedDate}
                    onChange={(e) => setFormUploadedDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Otomatis dihitung untuk memicu status &ldquo;Siap Dievaluasi&rdquo; setelah 60 hari.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kategori Portofolio (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="misal: Lanskap & Pertanian Bali"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Momen Terkait (Pilihan dari Kalender)
                  </label>
                  <select
                    value={formMomentName}
                    onChange={(e) => setFormMomentName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs cursor-pointer"
                  >
                    <option value="">-- Tanpa Momen Terkait (Faktor 1.0) --</option>
                    {seasonalMoments.map((m) => {
                      const isPeakEmpty = !m.peakDate || !m.peakDate.trim();
                      return (
                        <option key={m.id} value={m.name}>
                          {m.name} {isPeakEmpty ? '(⚠️ Puncak Kosong)' : `(Puncak: ${formatIndonesianDate(m.peakDate)})`}
                        </option>
                      );
                    })}
                  </select>
                  {formMomentName && seasonalMoments.find((m) => m.name.toLowerCase() === formMomentName.toLowerCase() && (!m.peakDate || !m.peakDate.trim())) && (
                    <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Peringatan: Tanggal puncak momen ini belum diisi di Kalender!
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Eksekusi &amp; Sudut Pengambilan
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Catatan konsep visual, pencahayaan, copy space, talent..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  Simpan Rencana
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Evaluasi Riset (Backtest) - Fase 5A */}
      <BacktestEvaluationModal
        isOpen={isBacktestModalOpen}
        onClose={() => setIsBacktestModalOpen(false)}
        productionPlan={planItems}
        myDataAssets={myDataAssets}
        keywords={keywords || []}
      />
    </div>
  );
};
