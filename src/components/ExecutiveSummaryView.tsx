import React, { useState, useMemo } from 'react';
import { 
  KeywordEntry, 
  AppSettings, 
  SeasonalMoment, 
  MyDataAsset, 
  AssetType, 
  Platform,
  CategoryThresholds,
  ConfidenceLevel,
  KeywordWithMetrics
} from '../types/microstock';
import { 
  computeKeywordMetrics, 
  computeSeasonalMoment, 
  computeAssetTypeAnalytics,
  formatIndonesianDate,
  getDaysDifferenceFromToday 
} from '../utils/calculator';
import { 
  Camera, 
  Bot, 
  Palette, 
  TrendingUp, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ArrowRight, 
  Plus, 
  ShieldCheck, 
  Info, 
  Sparkles,
  BarChart2,
  ExternalLink,
  ChevronRight,
  ListPlus,
  RotateCw
} from 'lucide-react';
import { DataHealthPanel } from './DataHealthPanel';
import { HelpTooltipButton } from './HelpTooltipButton';

interface ExecutiveSummaryViewProps {
  keywords: KeywordEntry[];
  settings: AppSettings;
  seasonalMoments: SeasonalMoment[];
  myDataAssets: MyDataAsset[];
  onSelectTab: (tab: any) => void;
  onOpenAddModal: (keyword?: string) => void;
  onAddToProductionPlan: (item: {
    titleOrKeyword: string;
    assetType: AssetType;
    platform: Platform;
    opportunityScore: number;
    sourceType: 'riset' | 'ide_niche' | 'manual';
    sourceKeywordId?: string;
    categoryName?: string;
    seasonalMomentName?: string;
  }) => void;
  onOpenRecheckQueue?: () => void;
  onEditKeyword?: (entry: KeywordEntry) => void;
  onOpenGuide?: (sectionId: string) => void;
}

const ASSET_TYPES: { type: AssetType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'Foto nyata', label: 'Foto Nyata', icon: <Camera className="w-4 h-4" />, color: 'emerald' },
  { type: 'Foto AI-generated', label: 'Foto AI', icon: <Bot className="w-4 h-4" />, color: 'purple' },
  { type: 'Ilustrasi AI-generated', label: 'Ilustrasi AI', icon: <Palette className="w-4 h-4" />, color: 'amber' },
];

export const ExecutiveSummaryView: React.FC<ExecutiveSummaryViewProps> = ({
  keywords,
  settings,
  seasonalMoments,
  myDataAssets,
  onSelectTab,
  onOpenAddModal,
  onAddToProductionPlan,
  onOpenRecheckQueue,
  onEditKeyword,
  onOpenGuide,
}) => {
  // STRICT RULE: Tipe aset TIDAK digabung dalam satu peringkat
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>('Foto nyata');
  const [addedSuccessKeyword, setAddedSuccessKeyword] = useState<string | null>(null);

  // 1. Metrik kata kunci dihitung per tipe aset
  const keywordsByTypeWithMetrics = useMemo(() => {
    const list = keywords
      .filter((k) => k.assetType === selectedAssetType)
      .map((k) => ({
        ...k,
        metrics: computeKeywordMetrics(k, settings),
      }));

    // Urutkan skor peluang tertinggi
    list.sort((a, b) => b.metrics.opportunityScore - a.metrics.opportunityScore);
    return list;
  }, [keywords, selectedAssetType, settings]);

  // Top 5 kata kunci dengan skor peluang tertinggi
  const top5Keywords = useMemo(() => {
    return keywordsByTypeWithMetrics.slice(0, 5);
  }, [keywordsByTypeWithMetrics]);

  // 2. Evaluasi Momen Musiman
  const computedMoments = useMemo(() => {
    return seasonalMoments.map((m) => computeSeasonalMoment(m));
  }, [seasonalMoments]);

  const activeMoments = useMemo(() => {
    return computedMoments.filter((m) => m.status === 'active');
  }, [computedMoments]);

  const upcoming30Moments = useMemo(() => {
    return computedMoments.filter((m) => m.status === 'upcoming_30');
  }, [computedMoments]);

  const passedMoments = useMemo(() => {
    return computedMoments.filter((m) => m.status === 'passed' || m.status === 'approaching');
  }, [computedMoments]);

  // 3. Analitik Data Saya per tipe aset
  const myDataAnalytics = useMemo(() => {
    return computeAssetTypeAnalytics(myDataAssets, settings.categoryThresholds);
  }, [myDataAssets, settings.categoryThresholds]);

  const currentTypeData = myDataAnalytics[selectedAssetType];

  // 4. Peringatan & Status Pemeriksaan (Universal Alert Box)
  // a. Entri riset lebih dari 14 hari
  const staleKeywords = useMemo(() => {
    return keywords.filter((k) => {
      const days = getDaysDifferenceFromToday(k.checkDate);
      return days > 14;
    });
  }, [keywords]);

  // b. Ide niche berstatus belum dikonfirmasi pengguna
  const unconfirmedNicheKeywords = useMemo(() => {
    return keywords.filter((k) => Boolean(k.isAiSuggested && !k.isConfirmedByUser));
  }, [keywords]);

  // c. Data Data Saya terakhir diunggah > 45 hari lalu
  const myDataFreshness = useMemo(() => {
    if (myDataAssets.length === 0) {
      return { hasData: false, daysSinceLastUpload: 0, isStale: false };
    }
    // Cari tanggal terbaru dari seluruh aset portofolio
    const dates = myDataAssets.map((a) => a.date).filter(Boolean);
    if (dates.length === 0) {
      return { hasData: true, daysSinceLastUpload: 999, isStale: true };
    }
    dates.sort();
    const latestDate = dates[dates.length - 1];
    const daysSince = getDaysDifferenceFromToday(latestDate);
    return {
      hasData: true,
      latestDate,
      daysSinceLastUpload: daysSince,
      isStale: daysSince > 45,
    };
  }, [myDataAssets]);

  const handleQuickAdd = (kw: KeywordWithMetrics) => {
    // Cari kategori yang relevan dari data saya jika ada
    const matchedCategory = currentTypeData.categories.find(
      (c) => kw.keyword.toLowerCase().includes(c.category.toLowerCase())
    );

    // Cari momen musiman yang sedang aktif jika ada
    const matchedMoment = activeMoments[0];

    onAddToProductionPlan({
      titleOrKeyword: kw.keyword,
      assetType: kw.assetType,
      platform: kw.platform,
      opportunityScore: kw.metrics.opportunityScore,
      sourceType: 'riset',
      sourceKeywordId: kw.id,
      categoryName: matchedCategory?.category,
      seasonalMomentName: matchedMoment?.name,
    });

    setAddedSuccessKeyword(kw.keyword);
    setTimeout(() => {
      setAddedSuccessKeyword(null);
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Executive Welcome & Mode Switcher */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white tracking-wide">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Ringkasan Eksekutif
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Pembaruan: {formatIndonesianDate(new Date().toISOString().substring(0, 10))}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Dashboard Ringkasan Riset &amp; Performa
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Tinjauan terpadu per tipe aset (Foto nyata, Foto AI, Ilustrasi AI). Menampilkan 5 peluang kata kunci teratas, kalender musiman, status kategori portofolio, dan sinyal peringatan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectTab('plan')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <ListPlus className="w-4 h-4 text-emerald-400" />
              Buka Rencana Produksi
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('dashboard')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Tabel Riset Lengkap
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Strict Asset Type Segment Tabs */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Pilih Tipe Aset (Peringkat Tidak Digabung):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ASSET_TYPES.map((item) => {
              const count = keywords.filter((k) => k.assetType === item.type).length;
              const isSelected = selectedAssetType === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setSelectedAssetType(item.type)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20'
                      : 'bg-slate-50/80 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`p-2 rounded-lg ${isSelected ? 'bg-white/10 text-white' : 'bg-white text-slate-700 shadow-2xs'}`}>
                      {item.icon}
                    </span>
                    <div>
                      <span className="block font-bold text-xs sm:text-sm">
                        {item.label}
                      </span>
                      <span className={`text-[11px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {count} kata kunci tersimpan
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Success Notification after adding to plan */}
      {addedSuccessKeyword && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between text-xs font-semibold animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Berhasil dimasukkan ke <strong>Rencana Produksi</strong>: &ldquo;{addedSuccessKeyword}&rdquo;</span>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('plan')}
            className="text-emerald-700 hover:text-emerald-900 underline font-bold cursor-pointer"
          >
            Lihat di Rencana &rarr;
          </button>
        </div>
      )}

      {/* SYSTEM WARNINGS WIDGET (Peringatan & Cek Ulang) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900">
              Peringatan Sistem &amp; Status Pemeliharaan Data
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Pengecekan otomatis oleh kode
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Warning 1: Entri > 14 hari */}
          <div className={`p-3.5 rounded-xl border text-xs ${
            staleKeywords.length > 0 
              ? 'bg-amber-50/60 border-amber-200 text-amber-950' 
              : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1.5">
                <Clock className={`w-3.5 h-3.5 ${staleKeywords.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
                Pemeriksaan Riset Usang
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                staleKeywords.length > 0 ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {staleKeywords.length} item
              </span>
            </div>
            {staleKeywords.length > 0 ? (
              <div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Terdapat <strong>{staleKeywords.length} entri riset</strong> dicek &gt;14 hari lalu. Ditandai <em>&ldquo;Perlu cek ulang&rdquo;</em> untuk memperbarui jumlah hasil di platform.
                </p>
                {onOpenRecheckQueue && (
                  <button
                    type="button"
                    onClick={onOpenRecheckQueue}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-200/90 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-xs cursor-pointer shadow-2xs transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Buka Antrean Cek Ulang ({staleKeywords.length}) &rarr;
                  </button>
                )}
              </div>
            ) : (
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                Semua data riset masih mutakhir (&le; 14 hari). Skor kepercayaan terjaga optimal.
              </p>
            )}
          </div>

          {/* Warning 2: Ide Niche Belum Dikonfirmasi */}
          <div className={`p-3.5 rounded-xl border text-xs ${
            unconfirmedNicheKeywords.length > 0 
              ? 'bg-indigo-50/60 border-indigo-200 text-indigo-950' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Ide Niche AI Belum Konfirmasi
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                unconfirmedNicheKeywords.length > 0 ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {unconfirmedNicheKeywords.length} item
              </span>
            </div>
            {unconfirmedNicheKeywords.length > 0 ? (
              <p className="text-indigo-900 text-[11px] leading-relaxed">
                Ada <strong>{unconfirmedNicheKeywords.length} entri saran AI</strong> belum diverifikasi manual oleh Anda (kepercayaan dibatasi maksimal Sedang).
              </p>
            ) : (
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Tidak ada entri saran AI yang belum terkonfirmasi.
              </p>
            )}
          </div>

          {/* Warning 3: Data Saya > 45 hari */}
          <div className={`p-3.5 rounded-xl border text-xs ${
            myDataFreshness.isStale 
              ? 'bg-rose-50/60 border-rose-200 text-rose-950' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1.5">
                <BarChart2 className={`w-3.5 h-3.5 ${myDataFreshness.isStale ? 'text-rose-600' : 'text-slate-600'}`} />
                Pembaruan CSV Portofolio
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                myDataFreshness.isStale ? 'bg-rose-200 text-rose-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {myDataFreshness.hasData ? `${myDataFreshness.daysSinceLastUpload} hari lalu` : 'Belum ada'}
              </span>
            </div>
            {myDataFreshness.isStale ? (
              <p className="text-rose-800 text-[11px] leading-relaxed">
                Data portofolio terakhir tercatat <strong>{myDataFreshness.daysSinceLastUpload} hari lalu (&gt; 45 hari)</strong>. Disarankan mengunggah CSV performa terbaru di tab Data Saya.
              </p>
            ) : myDataFreshness.hasData ? (
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Data portofolio masih relevan (diperbarui {myDataFreshness.daysSinceLastUpload} hari lalu).
              </p>
            ) : (
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Belum ada data CSV portofolio yang diunggah. Unggah di tab Data Saya.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* PANEL KESEHATAN DATA (Fase 5A Poin 4) */}
      <DataHealthPanel 
        keywords={keywords}
        onOpenRecheckQueue={onOpenRecheckQueue}
        onEditKeyword={onEditKeyword}
      />

      {/* MAIN TWO-COLUMN GRID: 5 Top Keywords & Seasonal / Portfolio Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: 5 Top Keywords with Confidence Label */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm">
                  5
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Peluang Tertinggi ({selectedAssetType})
                  </h3>
                  <p className="text-xs text-slate-500">
                    5 kata kunci teratas berdasarkan skor peluang dan tingkat kepercayaan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectTab('dashboard')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
              >
                Lihat Semua &rarr;
              </button>
            </div>

            {/* List of 5 items */}
            {top5Keywords.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Belum ada data riset untuk tipe <strong>{selectedAssetType}</strong>.
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => onOpenAddModal()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Riset Sekarang
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {top5Keywords.map((item, index) => {
                  const conf = item.metrics.confidenceLevel;
                  const confColor =
                    conf === 'Tinggi'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : conf === 'Sedang'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200';

                  const oppScore = item.metrics.opportunityScore;
                  const scoreColor =
                    oppScore >= 75
                      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                      : oppScore >= 50
                      ? 'text-blue-600 bg-blue-50 border-blue-200'
                      : 'text-amber-600 bg-amber-50 border-amber-200';

                  return (
                    <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 rounded-xl px-2 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {item.keyword}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {item.platform}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${confColor}`}>
                              Kepercayaan: {conf}
                            </span>
                            {item.metrics.daysAgo > 14 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                                Perlu cek ulang
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                            <span>Hasil: <strong className="text-slate-800 font-mono">{item.searchResultCount.toLocaleString('id-ID')}</strong></span>
                            <span>&bull;</span>
                            <span>Permintaan: <strong className="text-slate-800 font-mono">{item.demandScore ?? '-'}/5</strong></span>
                            <span>&bull;</span>
                            <span>Dicek: {formatIndonesianDate(item.checkDate)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                        <div className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-sm ${scoreColor}`}>
                          {oppScore}
                          <span className="text-[10px] font-normal opacity-70"> /100</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Masukkan ke Rencana Produksi"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Rencana
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Seasonal Moments & Category Status */}
        <div className="lg:col-span-5 space-y-4">
          {/* MOMEN MUSIMAN CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Momen Musiman Terkini
                </h3>
                <HelpTooltipButton topic="faktor_musim" onOpenGuide={onOpenGuide} />
              </div>
              <button
                type="button"
                onClick={() => onSelectTab('calendar')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
              >
                Kalender Lengkap &rarr;
              </button>
            </div>

            {/* 1. Momen Sedang dalam Jendela Unggah (Active: 120-60 hari) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Sedang Dalam Jendela Unggah Ideal (120 - 60 Hari)
              </span>
              {activeMoments.length === 0 ? (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  Tidak ada momen yang tepat berada di jendela unggah saat ini.
                </div>
              ) : (
                activeMoments.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs">
                    <div className="flex items-center justify-between font-bold text-emerald-950 mb-0.5">
                      <span>{m.name}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px]">
                        {m.daysUntilWindowEnd} hari tersisa
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Puncak: <strong>{formatIndonesianDate(m.peakDate)}</strong> ({m.daysUntilPeak} hari lagi)
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.keywordsRecommendation.slice(0, 2).map((kw, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onOpenAddModal(kw)}
                          className="text-[10px] bg-white border border-emerald-300 text-emerald-900 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          + {kw}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 2. Momen Segera Masuk Jendela dalam 30 Hari */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">
                Masuk Jendela dalam 30 Hari
              </span>
              {upcoming30Moments.length === 0 ? (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  Tidak ada momen yang akan masuk jendela dalam 30 hari ke depan.
                </div>
              ) : (
                upcoming30Moments.map((m) => (
                  <div key={m.id} className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200 text-xs">
                    <div className="flex items-center justify-between font-bold text-indigo-950 mb-0.5">
                      <span>{m.name}</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-200 text-indigo-900 text-[10px]">
                        {m.daysUntilWindowStart} hari lagi
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-800">
                      Jendela dimulai: <strong>{formatIndonesianDate(m.idealWindowStart)}</strong>
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* 3. Momen yang Jendelanya Sudah Lewat Tahun Ini (Target Musim Berikutnya) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Jendela Unggah Lewat Tahun Ini (Target Musim Berikutnya)
              </span>
              {passedMoments.length === 0 ? (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  Tidak ada momen terlewat.
                </div>
              ) : (
                passedMoments.slice(0, 2).map((m) => (
                  <div key={m.id} className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                    <div className="flex items-center justify-between font-bold text-amber-950 mb-0.5">
                      <span>{m.name}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                        Target Musim Berikutnya
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-800 flex items-center gap-1 mt-1 font-medium">
                      <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>Jendela tahun ini telah lewat. Jangan produksi untuk tahun berjalan!</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* STATUS KATEGORI DARI DATA SAYA CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Status Kategori Portofolio ({selectedAssetType})
                </h3>
                <HelpTooltipButton topic="ambang_status" onOpenGuide={onOpenGuide} />
              </div>
              <button
                type="button"
                onClick={() => onSelectTab('mydata')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
              >
                Data Saya &rarr;
              </button>
            </div>

            {currentTypeData.categories.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">
                Belum ada data portofolio untuk tipe <strong>{selectedAssetType}</strong>.
                <p className="mt-1 text-[11px] text-slate-400">
                  Unggah file CSV di tab Data Saya untuk melihat evaluasi Perbanyak / Kurangi.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentTypeData.categories.slice(0, 4).map((cat) => {
                  const statusBadge =
                    cat.status === 'Perbanyak'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : cat.status === 'Kurangi'
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : cat.status === 'Pertahankan'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <div key={cat.category} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {cat.category}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {cat.assetCount} aset &bull; {cat.downloadsPerAsset.toFixed(1)} unduhan/aset
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md border text-[10px] font-bold ${statusBadge}`}>
                        {cat.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
