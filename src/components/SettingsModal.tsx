import React, { useState } from 'react';
import { 
  AppSettings, 
  CategoryThresholds, 
  ProductionFactors, 
  KeywordEntry, 
  ProductionPlanItem, 
  MyDataAsset, 
  SeasonalMoment,
  Platform,
  AssetType,
  SaturationBenchmarks,
  BenchmarkHistoryItem
} from '../types/microstock';
import { 
  DEFAULT_SETTINGS, 
  DEFAULT_PRODUCTION_FACTORS, 
  DEFAULT_SATURATION_BENCHMARKS,
  CURRENT_SCHEMA_VERSION,
  parseFullAppJSON
} from '../utils/storage';
import {
  calculateSupplyScore,
  calculateDemandScoreNormalized,
  calculateOpportunityScore
} from '../utils/calculator';
import { 
  Settings, 
  X, 
  RotateCcw, 
  Check, 
  Sliders, 
  Shield, 
  AlertTriangle, 
  RefreshCw, 
  History, 
  Layers,
  Database,
  Flame,
  Download,
  Upload,
  Clipboard,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  HelpCircle,
  Info,
  Target,
  Scale,
  KeyRound,
  ZoomIn
} from 'lucide-react';
import { HelpTooltipButton } from './HelpTooltipButton';
import { getStoredPasscode, setStoredPasscode, clearStoredPasscode } from '../utils/geminiClient';
import { getStoredDisplayScale, applyDisplayScale, DEFAULT_DISPLAY_SCALE } from '../utils/scale';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onResetSampleData: () => void;
  onClearAllData: () => void;
  onExportFullJSON?: () => void;
  onImportFullJSON?: (
    data: {
      keywords?: KeywordEntry[];
      myDataAssets?: MyDataAsset[];
      categoryMatches?: any[];
      seasonalMoments?: SeasonalMoment[];
      productionPlan?: ProductionPlanItem[];
      settings?: AppSettings;
    },
    mode: 'merge' | 'overwrite'
  ) => void;
  onOpenGuide?: (sectionId: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetSampleData,
  onClearAllData,
  onExportFullJSON,
  onImportFullJSON,
  onOpenGuide,
}) => {
  const [demandWeight, setDemandWeight] = useState(settings.demandWeight);
  const [supplyWeight, setSupplyWeight] = useState(settings.supplyWeight);
  const [autoBalance, setAutoBalance] = useState(true);

  // Ambang Batas Status Kategori Fase 3
  const [thresholds, setThresholds] = useState<CategoryThresholds>(
    settings.categoryThresholds || DEFAULT_SETTINGS.categoryThresholds
  );

  // Faktor Produksi Fase 4
  const [factors, setFactors] = useState<ProductionFactors>(
    settings.productionFactors || DEFAULT_PRODUCTION_FACTORS
  );

  // Acuan Jenuh Fase 5A
  const [benchmarks, setBenchmarks] = useState<SaturationBenchmarks>(
    settings.saturationBenchmarks || DEFAULT_SATURATION_BENCHMARKS
  );
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkHistoryItem[]>(
    settings.benchmarkHistory || []
  );

  // Fitur "Ukur Acuan"
  const [measurePlatform, setMeasurePlatform] = useState<Platform>('Adobe Stock');
  const [measureAssetType, setMeasureAssetType] = useState<AssetType>('Foto nyata');
  const [measureCommonKeyword, setMeasureCommonKeyword] = useState('background');
  const [measureResultCount, setMeasureResultCount] = useState<string>('');
  const [proposedBenchmark, setProposedBenchmark] = useState<number | null>(null);
  const [measureAppliedMsg, setMeasureAppliedMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'weights' | 'scale' | 'benchmarks' | 'factors' | 'thresholds' | 'storage' | 'history'>('weights');

  // State Skala Tampilan (Font & UI)
  const [displayScale, setDisplayScale] = useState<number>(() => getStoredDisplayScale());
  const [scaleFeedback, setScaleFeedback] = useState<string | null>(null);

  const handleScaleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const rounded = Math.round(val * 100) / 100;
    setDisplayScale(rounded);
    applyDisplayScale(rounded);
  };

  const handleSelectScale = (val: number) => {
    const rounded = Math.round(val * 100) / 100;
    setDisplayScale(rounded);
    applyDisplayScale(rounded);
    setScaleFeedback(`Skala diatur ke ${Math.round(rounded * 100)}%`);
    setTimeout(() => setScaleFeedback(null), 2500);
  };

  const handleResetScale = () => {
    handleSelectScale(DEFAULT_DISPLAY_SCALE);
  };

  // State untuk Impor JSON (Dua cara: Berkas & Tempel JSON)
  const [importMethod, setImportMethod] = useState<'file' | 'paste'>('file');
  const [pasteJsonText, setPasteJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [previewImportData, setPreviewImportData] = useState<{
    keywordsCount: number;
    planCount: number;
    myDataCount: number;
    momentsCount: number;
    schemaVersion: number;
    isMigrated: boolean;
    rawPayload: any;
  } | null>(null);

  // State Tes Rumus
  const [showFormulaTest, setShowFormulaTest] = useState(false);

  // State Kode Akses AI (Vercel)
  const [passcodeVal, setPasscodeVal] = useState(getStoredPasscode());
  const [passcodeSuccess, setPasscodeSuccess] = useState<string | null>(null);

  const handleSavePasscode = () => {
    if (!passcodeVal.trim()) {
      clearStoredPasscode();
      setPasscodeVal('');
      setPasscodeSuccess('Kode akses dihapus.');
      setTimeout(() => setPasscodeSuccess(null), 3000);
      return;
    }
    setStoredPasscode(passcodeVal);
    setPasscodeSuccess('Kode akses berhasil disimpan di peramban ini.');
    setTimeout(() => setPasscodeSuccess(null), 3000);
  };

  const handleClearPasscode = () => {
    clearStoredPasscode();
    setPasscodeVal('');
    setPasscodeSuccess('Kode akses telah dihapus dari peramban.');
    setTimeout(() => setPasscodeSuccess(null), 3000);
  };

  if (!isOpen) return null;

  // Kasus Uji Rumus Wajib (Bobot 0,5 / 0,5)
  const testCases = [
    { count: 8918, demand: 5, expected: 71.8 },
    { count: 420, demand: 4, expected: 71.3 },
    { count: 12400, demand: 5, expected: 70.8 },
    { count: 1650, demand: 4, expected: 67.0 },
  ];

  const testResults = testCases.map((tc) => {
    const sScore = calculateSupplyScore(tc.count);
    const dScore = calculateDemandScoreNormalized(tc.demand);
    const opp = calculateOpportunityScore(sScore, dScore, { demandWeight: 0.5, supplyWeight: 0.5 });
    const passed = Math.abs(opp - tc.expected) < 0.05;
    return {
      ...tc,
      sScore,
      dScore,
      actual: opp,
      passed,
    };
  });

  const allTestsPassed = testResults.every((r) => r.passed);

  const handleDemandChange = (val: number) => {
    const clamped = Math.max(0, Math.min(1, Math.round(val * 100) / 100));
    setDemandWeight(clamped);
    if (autoBalance) {
      setSupplyWeight(Math.round((1 - clamped) * 100) / 100);
    }
  };

  const handleSupplyChange = (val: number) => {
    const clamped = Math.max(0, Math.min(1, Math.round(val * 100) / 100));
    setSupplyWeight(clamped);
    if (autoBalance) {
      setDemandWeight(Math.round((1 - clamped) * 100) / 100);
    }
  };

  const handleResetWeights = () => {
    setDemandWeight(DEFAULT_SETTINGS.demandWeight);
    setSupplyWeight(DEFAULT_SETTINGS.supplyWeight);
  };

  const handleResetThresholds = () => {
    setThresholds(DEFAULT_SETTINGS.categoryThresholds);
  };

  const handleResetFactors = () => {
    setFactors(DEFAULT_PRODUCTION_FACTORS);
  };

  const handleResetBenchmarks = () => {
    setBenchmarks(DEFAULT_SATURATION_BENCHMARKS);
  };

  const handleApplyProposedBenchmark = () => {
    if (!proposedBenchmark || proposedBenchmark < 10) return;
    const oldVal = benchmarks[measurePlatform][measureAssetType];
    const newBenchmarks: SaturationBenchmarks = {
      ...benchmarks,
      [measurePlatform]: {
        ...benchmarks[measurePlatform],
        [measureAssetType]: proposedBenchmark,
      },
    };
    setBenchmarks(newBenchmarks);

    const historyItem: BenchmarkHistoryItem = {
      id: `bm-${Date.now()}`,
      date: new Date().toISOString(),
      platform: measurePlatform,
      assetType: measureAssetType,
      oldValue: oldVal,
      newValue: proposedBenchmark,
      commonKeywordTested: measureCommonKeyword.trim() || 'background',
      notes: `Diterapkan dari fitur Ukur Acuan kata kunci "${measureCommonKeyword.trim() || 'background'}" (${proposedBenchmark.toLocaleString('id-ID')} hasil)`,
    };
    setBenchmarkHistory([historyItem, ...benchmarkHistory]);
    setMeasureAppliedMsg(`Acuan ${measurePlatform} (${measureAssetType}) diperbarui menjadi ${proposedBenchmark.toLocaleString('id-ID')}.`);
    setMeasureResultCount('');
    setProposedBenchmark(null);
  };

  const handleSave = () => {
    const isWeightChanged =
      demandWeight !== settings.demandWeight || supplyWeight !== settings.supplyWeight;

    const newHistory = isWeightChanged
      ? [
          {
            id: `wt-${Date.now()}`,
            date: new Date().toISOString(),
            demandWeight,
            supplyWeight,
            notes: 'Diubah manual melalui menu Pengaturan',
          },
          ...(settings.weightHistory || []),
        ]
      : settings.weightHistory || [];

    onSaveSettings({
      ...settings,
      demandWeight,
      supplyWeight,
      categoryThresholds: thresholds,
      productionFactors: factors,
      weightHistory: newHistory,
      saturationBenchmarks: benchmarks,
      benchmarkHistory,
    });
    onClose();
  };

  // Fungsi Parser Impor Tunggal (Digunakan oleh File Input & Tempel JSON)
  const processImportString = (jsonStr: string) => {
    setImportError(null);
    setImportSuccessMsg(null);
    setPreviewImportData(null);

    if (!jsonStr || !jsonStr.trim()) {
      setImportError('Teks JSON cadangan tidak boleh kosong.');
      return;
    }

    const res = parseFullAppJSON(jsonStr);
    if (!res.success || !res.data) {
      setImportError(res.error || 'Gagal memvalidasi struktur berkas JSON.');
      return;
    }

    const data = res.data;
    setPreviewImportData({
      keywordsCount: data.keywords ? data.keywords.length : 0,
      planCount: data.productionPlan ? data.productionPlan.length : 0,
      myDataCount: data.myDataAssets ? data.myDataAssets.length : 0,
      momentsCount: data.seasonalMoments ? data.seasonalMoments.length : 0,
      schemaVersion: data.migratedFromVersion || CURRENT_SCHEMA_VERSION,
      isMigrated: Boolean(data.migratedFromVersion),
      rawPayload: data,
    });
  };

  // Handler Input File (.json)
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      setImportError('Berkas harus berekstensi .json');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processImportString(content);
    };
    reader.onerror = () => {
      setImportError('Gagal membaca berkas dari perangkat Anda.');
    };
    reader.readAsText(file);
    // Reset file input value so same file can be selected again if needed
    e.target.value = '';
  };

  // Eksekusi Simpan Impor (Pilihan: Gabung atau Timpa)
  const handleConfirmImport = (mode: 'merge' | 'overwrite') => {
    if (!previewImportData || !onImportFullJSON) return;

    onImportFullJSON(previewImportData.rawPayload, mode);
    setImportSuccessMsg(
      mode === 'overwrite'
        ? 'Seluruh data aplikasi berhasil ditimpa dengan data cadangan.'
        : 'Data cadangan berhasil digabungkan dengan data yang ada.'
    );
    setPreviewImportData(null);
    setPasteJsonText('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-base">
              Pengaturan Sistem, Bobot &amp; Cadangan
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Header */}
        <div className="px-5 pt-3 border-b border-slate-100 flex gap-2 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('weights')}
            className={`pb-2 px-1 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'weights'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Bobot Rumus &amp; Tes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scale')}
            className={`pb-2 px-1 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'scale'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
            Skala Tampilan ({Math.round(displayScale * 100)}%)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('benchmarks')}
            className={`pb-2 px-1 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'benchmarks'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Acuan Jenuh &amp; Ukur
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('factors')}
            className={`pb-2 px-1 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'factors'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Faktor Produksi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('thresholds')}
            className={`pb-2 px-1 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'thresholds'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Ambang Kategori
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`pb-2 px-1 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'storage'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Penyimpanan &amp; Cadangan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-1 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Riwayat Bobot
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* TAB 1: BOBOT PELUANG & TES RUMUS */}
          {activeTab === 'weights' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Bobot Permintaan vs Pasokan</h4>
                  <p className="text-[11px] text-slate-500">
                    Proporsi skor peluang (peluang = 100 &times; (bobot_permintaan &times; permintaan + bobot_pasokan &times; pasokan))
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetWeights}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset 0,5 / 0,5
                </button>
              </div>

              {/* Tampilan Status Bobot Saat Ini */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-950 block text-xs">
                    Bobot Saat Ini yang Aktif:
                  </span>
                  <div className="text-[11px] text-emerald-800 mt-0.5 space-x-2">
                    <span>Permintaan: <strong>{demandWeight.toFixed(2)}</strong> ({Math.round(demandWeight * 100)}%)</span>
                    <span>&bull;</span>
                    <span>Pasokan: <strong>{supplyWeight.toFixed(2)}</strong> ({Math.round(supplyWeight * 100)}%)</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full font-mono">
                  Default 0.5 / 0.5
                </span>
              </div>

              {/* Slider Demand */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-700">Bobot Permintaan (Demand):</span>
                  <span className="font-mono text-emerald-700 font-bold">{demandWeight.toFixed(2)} ({Math.round(demandWeight * 100)}%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={demandWeight}
                  onChange={(e) => handleDemandChange(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Slider Supply */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-700">Bobot Pasokan (Supply):</span>
                  <span className="font-mono text-emerald-700 font-bold">{supplyWeight.toFixed(2)} ({Math.round(supplyWeight * 100)}%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={supplyWeight}
                  onChange={(e) => handleSupplyChange(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={autoBalance}
                  onChange={(e) => setAutoBalance(e.target.checked)}
                  className="rounded accent-emerald-600 cursor-pointer"
                />
                <span>Seimbangkan otomatis agar total bobot selalu 1,00 (100%)</span>
              </label>

              {/* PANEL "TES RUMUS" RESMI */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Tes Rumus (Validasi Otomatis Bobot 0,5 / 0,5)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFormulaTest(!showFormulaTest)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    {showFormulaTest ? 'Sembunyikan' : 'Buka Pengujian'}
                  </button>
                </div>

                {showFormulaTest && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Pengujian matematis 4 kasus standar sesuai spesifikasi rumus:
                      <br />
                      <code className="text-[10px] text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono mt-1 inline-block">
                        skor_pasokan = batasi(1 - log10(hasil + 1) / 7, 0, 1); skor_permintaan = permintaan / 5
                      </code>
                    </p>

                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th className="py-1.5 px-2">Kasus Uji</th>
                            <th className="py-1.5 px-2 text-right">Hasil Hitung</th>
                            <th className="py-1.5 px-2 text-right">Ekspektasi</th>
                            <th className="py-1.5 px-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {testResults.map((r, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-1.5 px-2 text-slate-800 font-sans">
                                ({r.count.toLocaleString('id-ID')} hasil, permintaan {r.demand})
                              </td>
                              <td className="py-1.5 px-2 text-right font-bold text-slate-900">
                                {r.actual.toFixed(1)}
                              </td>
                              <td className="py-1.5 px-2 text-right text-slate-500">
                                {r.expected.toFixed(1)}
                              </td>
                              <td className="py-1.5 px-2 text-center">
                                {r.passed ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <Check className="w-3 h-3 text-emerald-600" /> LULUS
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                    <X className="w-3 h-3 text-rose-600" /> GAGAL
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/60 p-2 rounded-lg border border-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {allTestsPassed 
                          ? 'Validasi Sempurna: Seluruh 4 kasus uji terverifikasi 100% lulus dan cocok.' 
                          : 'Ada ketidakcocokan nilai pada kasus uji rumus.'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SKALA TAMPILAN ANTARMUKA */}
          {activeTab === 'scale' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Skala Tampilan Antarmuka</h4>
                  <p className="text-[11px] text-slate-500">
                    Atur proporsi ukuran teks, jarak, dan tata letak secara responsif (standar 70%).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetScale}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Kembalikan ke 70%
                </button>
              </div>

              {scaleFeedback && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{scaleFeedback}</span>
                </div>
              )}

              {/* Slider Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">
                    Penggeser Skala (60% s/d 100%)
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs">
                    {Math.round(displayScale * 100)}% {Math.abs(displayScale - 0.7) < 0.01 ? '(Standar 70%)' : ''}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <input
                    type="range"
                    min="0.6"
                    max="1.0"
                    step="0.05"
                    value={displayScale}
                    onChange={handleScaleSliderChange}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                    aria-label="Pengaturan Skala Tampilan"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono px-0.5">
                    <span>60% (Kompak)</span>
                    <span className="text-emerald-700 font-bold">70% (Default)</span>
                    <span>80%</span>
                    <span>90%</span>
                    <span>100% (Penuh)</span>
                  </div>
                </div>

                {/* Tombol Cepat */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    Tombol Cepat:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[0.7, 0.8, 0.9, 1.0].map((val) => {
                      const isSelected = Math.abs(displayScale - val) < 0.01;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleSelectScale(val)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <span>{Math.round(val * 100)}%</span>
                          {val === 0.7 && <span className="text-[10px] opacity-80">(Standar)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Catatan Keterbacaan dan Sentuhan */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-blue-950">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Keterbacaan, Standar Sentuh &amp; Ekspor</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-blue-800 leading-relaxed">
                  <li><strong>Lantai Ukuran Teks:</strong> Ukuran teks memiliki batas bawah aman (<code className="bg-blue-100/80 px-1 py-0.2 rounded font-mono">max(0.75rem, 10px)</code>) sehingga tidak ada teks yang jatuh di bawah 10px efektif.</li>
                  <li><strong>Area Sentuh Ramah Jari:</strong> Tombol dan tab memiliki tinggi minimal 36px, dan bilah navigasi bawah ponsel minimal 48px.</li>
                  <li><strong>iOS Safari:</strong> Input dan form mempertahankan font 16px untuk mencegah zooming otomatis browser saat fokus.</li>
                  <li><strong>Pengecualian Laporan:</strong> Mode cetak browser dan dokumen HTML ekspor tetap berukuran penuh 100%.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: ACUAN JENUH PER PLATFORM & FITUR UKUR ACUAN (FASE 5A) */}
          {activeTab === 'benchmarks' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-slate-800 text-sm">Jumlah Hasil Acuan Jenuh</h4>
                    <HelpTooltipButton topic="acuan_jenuh" onOpenGuide={onOpenGuide} />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    skor_pasokan = batasi(1 - log10(hasil + 1) / log10(acuan), 0, 1) &middot; Default: 10.000.000 (log10 = 7)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetBenchmarks}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Default (10jt)
                </button>
              </div>

              {/* Tabel Matriks Acuan Jenuh 3x3 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2 px-3">Platform</th>
                      <th className="py-2 px-2">Foto Nyata</th>
                      <th className="py-2 px-2">Foto AI</th>
                      <th className="py-2 px-2">Ilustrasi AI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {(['Adobe Stock', 'Shutterstock', 'Freepik'] as Platform[]).map((plt) => (
                      <tr key={plt} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-sans font-bold text-slate-900">
                          {plt}
                        </td>
                        {(['Foto nyata', 'Foto AI-generated', 'Ilustrasi AI-generated'] as AssetType[]).map((ast) => (
                          <td key={ast} className="py-2 px-2">
                            <input
                              type="number"
                              min="1000"
                              step="500000"
                              value={benchmarks[plt]?.[ast] ?? 10000000}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 10) {
                                  setBenchmarks({
                                    ...benchmarks,
                                    [plt]: {
                                      ...benchmarks[plt],
                                      [ast]: val,
                                    },
                                  });
                                }
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* FITUR "UKUR ACUAN" */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-emerald-950 text-xs">
                    Fitur &ldquo;Ukur Acuan&rdquo; Mandiri
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Masukkan jumlah hasil untuk satu kata kunci sangat umum (misalnya <em>&ldquo;background&rdquo;</em>, <em>&ldquo;texture&rdquo;</em>, atau <em>&ldquo;people&rdquo;</em>) per platform dan tipe aset untuk mengukur plafon kejenuhan pasar saat ini.
                </p>

                {measureAppliedMsg && (
                  <div className="p-2.5 bg-white border border-emerald-300 rounded-lg text-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{measureAppliedMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-emerald-100">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Target Platform:</label>
                    <select
                      value={measurePlatform}
                      onChange={(e) => setMeasurePlatform(e.target.value as Platform)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold cursor-pointer"
                    >
                      <option value="Adobe Stock">Adobe Stock</option>
                      <option value="Shutterstock">Shutterstock</option>
                      <option value="Freepik">Freepik</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Tipe Aset:</label>
                    <select
                      value={measureAssetType}
                      onChange={(e) => setMeasureAssetType(e.target.value as AssetType)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold cursor-pointer"
                    >
                      <option value="Foto nyata">Foto nyata</option>
                      <option value="Foto AI-generated">Foto AI-generated</option>
                      <option value="Ilustrasi AI-generated">Ilustrasi AI-generated</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Kata Kunci Umum Diuji:</label>
                    <input
                      type="text"
                      value={measureCommonKeyword}
                      onChange={(e) => setMeasureCommonKeyword(e.target.value)}
                      placeholder="background / texture / pattern"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Jumlah Hasil di Platform:</label>
                    <input
                      type="number"
                      min="1000"
                      value={measureResultCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMeasureResultCount(val);
                        const num = parseInt(val, 10);
                        if (!isNaN(num) && num > 100) {
                          setProposedBenchmark(num);
                        } else {
                          setProposedBenchmark(null);
                        }
                      }}
                      placeholder="Contoh: 18500000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* Usulan Acuan & Tombol Terapkan */}
                {proposedBenchmark !== null && proposedBenchmark > 100 && (
                  <div className="p-3 bg-white border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Usulan Acuan Jenuh:</span>
                      <span className="font-extrabold text-sm text-emerald-950 font-mono">
                        {proposedBenchmark.toLocaleString('id-ID')} hasil
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        (log10 = {Math.log10(proposedBenchmark).toFixed(2)}) &middot; Acuan saat ini: {(benchmarks[measurePlatform]?.[measureAssetType] ?? 10000000).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyProposedBenchmark}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Terapkan Acuan Ini
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-emerald-800 italic">
                  * Nilai acuan jenuh hanya akan diperbarui jika Anda menekan tombol &ldquo;Terapkan Acuan Ini&rdquo;.
                </p>
              </div>

              {/* Riwayat Acuan Lama */}
              <div className="space-y-2 pt-1">
                <span className="font-bold text-slate-800 text-xs block">
                  Riwayat Pengukuran &amp; Perubahan Acuan ({benchmarkHistory.length})
                </span>

                {benchmarkHistory.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">
                    Belum ada riwayat penyesuaian acuan. Seluruh kombinasi menggunakan nilai default 10.000.000.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-36 overflow-y-auto">
                    {benchmarkHistory.map((item) => (
                      <div key={item.id} className="p-2.5 flex items-center justify-between text-[11px]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{item.platform}</span>
                            <span className="text-slate-500">({item.assetType})</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Dari {item.oldValue.toLocaleString('id-ID')} &rarr; menjadi <strong className="text-emerald-800">{item.newValue.toLocaleString('id-ID')}</strong>
                            {item.commonKeywordTested ? ` (uji: "${item.commonKeywordTested}")` : ''}
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FAKTOR PRIORITAS RENCANA PRODUKSI (FASE 4) */}
          {activeTab === 'factors' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Faktor Prioritas Rencana Produksi</h4>
                  <p className="text-[11px] text-slate-500">
                    skor_prioritas = peluang &times; faktor_musim &times; faktor_data
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetFactors}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Default
                </button>
              </div>

              {/* Faktor Musim */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 block text-xs">
                    A. Faktor Kalender Musiman
                  </span>
                  <HelpTooltipButton topic="faktor_musim" onOpenGuide={onOpenGuide} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      Sedang dalam Jendela (120-60 hari):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="3.0"
                      value={factors.seasonalActive}
                      onChange={(e) => setFactors({ ...factors, seasonalActive: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      Tidak ada momen / normal:
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="3.0"
                      value={factors.seasonalNone}
                      onChange={(e) => setFactors({ ...factors, seasonalNone: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      Jendela telah lewat tahun ini:
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="3.0"
                      value={factors.seasonalPassed}
                      onChange={(e) => setFactors({ ...factors, seasonalPassed: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-900 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Faktor Data Saya */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 block text-xs">
                  B. Faktor Status Data Portofolio (Data Saya)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      Kategori &ldquo;Perbanyak&rdquo;:
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="3.0"
                      value={factors.dataPerbanyak}
                      onChange={(e) => setFactors({ ...factors, dataPerbanyak: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-900 font-bold text-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      Kategori &ldquo;Pertahankan&rdquo; / Data belum cukup:
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="3.0"
                      value={factors.dataPertahankan}
                      onChange={(e) => setFactors({ ...factors, dataPertahankan: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      Kategori &ldquo;Kurangi&rdquo;:
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="3.0"
                      value={factors.dataKurangi}
                      onChange={(e) => setFactors({ ...factors, dataKurangi: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-900 font-bold text-rose-700"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AMBANG BATAS KATEGORI */}
          {activeTab === 'thresholds' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-slate-800 text-sm">Ambang Batas Status Kategori</h4>
                    <HelpTooltipButton topic="ambang_status" onOpenGuide={onOpenGuide} />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Menentukan status Perbanyak, Pertahankan, atau Kurangi di tab Data Saya
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetThresholds}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Ambang
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <label className="font-semibold text-slate-700 block">Minimal Aset Aktif:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={thresholds.minAssets}
                    onChange={(e) => setThresholds({ ...thresholds, minAssets: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Default: 5 aset</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <label className="font-semibold text-slate-700 block">Minimal Bulan Data:</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={thresholds.minMonths}
                    onChange={(e) => setThresholds({ ...thresholds, minMonths: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Default: 2 bulan</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <label className="font-semibold text-slate-700 block">Ambang Unduhan &ldquo;Perbanyak&rdquo;:</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={thresholds.perbanyakDownloadsPerAsset}
                    onChange={(e) => setThresholds({ ...thresholds, perbanyakDownloadsPerAsset: parseFloat(e.target.value) || 0.1 })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-bold text-emerald-700"
                  />
                  <span className="text-[10px] text-slate-400">Default: &ge; 2.0 unduhan/aset</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <label className="font-semibold text-slate-700 block">Ambang Unduhan &ldquo;Kurangi&rdquo;:</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.05"
                    value={thresholds.kurangiDownloadsPerAsset}
                    onChange={(e) => setThresholds({ ...thresholds, kurangiDownloadsPerAsset: parseFloat(e.target.value) || 0.05 })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-bold text-rose-700"
                  />
                  <span className="text-[10px] text-slate-400">Default: &lt; 0.5 unduhan/aset</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PENYIMPANAN, CADANGAN & IMPOR JSON (DUA METODE + PREVIEW) */}
          {activeTab === 'storage' && (
            <div className="space-y-4 text-xs">
              {/* Box Peringatan Wajib Penyimpanan Browser */}
              <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl space-y-2 text-amber-950">
                <div className="flex items-center gap-2 font-black text-sm text-amber-900">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Pemberitahuan Penting: Data Hanya Tersimpan di Browser</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900">
                  Seluruh data riset kata kunci, rencana produksi, file portofolio Data Saya, dan bobot tersimpan secara lokal di <strong>localStorage peramban</strong> ini. Data tidak disimpan di peladen (server) luar.
                </p>
                <p className="text-[11px] leading-relaxed text-amber-900">
                  <strong>Penting:</strong> Pastikan Anda melakukan pencadangan berkala dengan mengunduh berkas JSON di bawah ini agar data dapat dipulihkan sewaktu-waktu.
                </p>
              </div>

              {/* 1. Ekspor Cadangan */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      1. Cadangkan Seluruh Data (JSON v{CURRENT_SCHEMA_VERSION})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Mencakup kata kunci riset, rencana produksi, portofolio Data Saya, kalender &amp; bobot
                    </span>
                  </div>
                  {onExportFullJSON && (
                    <button
                      type="button"
                      onClick={onExportFullJSON}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      Unduh Cadangan
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Pulihkan / Impor Cadangan JSON (Dua Cara: File & Tempel JSON) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 block text-xs">
                    2. Pulihkan Data dari Cadangan JSON
                  </span>
                  <div className="flex items-center gap-1 p-0.5 bg-slate-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setImportMethod('file');
                        setImportError(null);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        importMethod === 'file' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                      }`}
                    >
                      Unggah Berkas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImportMethod('paste');
                        setImportError(null);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        importMethod === 'paste' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                      }`}
                    >
                      Tempel JSON
                    </button>
                  </div>
                </div>

                {/* Pesan Sukses atau Error di Layar */}
                {importError && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-[11px] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong className="block text-rose-900">Galat Impor Cadangan:</strong>
                      {importError}
                    </div>
                  </div>
                )}

                {importSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-[11px] flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{importSuccessMsg}</span>
                  </div>
                )}

                {/* Cara 1: Input File */}
                {importMethod === 'file' && (
                  <div className="space-y-2">
                    <label className="block p-4 border-2 border-dashed border-slate-300 rounded-xl text-center hover:border-emerald-500 hover:bg-emerald-50/20 transition-all cursor-pointer">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <span className="font-semibold text-slate-700 block">Pilih Berkas Cadangan (.json)</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Mendukung cadangan berkas via migrasi otomatis</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Cara 2: Kolom Tempel JSON */}
                {importMethod === 'paste' && (
                  <div className="space-y-2">
                    <textarea
                      rows={4}
                      value={pasteJsonText}
                      onChange={(e) => setPasteJsonText(e.target.value)}
                      placeholder='Tempelkan isi berkas cadangan JSON di sini... {"application": "Microstock Research", ...}'
                      className="w-full p-2.5 font-mono text-[10px] bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => processImportString(pasteJsonText)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        Periksa &amp; Validasi JSON
                      </button>
                    </div>
                  </div>
                )}

                {/* DIALOG PRATINJAU RINGKASAN DATA SEBELUM SIMPAN */}
                {previewImportData && (
                  <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-indigo-600" />
                        Ringkasan Data Cadangan Terdeteksi
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-200 text-indigo-900 rounded-md font-bold">
                        Skema v{previewImportData.schemaVersion} {previewImportData.isMigrated ? '(Dimigrasi)' : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-indigo-900 bg-white/80 p-2.5 rounded-lg border border-indigo-100 font-medium">
                      <div>&bull; Entri Riset Kata Kunci: <strong>{previewImportData.keywordsCount}</strong></div>
                      <div>&bull; Item Rencana Produksi: <strong>{previewImportData.planCount}</strong></div>
                      <div>&bull; Portofolio Data Saya: <strong>{previewImportData.myDataCount}</strong></div>
                      <div>&bull; Momen Kalender: <strong>{previewImportData.momentsCount}</strong></div>
                    </div>

                    <p className="text-[11px] text-indigo-800 leading-relaxed">
                      Pilih bagaimana data cadangan ini diterapkan ke dalam aplikasi:
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleConfirmImport('merge')}
                        className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs text-center"
                        title="Gabungkan data cadangan tanpa menghapus entri unik yang sudah ada"
                      >
                        Gabung Data (Merge)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Apakah Anda yakin ingin menimpa seluruh data aplikasi dengan cadangan ini? Tindakan ini akan mengganti data saat ini secara identik.')) {
                            handleConfirmImport('overwrite');
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-slate-900 hover:bg-rose-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs text-center transition-colors"
                        title="Gantikan semua data aplikasi persis seperti berkas cadangan"
                      >
                        Timpa Semua (Overwrite)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewImportData(null)}
                        className="px-3 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Kode Akses Fitur AI (Vercel Serverless) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-900 block text-xs">
                      3. Kode Akses Fitur AI (Server Vercel)
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    getStoredPasscode() ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {getStoredPasscode() ? 'Kode Tersimpan' : 'Belum Diatur'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Diperlukan jika aplikasi di-deploy ke Vercel dengan proteksi variabel <code className="bg-slate-200 px-1 py-0.2 rounded font-mono text-[10px]">APP_PASSCODE</code>. Fitur non-AI (riset pasar manual, kalender musiman, data saya, dan ekspor laporan) selalu dapat digunakan tanpa kode akses.
                </p>

                {passcodeSuccess && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-lg font-medium flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{passcodeSuccess}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="password"
                    value={passcodeVal}
                    onChange={(e) => setPasscodeVal(e.target.value)}
                    placeholder="Masukkan kode akses AI..."
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={handleSavePasscode}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    Simpan Kode
                  </button>
                  {getStoredPasscode() && (
                    <button
                      type="button"
                      onClick={handleClearPasscode}
                      className="px-3 py-1.5 border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      Hapus Kode Akses
                    </button>
                  )}
                </div>
              </div>

              {/* 4. Skala Tampilan Antarmuka */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ZoomIn className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 block text-xs">
                      4. Skala Tampilan Antarmuka ({Math.round(displayScale * 100)}%)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetScale}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset 70%
                  </button>
                </div>

                <div className="space-y-1">
                  <input
                    type="range"
                    min="0.6"
                    max="1.0"
                    step="0.05"
                    value={displayScale}
                    onChange={handleScaleSliderChange}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                    aria-label="Penggeser Skala Tampilan Cepat"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>60%</span>
                    <span className="text-emerald-700 font-bold">70% (Standar)</span>
                    <span>80%</span>
                    <span>90%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[0.7, 0.8, 0.9, 1.0].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleSelectScale(v)}
                      className={`px-2.5 py-1 text-xs rounded-lg border font-semibold cursor-pointer transition-colors ${
                        Math.abs(displayScale - v) < 0.01
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {Math.round(v * 100)}%{v === 0.7 ? ' (Default)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Reset Options */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="font-bold text-slate-900 block">Manajemen Data Contoh</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onResetSampleData}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs cursor-pointer"
                  >
                    Muat Ulang Data Contoh Lengkap
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('PERINGATAN: Apakah Anda yakin ingin menghapus seluruh kata kunci riset? Tindakan ini tidak dapat dibatalkan.')) {
                        onClearAllData();
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-lg text-xs cursor-pointer"
                  >
                    Kosongkan Kata Kunci
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RIWAYAT BOBOT */}
          {activeTab === 'history' && (
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-800 text-sm block">Riwayat Penyesuaian Bobot</span>
              {!settings.weightHistory || settings.weightHistory.length === 0 ? (
                <p className="text-slate-400 italic">Belum ada catatan riwayat perubahan bobot.</p>
              ) : (
                <div className="space-y-2">
                  {settings.weightHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            Permintaan: {item.demandWeight.toFixed(1)} &middot; Pasokan: {item.supplyWeight.toFixed(1)}
                          </span>
                          {item.appliedFromCalibration && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                              Kalibrasi Spearman &rho; = {item.spearmanRho}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {item.notes || 'Penyesuaian konfigurasi'}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 text-right">
                        {new Date(item.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 cursor-pointer text-xs"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs transition-colors cursor-pointer text-xs"
          >
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
};
