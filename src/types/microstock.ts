/**
 * Microstock Research Fase 3 - Data Types
 * Strict Indonesian Microstock Research Specifications
 */

export type Platform = 'Adobe Stock' | 'Shutterstock' | 'Freepik';

export type AssetType = 'Foto nyata' | 'Foto AI-generated' | 'Ilustrasi AI-generated';

export type ConfidenceLevel = 'Tinggi' | 'Sedang' | 'Rendah';

export type DataSourceType = 'manual' | 'screenshot' | 'api';

export interface CheckHistoryItem {
  id: string;
  checkDate: string; // YYYY-MM-DD
  searchResultCount: number;
  demandScore: number | null;
  demandSource?: string;
  notes?: string;
  recordedAt: string; // ISO string
}

export interface KeywordEntry {
  id: string;
  platform: Platform;
  assetType: AssetType;
  keyword: string;
  searchResultCount: number;
  checkDate: string; // YYYY-MM-DD
  demandScore: number | null; // 1-5 or null
  demandSource: string; // Required if demandScore is set
  topAssetIds: string[]; // Up to 10 IDs
  notes: string;
  isAiSuggested?: boolean; // Dari Ide Niche atau Screenshot AI
  isConfirmedByUser?: boolean; // Pengguna telah memeriksa & mengonfirmasi
  sumber_data?: DataSourceType; // Fase 4: manual / screenshot / api (default: manual)
  checkHistory?: CheckHistoryItem[]; // Fase 5A: Riwayat snapshot cek berurutan tanpa menimpa data lama
  createdAt: string;
  updatedAt: string;
}

export interface NicheSource {
  judul: string;
  url: string;
}

export interface NicheAngleSuggestion {
  copy_space: string;
  konteks_lokal: string;
  gaya: string;
}

export interface NicheIdeaCandidate {
  kata_kunci_en: string;
  varian_id: string;
  alasan: string;
  sinyal_tren: string;
  sumber: NicheSource[];
  saran_permintaan_1_5: number | null;
  saran_sudut: NicheAngleSuggestion;
}

export interface ContributorAssetCount {
  nama_kontributor: string;
  perkiraan_aset_terlihat: number;
}

export interface ScreenshotAnalysisResult {
  jumlah_hasil_terbaca: string | null;
  jumlah_hasil_angka: number | null;
  jumlah_aset_per_kontributor: ContributorAssetCount[] | null;
  gaya_dominan: string | null;
  ada_copy_space: 'ya' | 'sebagian' | 'tidak' | null;
  label_AI_terlihat: boolean | null;
  celah_potensial: string | null;
}

export interface DailyCallCount {
  date: string;
  count: number;
  maxRecommended: number;
}

export interface ComputedMetrics {
  supplyScore: number; // 0 to 1
  demandScoreNormalized: number; // 0 to 1
  opportunityScore: number; // 0 to 100
  confidenceLevel: ConfidenceLevel;
  confidenceReasons: string[];
  daysAgo: number;
}

export interface KeywordWithMetrics extends KeywordEntry {
  metrics: ComputedMetrics;
}

// -------------------------------------------------------------
// FASE 3: DATA SAYA, KALIBRASI BOBOT & INSIGHT
// -------------------------------------------------------------

export interface MyDataAsset {
  id: string;
  assetIdOrTitle: string;
  date: string; // YYYY-MM-DD
  category: string; // Kategori atau kata kunci
  downloads: number; // Jumlah unduhan / penjualan
  revenue: number | null; // Pendapatan ($ atau Rp)
  assetType: AssetType; // Foto nyata / Foto AI-generated / Ilustrasi AI-generated
  createdAt?: string;
}

export type CategoryStatus = 'Perbanyak' | 'Pertahankan' | 'Kurangi' | 'Data belum cukup';

export interface CategoryAnalytics {
  category: string;
  assetType: AssetType;
  assetCount: number;
  totalDownloads: number;
  totalRevenue: number;
  monthsCount: number;
  downloadsPerAsset: number;
  revenuePerAsset: number;
  monthlyTrend: { month: string; downloads: number; revenue: number; assets: number }[];
  status: CategoryStatus;
  statusReason: string;
}

export interface AssetTypeAnalytics {
  assetType: AssetType;
  totalDownloads: number;
  totalRevenue: number;
  activeAssetsCount: number;
  downloadsPerAsset: number;
  categories: CategoryAnalytics[];
  monthlyTrend: { month: string; downloads: number; revenue: number; assets: number }[];
}

export interface CategoryThresholds {
  minAssets: number; // default: 5
  minMonths: number; // default: 2
  perbanyakDownloadsPerAsset: number; // default: 2.0
  kurangiDownloadsPerAsset: number; // default: 0.5
}

export interface WeightHistoryItem {
  id: string;
  date: string; // ISO string
  demandWeight: number;
  supplyWeight: number;
  spearmanRho?: number | null;
  sampleSize?: number;
  appliedFromCalibration?: boolean;
  notes?: string;
}

export interface ProductionFactors {
  seasonalActive: number; // default: 1.2
  seasonalNone: number; // default: 1.0
  seasonalPassed: number; // default: 0.5
  dataPerbanyak: number; // default: 1.2
  dataPertahankan: number; // default: 1.0
  dataKurangi: number; // default: 0.7
}

// -------------------------------------------------------------
// FASE 5A: ACUAN JENUH, KALIBRASI GRUP & EVALUASI RISET
// -------------------------------------------------------------

export type SaturationBenchmarks = Record<Platform, Record<AssetType, number>>;

export const DEFAULT_SATURATION_BENCHMARKS: SaturationBenchmarks = {
  'Adobe Stock': {
    'Foto nyata': 10000000,
    'Foto AI-generated': 10000000,
    'Ilustrasi AI-generated': 10000000,
  },
  'Shutterstock': {
    'Foto nyata': 10000000,
    'Foto AI-generated': 10000000,
    'Ilustrasi AI-generated': 10000000,
  },
  'Freepik': {
    'Foto nyata': 10000000,
    'Foto AI-generated': 10000000,
    'Ilustrasi AI-generated': 10000000,
  },
};

export interface BenchmarkHistoryItem {
  id: string;
  date: string; // ISO string
  platform: Platform;
  assetType: AssetType;
  oldValue: number;
  newValue: number;
  commonKeywordTested?: string;
  notes?: string;
}

export interface GroupWeightConfig {
  demandWeight: number;
  supplyWeight: number;
  rho?: number;
  sampleSize?: number;
  updatedAt?: string;
}

export interface AppSettings {
  demandWeight: number; // default 0.5
  supplyWeight: number; // default 0.5
  categoryThresholds: CategoryThresholds;
  productionFactors: ProductionFactors; // Fase 4: Faktor prioritas produksi
  weightHistory: WeightHistoryItem[];
  // Fase 5A: Acuan Jenuh & Kalibrasi Per Grup
  saturationBenchmarks: SaturationBenchmarks;
  benchmarkHistory?: BenchmarkHistoryItem[];
  groupWeights?: Record<string, GroupWeightConfig>; // key: `${platform}__${assetType}`
}

export interface ResearchCategoryMatch {
  researchId: string; // id dari KeywordEntry Fase 1
  categoryName: string; // nama kategori di Data Saya
  assetType: AssetType;
}

export interface CalibrationPair {
  researchId: string;
  platform: Platform; // Fase 5A: Platform untuk kalibrasi per grup
  keyword: string;
  category: string;
  assetType: AssetType;
  checkDate: string;
  searchResultCount: number;
  demandScore: number | null;
  postResearchAssetCount: number;
  postResearchDownloads: number;
  downloadsPerAsset: number;
  opportunityScoreCurrent: number;
}

export interface SpearmanCalibrationRow {
  demandWeight: number;
  supplyWeight: number;
  rho: number; // Spearman Rank Correlation
  isRecommended: boolean;
}

// Fase 5A: Hasil Evaluasi Riset (Backtest)
export interface BacktestItemResult {
  planId: string;
  titleOrKeyword: string;
  platform: Platform;
  assetType: AssetType;
  researchCheckDate: string;
  opportunityScore: number; // Skor saat riset
  uploadedDate: string;
  daysSinceUpload: number;
  postResearchAssetCount: number;
  postResearchDownloads: number;
  downloadsPerAsset: number;
  isOpportunityAbove70: boolean;
  isAboveGroupMedian: boolean;
  isAccuratePrediction: boolean; // Opp >= 70 AND DPA > Median
}

export interface BacktestEvaluationResult {
  totalEvaluatedItems: number;
  sampleSize: number;
  isSampleSufficient: boolean; // minimal 10 item
  groupMedianDownloadsPerAsset: number;
  itemsAbove70Count: number;
  accuratePredictionsCount: number;
  precisionRate: number; // 0 - 100%
  items: BacktestItemResult[];
}

// Fase 5A: Panel Kesehatan Data
export interface TypoAlertItem {
  keywordId: string;
  keyword: string;
  platform: Platform;
  assetType: AssetType;
  checkDate: string;
  currentCount: number;
  previousCount: number;
  percentChange: number;
  previousDate: string;
  reason?: string;
}

export interface DataHealthMetrics {
  totalEntries: number;
  sourcedEntriesCount: number;
  sourcedPercentage: number;
  confirmedEntriesCount: number;
  confirmedPercentage: number;
  averageDataAgeDays: number;
  entriesWithoutDemandSource: KeywordEntry[];
  typoAlerts: TypoAlertItem[];
}

export interface AiInsightAggregatePayload {
  timestamp: string;
  summaryPerAssetType: {
    assetType: AssetType;
    totalDownloads: number;
    totalRevenue: number;
    activeAssetsCount: number;
    avgDownloadsPerAsset: number;
    categoriesSummary: {
      category: string;
      assetCount: number;
      totalDownloads: number;
      totalRevenue: number;
      downloadsPerAsset: number;
      monthsCount: number;
      status: CategoryStatus;
    }[];
  }[];
}

export type SeasonalWindowStatus = 
  | 'active'       // Sedang dalam jendela (120 - 60 hari sebelum puncak)
  | 'upcoming_30'  // Segera masuk jendela (< 30 hari lagi, yaitu 150 - 121 hari sebelum puncak)
  | 'approaching'  // Mendekati hari puncak (< 60 hari sebelum puncak)
  | 'far_future'   // Masih jauh (> 150 hari sebelum puncak)
  | 'passed';      // Puncak telah lewat

export interface SeasonalMoment {
  id: string;
  name: string;
  category: string;
  peakDate: string; // YYYY-MM-DD
  description: string;
  keywordsRecommendation: string[];
  isCustom?: boolean;
}

export interface SeasonalMomentComputed extends SeasonalMoment {
  idealWindowStart: string; // peakDate - 120 days
  idealWindowEnd: string;   // peakDate - 60 days
  daysUntilPeak: number;
  daysUntilWindowStart: number;
  daysUntilWindowEnd: number;
  status: SeasonalWindowStatus;
  statusLabel: string;
}

// -------------------------------------------------------------
// FASE 4: RENCANA PRODUKSI & KESIAPAN ADAPTER
// -------------------------------------------------------------

export type ProductionStatus = 'Ide' | 'Riset' | 'Produksi' | 'Diunggah' | 'Dievaluasi';

export interface ProductionPlanItem {
  id: string;
  titleOrKeyword: string;
  assetType: AssetType;
  platform: Platform;
  status: ProductionStatus;
  opportunityScore: number; // Skor peluang basis (0-100)
  seasonalFactor: number;   // default: 1.2 jika aktif, 1.0 jika tidak ada, 0.5 jika lewat
  dataFactor: number;       // default: 1.2 jika Perbanyak, 1.0 jika Pertahankan, 0.7 jika Kurangi
  priorityScore: number;    // peluang * faktor_musim * faktor_data
  sourceType: 'riset' | 'ide_niche' | 'manual';
  sourceKeywordId?: string;
  categoryName?: string;
  seasonalMomentId?: string;
  seasonalMomentName?: string;
  uploadedDate?: string;    // YYYY-MM-DD saat status diubah ke 'Diunggah'
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataProvider {
  id: DataSourceType;
  name: string;
  description: string;
  validateEntry: (entry: Partial<KeywordEntry>) => { isValid: boolean; errors: string[] };
}

