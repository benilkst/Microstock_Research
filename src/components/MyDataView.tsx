import React, { useState, useRef, useMemo } from 'react';
import { 
  AssetType, 
  Platform,
  MyDataAsset, 
  ResearchCategoryMatch, 
  KeywordEntry, 
  AppSettings, 
  CalibrationPair,
  AiInsightAggregatePayload
} from '../types/microstock';
import { 
  computeAssetTypeAnalytics, 
  computeWeightCalibrationTable, 
  computeGroupCalibrationTable,
  formatIndonesianDate 
} from '../utils/calculator';
import { 
  parseCsvFilePreview, 
  autoDetectColumnMapping, 
  processFullCsvFile, 
  ColumnMappingConfig, 
  CsvPreviewResult, 
  ProcessedCsvResult 
} from '../utils/csvParser';
import { 
  requestAiInsightSummary, 
  getDailyCallStats 
} from '../utils/geminiClient';
import { 
  Upload, 
  Sliders, 
  Sparkles, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Info, 
  AlertTriangle, 
  Check, 
  ChevronRight, 
  Layers, 
  ShieldCheck, 
  Clock, 
  Link2, 
  HelpCircle,
  Eye,
  RefreshCw,
  X
} from 'lucide-react';
import { HelpTooltipButton } from './HelpTooltipButton';

interface MyDataViewProps {
  myDataAssets: MyDataAsset[];
  categoryMatches: ResearchCategoryMatch[];
  keywords: KeywordEntry[];
  settings: AppSettings;
  onUpdateAssets: (assets: MyDataAsset[]) => void;
  onUpdateMatches: (matches: ResearchCategoryMatch[]) => void;
  onApplyWeight: (demandWeight: number, supplyWeight: number, rho?: number, sampleSize?: number) => void;
  onApplyGroupWeight?: (
    platform: Platform,
    assetType: AssetType,
    demandWeight: number,
    supplyWeight: number,
    rho?: number,
    sampleSize?: number
  ) => void;
  onClearMyData: () => void;
  onOpenSettings: () => void;
  onOpenGuide?: (sectionId: string) => void;
}

export const MyDataView: React.FC<MyDataViewProps> = ({
  myDataAssets,
  categoryMatches,
  keywords,
  settings,
  onUpdateAssets,
  onUpdateMatches,
  onApplyWeight,
  onApplyGroupWeight,
  onClearMyData,
  onOpenSettings,
  onOpenGuide,
}) => {
  // Sub-tab navigasi internal Data Saya
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'calibration' | 'upload'>('analytics');
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>('Foto nyata');

  // Kalibrasi Per Grup (Fase 5A)
  const [selectedGroupScope, setSelectedGroupScope] = useState<'global' | 'group'>('global');
  const [calibPlatform, setCalibPlatform] = useState<Platform>('Adobe Stock');
  const [calibAssetType, setCalibAssetType] = useState<AssetType>('Foto nyata');
  const [groupAppliedSuccess, setGroupAppliedSuccess] = useState<string | null>(null);

  // CSV Upload & Mapping States
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreviewResult | null>(null);
  const [mappingConfig, setMappingConfig] = useState<ColumnMappingConfig>({
    dateCol: '',
    assetIdOrTitleCol: '',
    categoryCol: '',
    downloadsCol: '',
    revenueCol: '',
    assetTypeCol: '',
    fallbackAssetType: 'Foto nyata',
  });
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [csvProcessingResult, setCsvProcessingResult] = useState<ProcessedCsvResult | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Modal Konfirmasi Hapus Data
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Modal Insight AI
  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [insightNarrative, setInsightNarrative] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);

  // Modal Tambah/Edit Pencocokan Kategori (Manual Match)
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [selectedResearchIdForMatch, setSelectedResearchIdForMatch] = useState<string>('');
  const [selectedCategoryForMatch, setSelectedCategoryForMatch] = useState<string>('');

  // 1. Analitik Portofolio terpisah per tipe aset (100% kode)
  const analyticsPerType = useMemo(() => {
    return computeAssetTypeAnalytics(myDataAssets, settings.categoryThresholds);
  }, [myDataAssets, settings.categoryThresholds]);

  const currentAnalytics = analyticsPerType[selectedAssetType];

  // Daftar seluruh kategori unik yang ada di Data Saya untuk dropdown pencocokan
  const uniqueCategoriesInData = useMemo(() => {
    const set = new Set<string>();
    myDataAssets.forEach((a) => {
      if (a.category && a.category.trim()) {
        set.add(a.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [myDataAssets]);

  // 2. Evaluasi Kalibrasi Spearman
  // Hanya hitung aset yang diunggah SETELAH tanggal cek riset (date > checkDate)
  const calibrationPairs: CalibrationPair[] = useMemo(() => {
    const pairs: CalibrationPair[] = [];

    categoryMatches.forEach((match) => {
      const research = keywords.find((k) => k.id === match.researchId);
      if (!research) return;

      // Filter aset dalam kategori & tipe aset yang sama, yang diunggah SETELAH checkDate
      const postAssets = myDataAssets.filter((a) => {
        const isCatMatch = (a.category || '').trim().toLowerCase() === match.categoryName.trim().toLowerCase();
        const isTypeMatch = a.assetType === research.assetType;
        const isAfterCheck = a.date > research.checkDate;
        return isCatMatch && isTypeMatch && isAfterCheck;
      });

      const postCount = new Set(postAssets.map((a) => a.assetIdOrTitle)).size;
      const postDownloads = postAssets.reduce((acc, curr) => acc + curr.downloads, 0);
      const dpa = postCount > 0 ? Math.round((postDownloads / postCount) * 100) / 100 : 0;

      // Skor peluang saat ini dengan settings aktif
      const supplyScore = 1 - Math.log10(research.searchResultCount + 1) / 7;
      const demandScoreNorm = (research.demandScore || 0) / 5;
      const oppCurrent = Math.round((settings.demandWeight * demandScoreNorm + settings.supplyWeight * Math.max(0, Math.min(1, supplyScore))) * 1000) / 10;

      pairs.push({
        researchId: research.id,
        platform: research.platform,
        keyword: research.keyword,
        category: match.categoryName,
        assetType: research.assetType,
        checkDate: research.checkDate,
        searchResultCount: research.searchResultCount,
        demandScore: research.demandScore,
        postResearchAssetCount: postCount,
        postResearchDownloads: postDownloads,
        downloadsPerAsset: dpa,
        opportunityScoreCurrent: oppCurrent,
      });
    });

    return pairs;
  }, [categoryMatches, keywords, myDataAssets, settings]);

  // Tabel korelasi Spearman Global (hanya aktif jika minimal 10 pasangan)
  const calibrationResults = useMemo(() => {
    return computeWeightCalibrationTable(calibrationPairs);
  }, [calibrationPairs]);

  // Tabel korelasi Spearman Per Grup (Platform x Tipe Aset) - Fase 5A
  const groupCalibrationResults = useMemo(() => {
    return computeGroupCalibrationTable(calibrationPairs, calibPlatform, calibAssetType);
  }, [calibrationPairs, calibPlatform, calibAssetType]);

  // 3. Payload Insight Agregat (TIDAK ADA DATA MENTAH CSV)
  const aggregateInsightPayload: AiInsightAggregatePayload = useMemo(() => {
    const assetTypes: AssetType[] = ['Foto nyata', 'Foto AI-generated', 'Ilustrasi AI-generated'];
    return {
      timestamp: new Date().toISOString(),
      summaryPerAssetType: assetTypes.map((type) => {
        const an = analyticsPerType[type];
        return {
          assetType: type,
          totalDownloads: an.totalDownloads,
          totalRevenue: an.totalRevenue,
          activeAssetsCount: an.activeAssetsCount,
          avgDownloadsPerAsset: an.downloadsPerAsset,
          categoriesSummary: an.categories.map((c) => ({
            category: c.category,
            assetCount: c.assetCount,
            totalDownloads: c.totalDownloads,
            totalRevenue: c.totalRevenue,
            downloadsPerAsset: c.downloadsPerAsset,
            monthsCount: c.monthsCount,
            status: c.status,
          })),
        };
      }),
    };
  }, [analyticsPerType]);

  // Handler Pemilihan File CSV
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    setCsvProcessingResult(null);
    setSelectedFile(file);

    try {
      const preview = await parseCsvFilePreview(file);
      setCsvPreview(preview);

      // Deteksi otomatis kolom
      const detected = autoDetectColumnMapping(preview.headers);
      setMappingConfig((prev) => ({
        ...prev,
        dateCol: detected.dateCol || prev.dateCol || preview.headers[0] || '',
        assetIdOrTitleCol: detected.assetIdOrTitleCol || prev.assetIdOrTitleCol || preview.headers[1] || '',
        categoryCol: detected.categoryCol || '',
        downloadsCol: detected.downloadsCol || '',
        revenueCol: detected.revenueCol || '',
        assetTypeCol: detected.assetTypeCol || '',
      }));
    } catch (err: any) {
      setCsvError(err.message || 'Gagal membaca berkas CSV.');
      setSelectedFile(null);
      setCsvPreview(null);
    }
  };

  // Handler Proses Penuh CSV
  const handleProcessCsv = async () => {
    if (!selectedFile) return;

    if (!mappingConfig.dateCol || !mappingConfig.assetIdOrTitleCol || !mappingConfig.downloadsCol) {
      setCsvError('Kolom Tanggal, ID/Judul Aset, dan Jumlah Unduhan wajib dipilih.');
      return;
    }

    setIsProcessingCsv(true);
    setCsvError(null);

    try {
      const result = await processFullCsvFile(selectedFile, mappingConfig);
      setCsvProcessingResult(result);
    } catch (err: any) {
      setCsvError(err.message || 'Terjadi galat saat memproses CSV.');
    } finally {
      setIsProcessingCsv(false);
    }
  };

  // Handler Konfirmasi Simpan Impor CSV
  const handleCommitImport = (mode: 'append' | 'replace') => {
    if (!csvProcessingResult || csvProcessingResult.validAssets.length === 0) return;

    if (mode === 'replace') {
      onUpdateAssets(csvProcessingResult.validAssets);
    } else {
      // Append deduplicate
      const seen = new Set(myDataAssets.map((a) => `${a.assetIdOrTitle.toLowerCase()}_${a.date}`));
      const fresh = csvProcessingResult.validAssets.filter((a) => !seen.has(`${a.assetIdOrTitle.toLowerCase()}_${a.date}`));
      onUpdateAssets([...myDataAssets, ...fresh]);
    }

    // Reset state upload dan kembali ke tampilan analitik
    setSelectedFile(null);
    setCsvPreview(null);
    setCsvProcessingResult(null);
    setActiveSubTab('analytics');
  };

  // Handler Tambah Pencocokan Kategori Baru
  const handleAddMatch = () => {
    if (!selectedResearchIdForMatch || !selectedCategoryForMatch) return;
    const research = keywords.find((k) => k.id === selectedResearchIdForMatch);
    if (!research) return;

    // Hindari duplikat riset
    const filtered = categoryMatches.filter((m) => m.researchId !== selectedResearchIdForMatch);
    const updated = [
      ...filtered,
      {
        researchId: research.id,
        categoryName: selectedCategoryForMatch,
        assetType: research.assetType,
      },
    ];
    onUpdateMatches(updated);
    setIsMatchModalOpen(false);
    setSelectedResearchIdForMatch('');
    setSelectedCategoryForMatch('');
  };

  // Handler Hapus Pencocokan Kategori
  const handleDeleteMatch = (researchId: string) => {
    onUpdateMatches(categoryMatches.filter((m) => m.researchId !== researchId));
  };

  // Handler Ringkas Insight Gemini
  const handleGenerateAiInsight = async () => {
    setIsGeneratingInsight(true);
    setInsightError(null);

    try {
      const narrative = await requestAiInsightSummary(aggregateInsightPayload);
      setInsightNarrative(narrative);
    } catch (err: any) {
      setInsightError(err.message || 'Gagal memanggil layanan Gemini.');
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Navigasi Sub-Tab */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Data Saya (Analitik &amp; Kalibrasi Portofolio)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                  Portofolio
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pemrosesan CSV 100% lokal di browser &middot; Analitik per tipe aset &middot; Kalibrasi korelasi Spearman.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsInsightModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Ringkas Insight AI
            </button>

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={myDataAssets.length === 0}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:hover:text-slate-400"
              title="Hapus Semua Data Saya"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveSubTab('analytics')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'analytics'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Analitik Portofolio ({myDataAssets.length} baris)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('calibration')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'calibration'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
              Kalibrasi Spearman ({calibrationPairs.length} Pasang)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('upload')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'upload'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              Unggah CSV (PapaParse)
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Privasi: CSV tidak pernah dikirim ke server</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: ANALITIK PORTOFOLIO & STATUS KATEGORI                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          {/* Tipe Aset Selector (TIDAK DIGABUNG) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Pilih Tipe Aset:
              </span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                {(['Foto nyata', 'Foto AI-generated', 'Ilustrasi AI-generated'] as AssetType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedAssetType(t)}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      selectedAssetType === t
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenSettings}
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              Sesuaikan Ambang Status di Pengaturan
            </button>
          </div>

          {/* Metric Summary Cards per Tipe Aset */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wide">
                Total Unduhan
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 font-mono">
                  {currentAnalytics.totalDownloads.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">kali</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Akumulasi seluruh aset {selectedAssetType}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wide">
                Total Pendapatan
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xs font-bold text-slate-500">$</span>
                <span className="text-2xl font-extrabold text-emerald-700 font-mono">
                  {currentAnalytics.totalRevenue.toFixed(2)}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Estimasi royalti portofolio
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wide">
                Aset Aktif Unik
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 font-mono">
                  {currentAnalytics.activeAssetsCount}
                </span>
                <span className="text-xs text-slate-400">aset</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Jumlah ID unik dalam katalog
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wide">
                Unduhan per Aset (DPA)
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-indigo-700 font-mono">
                  {currentAnalytics.downloadsPerAsset}
                </span>
                <span className="text-xs text-slate-400">rasio</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Rata-rata produktivitas per aset
              </span>
            </div>
          </div>

          {/* Tren Bulanan Ringkas */}
          {currentAnalytics.monthlyTrend.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Tren Unduhan &amp; Pendapatan Bulanan ({selectedAssetType})
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {currentAnalytics.monthlyTrend.length} Bulan Terpantau
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {currentAnalytics.monthlyTrend.map((m, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-1">
                    <span className="text-[10px] font-mono font-bold text-slate-500 block">
                      {m.month}
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono block">
                      {m.downloads} dl
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700 block">
                      ${m.revenue.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabel Kategori & Evaluasi Status */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Status Kategori Portofolio ({selectedAssetType})
                  </h3>
                  <HelpTooltipButton topic="ambang_status" onOpenGuide={onOpenGuide} />
                </div>
                <p className="text-xs text-slate-500">
                  Status dihitung otomatis: minimal {settings.categoryThresholds.minAssets} aset &amp; {settings.categoryThresholds.minMonths} bulan data.
                </p>
              </div>

              <div className="flex items-center gap-1 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                  Perbanyak &ge; {settings.categoryThresholds.perbanyakDownloadsPerAsset} dl/aset
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 font-bold border border-rose-200">
                  Kurangi &lt; {settings.categoryThresholds.kurangiDownloadsPerAsset} dl/aset
                </span>
              </div>
            </div>

            {currentAnalytics.categories.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <p className="text-xs text-slate-500">
                  Belum ada data aset untuk tipe aset &quot;{selectedAssetType}&quot;.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('upload')}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                >
                  Unggah CSV Portofolio
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px] bg-slate-50/70">
                      <th className="py-2.5 px-3">Kategori / Topik</th>
                      <th className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1">
                          Status Aksi
                          <HelpTooltipButton topic="ambang_status" onOpenGuide={onOpenGuide} className="text-slate-400 hover:text-slate-600" />
                        </span>
                      </th>
                      <th className="py-2.5 px-3 text-right">Jumlah Aset</th>
                      <th className="py-2.5 px-3 text-right">Rentang Bulan</th>
                      <th className="py-2.5 px-3 text-right">Total Unduhan</th>
                      <th className="py-2.5 px-3 text-right">Unduhan / Aset</th>
                      <th className="py-2.5 px-3 text-right">Total Royalti</th>
                      <th className="py-2.5 px-3">Alasan Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {currentAnalytics.categories.map((cat, idx) => {
                      let statusBadgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
                      if (cat.status === 'Perbanyak') {
                        statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
                      } else if (cat.status === 'Pertahankan') {
                        statusBadgeClass = 'bg-blue-50 text-blue-800 border-blue-300 font-bold';
                      } else if (cat.status === 'Kurangi') {
                        statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
                      }

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {cat.category}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] border ${statusBadgeClass}`}>
                              {cat.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                            {cat.assetCount}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {cat.monthsCount} bln
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900">
                            {cat.totalDownloads}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-indigo-700">
                            {cat.downloadsPerAsset.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-700">
                            ${cat.totalRevenue.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-slate-500 text-[11px] max-w-xs">
                            {cat.statusReason}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: KALIBRASI BOBOT SPEARMAN & PENCOCOKAN RISET                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'calibration' && (
        <div className="space-y-6">
          {/* Penjelasan Kalibrasi & Aturan Paska-Riset */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  Kalibrasi Bobot Skor Peluang Berdasarkan Korelasi Spearman
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Aplikasi menghitung korelasi peringkat Spearman (&rho;) antara <strong>skor peluang riset</strong> dan <strong>unduhan per aset aktual</strong>.
                  Sesuai aturan ketat: <em>hanya aset yang diunggah SETELAH tanggal cek riset</em> yang diperhitungkan.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsMatchModalOpen(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Link2 className="w-3.5 h-3.5" />
                Cocokkan Riset &amp; Kategori
              </button>
            </div>

            {/* Pemilihan Cakupan Kalibrasi (Global vs Per Grup Fase 5A) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">
                    Cakupan Kalibrasi Spearman
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Pilih apakah ingin mengalibrasi bobot global atau per kombinasi platform &times; tipe aset
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGroupScope('global');
                      setGroupAppliedSuccess(null);
                    }}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      selectedGroupScope === 'global'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bobot Global ({calibrationPairs.length} pasang)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGroupScope('group');
                      setGroupAppliedSuccess(null);
                    }}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      selectedGroupScope === 'group'
                        ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Grup (Platform &times; Tipe Aset)
                  </button>
                </div>
              </div>

              {/* Selector Platform x Tipe Aset saat mode Grup aktif */}
              {selectedGroupScope === 'group' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Platform Grup:
                    </label>
                    <select
                      value={calibPlatform}
                      onChange={(e) => {
                        setCalibPlatform(e.target.value as Platform);
                        setGroupAppliedSuccess(null);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 cursor-pointer"
                    >
                      <option value="Adobe Stock">Adobe Stock</option>
                      <option value="Shutterstock">Shutterstock</option>
                      <option value="Freepik">Freepik</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tipe Aset Grup:
                    </label>
                    <select
                      value={calibAssetType}
                      onChange={(e) => {
                        setCalibAssetType(e.target.value as AssetType);
                        setGroupAppliedSuccess(null);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 cursor-pointer"
                    >
                      <option value="Foto nyata">Foto nyata</option>
                      <option value="Foto AI-generated">Foto AI-generated</option>
                      <option value="Ilustrasi AI-generated">Ilustrasi AI-generated</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Status Bobot Grup Saat Ini */}
              {selectedGroupScope === 'group' && (
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-600">
                      Bobot aktif grup <strong>{calibPlatform} &times; {calibAssetType}</strong>:
                    </span>
                    {settings.groupWeights?.[`${calibPlatform}__${calibAssetType}`] ? (
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                        Khusus: {settings.groupWeights[`${calibPlatform}__${calibAssetType}`].demandWeight} Permintaan / {settings.groupWeights[`${calibPlatform}__${calibAssetType}`].supplyWeight} Pasokan
                      </span>
                    ) : (
                      <span className="font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        Default Global: {settings.demandWeight} Permintaan / {settings.supplyWeight} Pasokan
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {groupAppliedSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{groupAppliedSuccess}</span>
              </div>
            )}

            {/* Status Pasangan */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500" />
                <span>
                  {selectedGroupScope === 'global' ? (
                    <>Jumlah Pasangan Valid: <strong>{calibrationPairs.length}</strong> / 10 minimal untuk aktivasi kalibrasi.</>
                  ) : (
                    <>Pasangan Grup ({calibPlatform} &times; {calibAssetType}): <strong>{groupCalibrationResults.sampleSize}</strong> / 10 minimal.</>
                  )}
                </span>
              </div>
              <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                (selectedGroupScope === 'global' ? calibrationPairs.length >= 10 : groupCalibrationResults.isSufficient)
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {(selectedGroupScope === 'global' ? calibrationPairs.length >= 10 : groupCalibrationResults.isSufficient)
                  ? 'Siap Kalibrasi'
                  : 'Perlu Tambahan Pasangan'}
              </span>
            </div>
          </div>

          {/* KASUS 1: GRUP DENGAN DATA KURANG (< 10) */}
          {selectedGroupScope === 'group' && !groupCalibrationResults.isSufficient && (
            <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-950">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Data belum cukup (n = {groupCalibrationResults.sampleSize})</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900">
                Kombinasi <strong>{calibPlatform} &times; {calibAssetType}</strong> baru memiliki {groupCalibrationResults.sampleSize} pasangan riset-portofolio valid (syarat minimal 10 pasangan per grup).
              </p>
              <p className="text-[11px] text-amber-800">
                Untuk kombinasi ini, aplikasi otomatis menggunakan bobot default global (<strong>{settings.demandWeight} Permintaan / {settings.supplyWeight} Pasokan</strong>) sampai jumlah data mencukupi.
              </p>
            </div>
          )}

          {/* KASUS 2: TABEL KALIBRASI (Jika Data Cukup >= 10) */}
          {((selectedGroupScope === 'global' && calibrationPairs.length >= 10 && calibrationResults.recommendedWeight) ||
            (selectedGroupScope === 'group' && groupCalibrationResults.isSufficient && groupCalibrationResults.recommendedWeight)) && (
            (() => {
              const activeResults = selectedGroupScope === 'global' ? calibrationResults : groupCalibrationResults;
              const sampleCount = selectedGroupScope === 'global' ? calibrationPairs.length : groupCalibrationResults.sampleSize;

              return (
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Tabel Korelasi Spearman {selectedGroupScope === 'group' ? `Grup ${calibPlatform} (${calibAssetType})` : 'Global'} (0,0 s/d 1,0)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Kombinasi dengan korelasi Spearman tertinggi menunjukkan bobot formula yang paling mencerminkan unduhan nyata.
                      </p>
                    </div>

                    {/* Banner Rekomendasi & Tombol Terapkan */}
                    {activeResults.recommendedWeight && (
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                        <div>
                          <span className="text-[10px] text-emerald-700 font-bold uppercase block">
                            Saran Bobot Optimal
                          </span>
                          <span className="text-xs font-extrabold text-emerald-900">
                            Permintaan: {activeResults.recommendedWeight.demandWeight} | Pasokan: {activeResults.recommendedWeight.supplyWeight}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedGroupScope === 'group' && onApplyGroupWeight) {
                              onApplyGroupWeight(
                                calibPlatform,
                                calibAssetType,
                                activeResults.recommendedWeight!.demandWeight,
                                activeResults.recommendedWeight!.supplyWeight,
                                activeResults.recommendedWeight!.rho,
                                sampleCount
                              );
                              setGroupAppliedSuccess(`Bobot khusus grup ${calibPlatform} (${calibAssetType}) berhasil diterapkan.`);
                            } else {
                              onApplyWeight(
                                activeResults.recommendedWeight!.demandWeight,
                                activeResults.recommendedWeight!.supplyWeight,
                                activeResults.recommendedWeight!.rho,
                                sampleCount
                              );
                            }
                          }}
                          className="ml-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
                        >
                          Terapkan Bobot {selectedGroupScope === 'group' ? 'Grup' : ''}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Peringatan Ukuran Sampel */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Ukuran Sampel (n = {sampleCount}):</strong> Bobot saran per grup hanya disimpan jika Anda menekan tombol &ldquo;Terapkan Bobot&rdquo;; bobot per grup bersifat opsional dan default memakai bobot global.
                    </span>
                  </div>

                  {/* Tabel 11 Baris Bobot */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px] bg-slate-50/70">
                          <th className="py-2.5 px-3">Bobot Permintaan</th>
                          <th className="py-2.5 px-3">Bobot Pasokan</th>
                          <th className="py-2.5 px-3 text-right">Korelasi Spearman (&rho;)</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {activeResults.rows.map((row, idx) => {
                          const currentGroupCfg = settings.groupWeights?.[`${calibPlatform}__${calibAssetType}`];
                          const activeDemand = selectedGroupScope === 'group' && currentGroupCfg
                            ? currentGroupCfg.demandWeight
                            : settings.demandWeight;
                          const activeSupply = selectedGroupScope === 'group' && currentGroupCfg
                            ? currentGroupCfg.supplyWeight
                            : settings.supplyWeight;

                          const isCurrentActive =
                            Math.round(activeDemand * 10) / 10 === row.demandWeight &&
                            Math.round(activeSupply * 10) / 10 === row.supplyWeight;

                          return (
                            <tr
                              key={idx}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                row.isRecommended ? 'bg-emerald-50/40' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                {row.demandWeight.toFixed(1)}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                {row.supplyWeight.toFixed(1)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                                <span className={row.rho > 0 ? 'text-emerald-700' : 'text-slate-500'}>
                                  {row.rho > 0 ? `+${row.rho.toFixed(3)}` : row.rho.toFixed(3)}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {row.isRecommended && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    SARAN OPTIMAL
                                  </span>
                                )}
                                {isCurrentActive && !row.isRecommended && (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[10px]">
                                    Sedang Digunakan
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (selectedGroupScope === 'group' && onApplyGroupWeight) {
                                      onApplyGroupWeight(
                                        calibPlatform,
                                        calibAssetType,
                                        row.demandWeight,
                                        row.supplyWeight,
                                        row.rho,
                                        sampleCount
                                      );
                                      setGroupAppliedSuccess(`Bobot grup ${calibPlatform} (${calibAssetType}) diperbarui.`);
                                    } else {
                                      onApplyWeight(
                                        row.demandWeight,
                                        row.supplyWeight,
                                        row.rho,
                                        sampleCount
                                      );
                                    }
                                  }}
                                  className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
                                >
                                  Pilih Kombinasi Ini
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()
          )}

          {/* KASUS 3: GLOBAL DATA KURANG (< 10) */}
          {selectedGroupScope === 'global' && calibrationPairs.length < 10 && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Sliders className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">
                Belum Cukup Pasangan Data untuk Kalibrasi Spearman
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Diperlukan minimal 10 pasangan entri riset dengan aset yang diunggah setelah tanggal cek. Saat ini baru terdapat{' '}
                <strong>{calibrationPairs.length}</strong> pasangan. Klik tombol di bawah untuk mencocokkan kata kunci riset Anda dengan kategori portofolio.
              </p>
              <button
                type="button"
                onClick={() => setIsMatchModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
              >
                Cocokkan Riset &amp; Kategori Sekarang
              </button>
            </div>
          )}

          {/* Daftar Pasangan Pencocokan Saat Ini */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Daftar Pasangan Riset &amp; Kategori ({categoryMatches.length} Terdaftar)
              </h4>
              <span className="text-[11px] text-slate-400">
                Pencocokan dilakukan secara manual
              </span>
            </div>

            {calibrationPairs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                Belum ada pasangan riset dan kategori yang dicocokkan.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px] bg-slate-50/70">
                      <th className="py-2 px-3">Kata Kunci Riset</th>
                      <th className="py-2 px-3">Kategori Portofolio</th>
                      <th className="py-2 px-3">Tipe Aset</th>
                      <th className="py-2 px-3 text-center">Tgl Cek Riset</th>
                      <th className="py-2 px-3 text-right">Aset Paska-Cek</th>
                      <th className="py-2 px-3 text-right">Unduhan Paska-Cek</th>
                      <th className="py-2 px-3 text-right">Rasio DPA</th>
                      <th className="py-2 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calibrationPairs.map((cp, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {cp.keyword}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {cp.category}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {cp.assetType}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600 text-[11px]">
                          {cp.checkDate}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          {cp.postResearchAssetCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                          {cp.postResearchDownloads}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                          {cp.downloadsPerAsset}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteMatch(cp.researchId)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Hapus pencocokan ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: UNGGAH CSV & PEMETAAN KOLOM (PAPAPARSE)                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'upload' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Unggah Berkas CSV Kontributor (Maksimal 5 MB)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Berkas diproses murni di browser pengguna menggunakan pustaka PapaParse. Data tidak dikirim ke server.
              </p>
            </div>

            {/* Dropzone File Input */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-2xl p-6 text-center cursor-pointer transition-colors space-y-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Pilih atau Tarik Berkas CSV ke Sini'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Format .csv dengan batas ukuran maksimal 5 MB
                </p>
              </div>
            </div>

            {/* Error Message */}
            {csvError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{csvError}</span>
              </div>
            )}

            {/* Layar Pemetaan Kolom jika File sudah dipilih */}
            {csvPreview && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Pemetaan Kolom CSV
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {csvPreview.headers.length} Kolom Terdeteksi &middot; {(csvPreview.fileSizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Kolom Tanggal */}
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Kolom Tanggal <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={mappingConfig.dateCol}
                      onChange={(e) => setMappingConfig({ ...mappingConfig, dateCol: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium"
                    >
                      <option value="">-- Pilih Kolom Tanggal --</option>
                      {csvPreview.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Kolom ID / Judul Aset */}
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Kolom ID / Judul Aset <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={mappingConfig.assetIdOrTitleCol}
                      onChange={(e) => setMappingConfig({ ...mappingConfig, assetIdOrTitleCol: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium"
                    >
                      <option value="">-- Pilih Kolom ID / Judul --</option>
                      {csvPreview.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Kolom Unduhan / Penjualan */}
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Kolom Unduhan / Penjualan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={mappingConfig.downloadsCol}
                      onChange={(e) => setMappingConfig({ ...mappingConfig, downloadsCol: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium"
                    >
                      <option value="">-- Pilih Kolom Unduhan --</option>
                      {csvPreview.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Kolom Kategori / Kata Kunci (Opsional) */}
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Kolom Kategori / Kata Kunci (Opsional)
                    </label>
                    <select
                      value={mappingConfig.categoryCol}
                      onChange={(e) => setMappingConfig({ ...mappingConfig, categoryCol: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium"
                    >
                      <option value="">-- Tanpa Kolom Kategori --</option>
                      {csvPreview.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Kolom Pendapatan (Opsional) */}
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Kolom Pendapatan ($ / Rp) (Opsional)
                    </label>
                    <select
                      value={mappingConfig.revenueCol}
                      onChange={(e) => setMappingConfig({ ...mappingConfig, revenueCol: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium"
                    >
                      <option value="">-- Tanpa Kolom Pendapatan --</option>
                      {csvPreview.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Kolom Tipe Aset / Manual Fallback */}
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">
                      Tipe Aset (Pilih Kolom / Manual)
                    </label>
                    <select
                      value={mappingConfig.assetTypeCol}
                      onChange={(e) => setMappingConfig({ ...mappingConfig, assetTypeCol: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium mb-1.5"
                    >
                      <option value="">-- Manual (Gunakan Pilihan di Bawah) --</option>
                      {csvPreview.headers.map((h) => (
                        <option key={h} value={h}>Kolom: {h}</option>
                      ))}
                    </select>

                    {!mappingConfig.assetTypeCol && (
                      <select
                        value={mappingConfig.fallbackAssetType}
                        onChange={(e) =>
                          setMappingConfig({ ...mappingConfig, fallbackAssetType: e.target.value as AssetType })
                        }
                        className="w-full bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg px-2.5 py-1 text-xs font-semibold"
                      >
                        <option value="Foto nyata">Terapkan: Foto nyata</option>
                        <option value="Foto AI-generated">Terapkan: Foto AI-generated</option>
                        <option value="Ilustrasi AI-generated">Terapkan: Ilustrasi AI-generated</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Tombol Proses Parsing */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleProcessCsv}
                    disabled={isProcessingCsv}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingCsv ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Memproses PapaParse...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Validasi &amp; Pratinjau Pemetaan
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Hasil Validasi Pemrosesan CSV (Pratinjau 5 Baris & Baris Ditolak) */}
            {csvProcessingResult && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                      Baris Valid
                    </span>
                    <span className="text-xl font-extrabold text-emerald-950 font-mono">
                      {csvProcessingResult.validAssets.length}
                    </span>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-amber-800 block">
                      Duplikat Dihapus
                    </span>
                    <span className="text-xl font-extrabold text-amber-950 font-mono">
                      {csvProcessingResult.duplicateCount}
                    </span>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-rose-800 block">
                      Baris Ditolak
                    </span>
                    <span className="text-xl font-extrabold text-rose-950 font-mono">
                      {csvProcessingResult.rejectedCount}
                    </span>
                  </div>
                </div>

                {/* Pratinjau 5 Baris Pertama */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
                    Pratinjau 5 Baris Pertama Data Hasil Parsing:
                  </span>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200">
                          <th className="py-2 px-3">Tanggal</th>
                          <th className="py-2 px-3">ID / Judul Aset</th>
                          <th className="py-2 px-3">Kategori</th>
                          <th className="py-2 px-3">Tipe Aset</th>
                          <th className="py-2 px-3 text-right">Unduhan</th>
                          <th className="py-2 px-3 text-right">Royalti</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {csvProcessingResult.preview5.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-mono text-slate-600">{item.date}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">{item.assetIdOrTitle}</td>
                            <td className="py-2 px-3 text-slate-700">{item.category}</td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">{item.assetType}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{item.downloads}</td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-700">
                              {item.revenue !== null ? `$${item.revenue.toFixed(2)}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Daftar Baris Ditolak beserta Alasan */}
                {csvProcessingResult.rejectedCount > 0 && (
                  <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2 text-xs">
                    <span className="font-bold text-rose-900 block">
                      Rincian Alasan Baris Ditolak ({csvProcessingResult.rejectedCount} baris):
                    </span>
                    <ul className="space-y-1 text-[11px] text-rose-800 max-h-36 overflow-y-auto pr-2 list-disc list-inside">
                      {csvProcessingResult.rejectedReasons.map((rr, idx) => (
                        <li key={idx}>
                          <strong>Baris #{rr.rowIndex}:</strong> {rr.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Konfirmasi Simpan ke Data Saya */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-600">
                    Pilih apakah ingin <strong>menggabungkan</strong> data baru ini dengan data yang sudah ada atau <strong>mengganti total</strong>.
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleCommitImport('replace')}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      Ganti Semua Data
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCommitImport('append')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      Gabungkan (Merge)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INSIGHT AI (RINGKAS INSIGHT AGREGAT)                             */}
      {/* ========================================================================= */}
      {isInsightModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Ringkas Insight Analitik Portofolio (Gemini)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInsightModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-700 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Catatan Privasi & Aturan Transparansi Payload */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5 text-indigo-900">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="w-4 h-4 text-indigo-700 shrink-0" />
                  <span>Transparansi Data &amp; Catatan Privasi Google:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-indigo-800">
                  Fitur ini <strong>HANYA mengirim data ringkasan agregat</strong> (angka total unduhan dan pendapatan per kategori), bukan baris data mentah atau judul aset CSV Anda.
                  Sesuai kebijakan Google, penggunaan AI pada tier gratis (free tier) dapat memakai data untuk peningkatan produk Google.
                </p>
              </div>

              {/* Pratinjau Payload Agregat yang Akan Dikirim */}
              <div className="space-y-1">
                <span className="font-bold text-slate-800 uppercase tracking-wide text-[10px] block">
                  Pratinjau Payload Agregat yang Dikirim ke AI:
                </span>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[10px] font-mono max-h-40 overflow-y-auto">
                  {JSON.stringify(aggregateInsightPayload, null, 2)}
                </pre>
              </div>

              {/* Tampilan Narasi Hasil AI jika sudah digenerate */}
              {insightNarrative && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="font-bold text-slate-900 text-xs block border-b border-slate-200 pb-1">
                    Narasi Analitik Hasil Gemini:
                  </span>
                  <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-xs font-normal">
                    {insightNarrative}
                  </div>
                </div>
              )}

              {insightError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{insightError}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setIsInsightModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 cursor-pointer text-xs"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleGenerateAiInsight}
                disabled={isGeneratingInsight}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
              >
                {isGeneratingInsight ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Menyusun Narasi...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {insightNarrative ? 'Perbarui Narasi Insight' : 'Konfirmasi & Ringkas Insight'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PENCOCOKAN RISET KE KATEGORI (MANUAL MATCH)                      */}
      {/* ========================================================================= */}
      {isMatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Cocokkan Riset Pasar ke Kategori Data Saya
              </h3>
              <button
                type="button"
                onClick={() => setIsMatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pilih Kata Kunci Riset Pasar:
                </label>
                <select
                  value={selectedResearchIdForMatch}
                  onChange={(e) => setSelectedResearchIdForMatch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                >
                  <option value="">-- Pilih Kata Kunci Riset --</option>
                  {keywords.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.keyword} ({k.assetType} - Cek: {k.checkDate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pilih Kategori Portofolio di Data Saya:
                </label>
                <select
                  value={selectedCategoryForMatch}
                  onChange={(e) => setSelectedCategoryForMatch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {uniqueCategoriesInData.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                Sistem akan menghitung aset dalam kategori ini yang diunggah setelah tanggal cek kata kunci tersebut.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsMatchModalOpen(false)}
                className="px-3 py-1.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg cursor-pointer text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddMatch}
                disabled={!selectedResearchIdForMatch || !selectedCategoryForMatch}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer text-xs disabled:opacity-40"
              >
                Simpan Pasangan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: KONFIRMASI HAPUS DATA SAYA                                       */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Hapus Semua Data Portofolio Saya?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tindakan ini akan menghapus {myDataAssets.length} baris data portofolio dan seluruh pencocokan kategori di browser Anda. Riset kata kunci pasar tidak akan terhapus.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearMyData();
                  setIsDeleteModalOpen(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
