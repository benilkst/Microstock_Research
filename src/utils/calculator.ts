/**
 * Microstock Research Fase 3 - Perhitungan Rumus Matematis
 * Tanpa AI & Tanpa API Eksternal
 * Termasuk Evaluasi Peluang, Kalender Musiman, Analitik Aset, Korelasi Spearman & Kalibrasi Bobot
 */

import { 
  AppSettings, 
  ConfidenceLevel, 
  ComputedMetrics, 
  KeywordEntry, 
  SeasonalMoment, 
  SeasonalMomentComputed, 
  SeasonalWindowStatus,
  MyDataAsset,
  CategoryAnalytics,
  AssetTypeAnalytics,
  AssetType,
  Platform,
  CategoryStatus,
  CategoryThresholds,
  CalibrationPair,
  SpearmanCalibrationRow,
  ProductionFactors,
  ProductionPlanItem,
  BacktestEvaluationResult,
  BacktestItemResult,
  DataHealthMetrics,
  TypoAlertItem,
  DEFAULT_SATURATION_BENCHMARKS
} from '../types/microstock';

/**
 * Batasi nilai dalam rentang min dan max
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Rumus Skor Pasokan (Supply Score) Fase 5A:
 * skor_pasokan = batasi(1 - log10(jumlah_hasil + 1) / log10(acuan), 0, 1)
 * Default acuan: 10.000.000 (sehingga log10(10.000.000) = 7, skor lama identik 100%)
 */
export function calculateSupplyScore(resultCount: number, saturationBenchmark: number = 10000000): number {
  if (resultCount < 0 || isNaN(resultCount)) return 0;
  const benchmark = Math.max(10, saturationBenchmark || 10000000);
  const logBenchmark = Math.log10(benchmark);
  const raw = 1 - Math.log10(resultCount + 1) / logBenchmark;
  return clamp(raw, 0, 1);
}

/**
 * Ambil acuan jenuh per platform dan tipe aset dari AppSettings
 * Default: 10.000.000
 */
export function getSaturationBenchmark(
  settings: AppSettings | undefined | null,
  platform: Platform,
  assetType: AssetType
): number {
  if (!settings || !settings.saturationBenchmarks) return 10000000;
  const val = settings.saturationBenchmarks?.[platform]?.[assetType];
  return typeof val === 'number' && val >= 10 ? val : 10000000;
}

/**
 * Ambil bobot efektif untuk entri: prioritaskan bobot grup (platform x tipe aset) jika tersedia,
 * jika tidak ada gunakan bobot global (default 0,5 / 0,5)
 */
export function getEffectiveWeights(
  settings: AppSettings | { demandWeight: number; supplyWeight: number } | undefined | null,
  platform?: Platform,
  assetType?: AssetType
): { demandWeight: number; supplyWeight: number; isFromGroup?: boolean } {
  if (!settings) return { demandWeight: 0.5, supplyWeight: 0.5, isFromGroup: false };

  if (platform && assetType && 'groupWeights' in settings && settings.groupWeights) {
    const key = `${platform}__${assetType}`;
    const group = settings.groupWeights[key];
    if (group && typeof group.demandWeight === 'number' && typeof group.supplyWeight === 'number') {
      return {
        demandWeight: group.demandWeight,
        supplyWeight: group.supplyWeight,
        isFromGroup: true,
      };
    }
  }

  const d = typeof settings.demandWeight === 'number' ? settings.demandWeight : 0.5;
  const s = typeof settings.supplyWeight === 'number' ? settings.supplyWeight : 0.5;
  return { demandWeight: d, supplyWeight: s, isFromGroup: false };
}

/**
 * Rumus Skor Permintaan (Demand Score):
 * skor_permintaan = skor_permintaan_1_5 / 5
 * (Rentang 0.0 sampai 1.0)
 */
export function calculateDemandScoreNormalized(demandScore1to5: number | null | undefined): number {
  if (demandScore1to5 === null || demandScore1to5 === undefined || isNaN(demandScore1to5) || demandScore1to5 <= 0) {
    return 0;
  }
  return clamp(demandScore1to5 / 5, 0, 1);
}

/**
 * Rumus Skor Peluang (Opportunity Score 0-100):
 * peluang (0-100) = 100 * (bobot_permintaan * skor_permintaan + bobot_pasokan * skor_pasokan)
 */
export function calculateOpportunityScore(
  supplyScore: number,
  demandScoreNorm: number,
  settings: { demandWeight: number; supplyWeight: number } = { demandWeight: 0.5, supplyWeight: 0.5 }
): number {
  const weighted = (settings.demandWeight * demandScoreNorm) + (settings.supplyWeight * supplyScore);
  const total = 100 * weighted;
  return Math.round(clamp(total, 0, 100) * 10) / 10;
}

/**
 * Hitung selisih hari antara tanggal target dengan hari ini
 */
export function getDaysDifferenceFromToday(dateString: string): number {
  try {
    const target = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - target.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

/**
 * Format tanggal Indonesia YYYY-MM-DD ke tampilan lokal
 */
export function formatIndonesianDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const [year, month, day] = dateString.split('-');
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${parseInt(day, 10)} ${months[mIdx] || month} ${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Ambil tanggal hari ini dalam format YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Kurangi N hari dari tanggal tertentu
 */
export function subtractDays(dateString: string, days: number): string {
  const date = new Date(dateString + 'T00:00:00');
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Evaluasi Skor Kepercayaan (Confidence Score)
 * Aturan:
 * - Tinggi: Jika permintaan (1-5), sumber, dan jumlah hasil terisi dan tanggal cek maksimal 14 hari
 * - Sedang: Jika salah satu kriteria kurang
 * - Rendah: Jika lebih dari satu kriteria kurang
 * 
 * Pengaman Fase 2: Jika entri berasal dari saran AI dan belum dikonfirmasi pengguna,
 * skor kepercayaan maksimal Sedang.
 */
export function evaluateConfidence(
  entry: Pick<KeywordEntry, 'searchResultCount' | 'demandScore' | 'demandSource' | 'checkDate' | 'isAiSuggested' | 'isConfirmedByUser'>
): { level: ConfidenceLevel; reasons: string[]; daysAgo: number } {
  const reasons: string[] = [];
  let missingCount = 0;

  // 1. Jumlah hasil valid
  const hasResultCount = entry.searchResultCount !== undefined && entry.searchResultCount !== null && !isNaN(entry.searchResultCount) && entry.searchResultCount >= 0;
  if (!hasResultCount) {
    missingCount++;
    reasons.push('Jumlah hasil pencarian belum valid atau belum diisi');
  }

  // 2. Permintaan 1-5 terisi
  const hasDemandScore = entry.demandScore !== null && entry.demandScore !== undefined && entry.demandScore >= 1 && entry.demandScore <= 5;
  if (!hasDemandScore) {
    missingCount++;
    reasons.push('Skor permintaan (1-5) belum diisi');
  }

  // 3. Sumber skor permintaan terisi
  const hasDemandSource = typeof entry.demandSource === 'string' && entry.demandSource.trim().length > 0;
  if (!hasDemandSource) {
    missingCount++;
    reasons.push('Sumber skor permintaan belum diisi (wajib jika skor permintaan ditentukan)');
  }

  // 4. Tanggal cek maksimal 14 hari
  const daysAgo = getDaysDifferenceFromToday(entry.checkDate);
  if (daysAgo > 14) {
    missingCount++;
    reasons.push(`Data diperiksa ${daysAgo} hari yang lalu (lebih dari batas 14 hari)`);
  } else if (daysAgo < 0) {
    reasons.push('Tanggal cek di masa depan');
  }

  let level: ConfidenceLevel = 'Tinggi';
  if (missingCount === 1) {
    level = 'Sedang';
  } else if (missingCount >= 2) {
    level = 'Rendah';
  }

  // Aturan Fase 2: jika disarankan AI dan belum dikonfirmasi, level maksimal Sedang
  if (entry.isAiSuggested && !entry.isConfirmedByUser) {
    if (level === 'Tinggi') {
      level = 'Sedang';
    }
    reasons.unshift('Isian disarankan AI (Belum Dikonfirmasi): kepercayaan dibatasi maksimal Sedang');
  }

  return { level, reasons, daysAgo };
}

/**
 * Hitung metrik lengkap untuk sebuah entri kata kunci (Fase 5A)
 * Mendukung acuan jenuh per platform dan bobot kalibrasi per grup
 */
export function computeKeywordMetrics(
  entry: KeywordEntry,
  settings: AppSettings | { demandWeight: number; supplyWeight: number } = { demandWeight: 0.5, supplyWeight: 0.5 },
  explicitBenchmark?: number
): ComputedMetrics {
  const benchmark = typeof explicitBenchmark === 'number'
    ? explicitBenchmark
    : ('saturationBenchmarks' in settings ? getSaturationBenchmark(settings as AppSettings, entry.platform, entry.assetType) : 10000000);

  const effectiveWeights = getEffectiveWeights(settings, entry.platform, entry.assetType);
  const supplyScore = calculateSupplyScore(entry.searchResultCount, benchmark);
  const demandScoreNormalized = calculateDemandScoreNormalized(entry.demandScore);
  const opportunityScore = calculateOpportunityScore(supplyScore, demandScoreNormalized, effectiveWeights);
  const { level: confidenceLevel, reasons: confidenceReasons, daysAgo } = evaluateConfidence(entry);

  return {
    supplyScore,
    demandScoreNormalized,
    opportunityScore,
    confidenceLevel,
    confidenceReasons,
    daysAgo,
  };
}

/**
 * Evaluasi Kalender Musiman:
 * Jendela unggah ideal: 120 sampai 60 hari sebelum tanggal puncak.
 */
export function computeSeasonalMoment(moment: SeasonalMoment): SeasonalMomentComputed {
  if (!moment.peakDate || !moment.peakDate.trim()) {
    return {
      ...moment,
      idealWindowStart: '',
      idealWindowEnd: '',
      daysUntilPeak: 0,
      daysUntilWindowStart: 0,
      daysUntilWindowEnd: 0,
      status: 'passed',
      statusLabel: 'Tanggal puncak belum ditentukan di Kalender',
    };
  }

  const idealWindowStart = subtractDays(moment.peakDate, 120);
  const idealWindowEnd = subtractDays(moment.peakDate, 60);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const peak = new Date(moment.peakDate + 'T00:00:00');
  const winStart = new Date(idealWindowStart + 'T00:00:00');
  const winEnd = new Date(idealWindowEnd + 'T00:00:00');

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilPeak = Math.round((peak.getTime() - today.getTime()) / msPerDay);
  const daysUntilWindowStart = Math.round((winStart.getTime() - today.getTime()) / msPerDay);
  const daysUntilWindowEnd = Math.round((winEnd.getTime() - today.getTime()) / msPerDay);

  let status: SeasonalWindowStatus;
  let statusLabel = '';

  if (daysUntilPeak < 0) {
    status = 'passed';
    statusLabel = 'Puncak Lewat';
  } else if (today >= winStart && today <= winEnd) {
    status = 'active';
    statusLabel = `Sedang dalam Jendela (${daysUntilWindowEnd} hari tersisa)`;
  } else if (daysUntilWindowStart > 0 && daysUntilWindowStart <= 30) {
    status = 'upcoming_30';
    statusLabel = `Segera Masuk Jendela (${daysUntilWindowStart} hari lagi)`;
  } else if (daysUntilPeak <= 60) {
    status = 'approaching';
    statusLabel = `Mendekati Puncak (${daysUntilPeak} hari lagi - Jendela ideal terlewati)`;
  } else {
    status = 'far_future';
    statusLabel = `Masih Jauh (${daysUntilWindowStart} hari ke jendela unggah)`;
  }

  return {
    ...moment,
    idealWindowStart,
    idealWindowEnd,
    daysUntilPeak,
    daysUntilWindowStart,
    daysUntilWindowEnd,
    status,
    statusLabel,
  };
}

// =========================================================================
// FASE 3: ANALITIK DATA SAYA & STATUS KATEGORI
// =========================================================================

/**
 * Tentukan status kategori berdasarkan batas ambang (thresholds)
 * Aturan:
 * - "Data belum cukup": jika minimal 5 aset ATAU 2 bulan data belum tercapai
 * - "Perbanyak": unduhan per aset >= ambang perbanyak
 * - "Kurangi": unduhan per aset < ambang kurangi
 * - "Pertahankan": di antara ambang
 */
export function evaluateCategoryStatus(
  assetCount: number,
  monthsCount: number,
  downloadsPerAsset: number,
  thresholds: CategoryThresholds
): { status: CategoryStatus; reason: string } {
  if (assetCount < thresholds.minAssets || monthsCount < thresholds.minMonths) {
    return {
      status: 'Data belum cukup',
      reason: `Belum memenuhi syarat minimal ${thresholds.minAssets} aset aktif dan ${thresholds.minMonths} bulan data (saat ini: ${assetCount} aset, ${monthsCount} bulan).`,
    };
  }

  if (downloadsPerAsset >= thresholds.perbanyakDownloadsPerAsset) {
    return {
      status: 'Perbanyak',
      reason: `Rasio performa tinggi (${downloadsPerAsset.toFixed(2)} unduhan/aset ≥ ambang ${thresholds.perbanyakDownloadsPerAsset}). Niche potensial untuk diekspansi.`,
    };
  }

  if (downloadsPerAsset < thresholds.kurangiDownloadsPerAsset) {
    return {
      status: 'Kurangi',
      reason: `Rasio performa rendah (${downloadsPerAsset.toFixed(2)} unduhan/aset < ambang ${thresholds.kurangiDownloadsPerAsset}). Pertimbangkan efisiensi waktu produksi.`,
    };
  }

  return {
    status: 'Pertahankan',
    reason: `Performa konsisten di antara batas ambang (${downloadsPerAsset.toFixed(2)} unduhan/aset). Pertahankan portofolio stabil.`,
  };
}

/**
 * Hitung analitik terpisah per tipe aset (Foto nyata, Foto AI, Ilustrasi AI)
 * TIDAK DIGABUNG, dihitung kode murni di browser.
 */
export function computeAssetTypeAnalytics(
  assets: MyDataAsset[],
  thresholds: CategoryThresholds
): Record<AssetType, AssetTypeAnalytics> {
  const assetTypes: AssetType[] = ['Foto nyata', 'Foto AI-generated', 'Ilustrasi AI-generated'];

  const result: Record<AssetType, AssetTypeAnalytics> = {
    'Foto nyata': {
      assetType: 'Foto nyata',
      totalDownloads: 0,
      totalRevenue: 0,
      activeAssetsCount: 0,
      downloadsPerAsset: 0,
      categories: [],
      monthlyTrend: [],
    },
    'Foto AI-generated': {
      assetType: 'Foto AI-generated',
      totalDownloads: 0,
      totalRevenue: 0,
      activeAssetsCount: 0,
      downloadsPerAsset: 0,
      categories: [],
      monthlyTrend: [],
    },
    'Ilustrasi AI-generated': {
      assetType: 'Ilustrasi AI-generated',
      totalDownloads: 0,
      totalRevenue: 0,
      activeAssetsCount: 0,
      downloadsPerAsset: 0,
      categories: [],
      monthlyTrend: [],
    },
  };

  for (const type of assetTypes) {
    const typeAssets = assets.filter((a) => a.assetType === type);

    let totalDownloads = 0;
    let totalRevenue = 0;
    const uniqueAssetIds = new Set<string>();

    // Kelompokkan per kategori
    const categoryMap = new Map<string, MyDataAsset[]>();
    // Kelompokkan per bulan untuk tren
    const monthMap = new Map<string, { downloads: number; revenue: number; assets: Set<string> }>();

    for (const item of typeAssets) {
      totalDownloads += item.downloads;
      if (item.revenue !== null) {
        totalRevenue += item.revenue;
      }
      uniqueAssetIds.add(item.assetIdOrTitle);

      const catName = item.category ? item.category.trim() : 'Lainnya / Tanpa Kategori';
      if (!categoryMap.has(catName)) {
        categoryMap.set(catName, []);
      }
      categoryMap.get(catName)!.push(item);

      // Month YYYY-MM
      const monthKey = (item.date || '').substring(0, 7) || 'Tidak Diketahui';
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { downloads: 0, revenue: 0, assets: new Set() });
      }
      const mObj = monthMap.get(monthKey)!;
      mObj.downloads += item.downloads;
      if (item.revenue !== null) mObj.revenue += item.revenue;
      mObj.assets.add(item.assetIdOrTitle);
    }

    const activeAssetsCount = uniqueAssetIds.size;
    const downloadsPerAsset = activeAssetsCount > 0 ? Math.round((totalDownloads / activeAssetsCount) * 100) / 100 : 0;

    // Hitung per kategori
    const categoryAnalytics: CategoryAnalytics[] = [];
    for (const [catName, catItems] of categoryMap.entries()) {
      let catDownloads = 0;
      let catRevenue = 0;
      const catAssetIds = new Set<string>();
      const catMonths = new Set<string>();
      const catMonthMap = new Map<string, { downloads: number; revenue: number; assets: Set<string> }>();

      for (const ci of catItems) {
        catDownloads += ci.downloads;
        if (ci.revenue !== null) catRevenue += ci.revenue;
        catAssetIds.add(ci.assetIdOrTitle);

        const mKey = (ci.date || '').substring(0, 7) || 'N/A';
        catMonths.add(mKey);

        if (!catMonthMap.has(mKey)) {
          catMonthMap.set(mKey, { downloads: 0, revenue: 0, assets: new Set() });
        }
        const cmo = catMonthMap.get(mKey)!;
        cmo.downloads += ci.downloads;
        if (ci.revenue !== null) cmo.revenue += ci.revenue;
        cmo.assets.add(ci.assetIdOrTitle);
      }

      const catAssetCount = catAssetIds.size;
      const catDpa = catAssetCount > 0 ? Math.round((catDownloads / catAssetCount) * 100) / 100 : 0;
      const catRpa = catAssetCount > 0 ? Math.round((catRevenue / catAssetCount) * 100) / 100 : 0;
      const monthsCount = catMonths.size;

      const { status, reason } = evaluateCategoryStatus(catAssetCount, monthsCount, catDpa, thresholds);

      const catTrend = Array.from(catMonthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, data]) => ({
          month,
          downloads: data.downloads,
          revenue: Math.round(data.revenue * 100) / 100,
          assets: data.assets.size,
        }));

      categoryAnalytics.push({
        category: catName,
        assetType: type,
        assetCount: catAssetCount,
        totalDownloads: catDownloads,
        totalRevenue: Math.round(catRevenue * 100) / 100,
        monthsCount,
        downloadsPerAsset: catDpa,
        revenuePerAsset: catRpa,
        monthlyTrend: catTrend,
        status,
        statusReason: reason,
      });
    }

    // Urutkan kategori berdasarkan total unduhan terbanyak
    categoryAnalytics.sort((a, b) => b.totalDownloads - a.totalDownloads);

    // Monthly trend sorted
    const monthlyTrend = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        downloads: data.downloads,
        revenue: Math.round(data.revenue * 100) / 100,
        assets: data.assets.size,
      }));

    result[type] = {
      assetType: type,
      totalDownloads,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      activeAssetsCount,
      downloadsPerAsset,
      categories: categoryAnalytics,
      monthlyTrend,
    };
  }

  return result;
}

// =========================================================================
// FASE 3: KALIBRASI BOBOT & KORELASI SPEARMAN
// =========================================================================

/**
 * Menghitung pemeringkatan (ranking) dengan fractional average untuk nilai seri (ties)
 */
function computeRanks(values: number[]): number[] {
  const indexed = values.map((val, origIdx) => ({ val, origIdx }));
  indexed.sort((a, b) => a.val - b.val);

  const ranks = new Array(values.length).fill(0);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length - 1 && indexed[j + 1].val === indexed[j].val) {
      j++;
    }
    const avgRank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) {
      ranks[indexed[k].origIdx] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

/**
 * Hitung Koefisien Korelasi Spearman (Rank Correlation Coefficient - Rho)
 * Nilai antara -1.0 sampai +1.0
 */
export function calculateSpearmanCorrelation(pairs: { x: number; y: number }[]): number {
  const n = pairs.length;
  if (n < 2) return 0;

  const xVals = pairs.map((p) => p.x);
  const yVals = pairs.map((p) => p.y);

  const rankX = computeRanks(xVals);
  const rankY = computeRanks(yVals);

  // Hitung rata-rata peringkat
  let meanX = 0;
  let meanY = 0;
  for (let i = 0; i < n; i++) {
    meanX += rankX[i];
    meanY += rankY[i];
  }
  meanX /= n;
  meanY /= n;

  // Hitung Kovarians & Varian peringkat
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = rankX[i] - meanX;
    const dy = rankY[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const denominator = Math.sqrt(denX * denY);
  if (denominator === 0) return 0;

  const rho = num / denominator;
  return Math.round(clamp(rho, -1, 1) * 1000) / 1000;
}

/**
 * Hitung kalibrasi bobot permintaan 0.0 sampai 1.0 (kelipatan 0.1)
 * Mencari kombinasi bobot dengan korelasi Spearman tertinggi antara skor peluang dan unduhan per aset.
 */
export function computeWeightCalibrationTable(pairs: CalibrationPair[]): {
  rows: SpearmanCalibrationRow[];
  recommendedWeight: { demandWeight: number; supplyWeight: number; rho: number } | null;
} {
  if (pairs.length < 10) {
    return {
      rows: [],
      recommendedWeight: null,
    };
  }

  const weights: number[] = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const rows: SpearmanCalibrationRow[] = [];

  let bestRho = -999;
  let bestIdx = -1;

  for (let i = 0; i < weights.length; i++) {
    const dWeight = weights[i];
    const sWeight = Math.round((1 - dWeight) * 10) / 10;

    // Hitung ulang skor peluang tiap pasangan dengan kombinasi bobot ini
    const xyPairs = pairs.map((p) => {
      const supplyScore = calculateSupplyScore(p.searchResultCount);
      const demandScoreNorm = calculateDemandScoreNormalized(p.demandScore);
      const oppScore = calculateOpportunityScore(supplyScore, demandScoreNorm, {
        demandWeight: dWeight,
        supplyWeight: sWeight,
      });
      return {
        x: oppScore,
        y: p.downloadsPerAsset,
      };
    });

    const rho = calculateSpearmanCorrelation(xyPairs);
    rows.push({
      demandWeight: dWeight,
      supplyWeight: sWeight,
      rho,
      isRecommended: false,
    });

    if (rho > bestRho) {
      bestRho = rho;
      bestIdx = i;
    }
  }

  // Tandai kombinasi terbaik
  if (bestIdx >= 0) {
    rows[bestIdx].isRecommended = true;
  }

  return {
    rows,
    recommendedWeight: bestIdx >= 0
      ? {
          demandWeight: rows[bestIdx].demandWeight,
          supplyWeight: rows[bestIdx].supplyWeight,
          rho: rows[bestIdx].rho,
        }
      : null,
  };
}

/**
 * Kalibrasi Spearman Per Grup (Platform x Tipe Aset) - Fase 5A
 * Syarat minimal 10 pasangan per grup; grup yang kurang ditampilkan "Data belum cukup (n=...)"
 */
export function computeGroupCalibrationTable(
  pairs: CalibrationPair[],
  platform?: Platform,
  assetType?: AssetType,
  saturationBenchmark: number = 10000000
): {
  filteredPairs: CalibrationPair[];
  sampleSize: number;
  isSufficient: boolean;
  rows: SpearmanCalibrationRow[];
  recommendedWeight: { demandWeight: number; supplyWeight: number; rho: number } | null;
} {
  const filtered = pairs.filter((p) => {
    const matchPlatform = !platform || p.platform === platform;
    const matchAsset = !assetType || p.assetType === assetType;
    return matchPlatform && matchAsset;
  });

  const sampleSize = filtered.length;
  if (sampleSize < 10) {
    return {
      filteredPairs: filtered,
      sampleSize,
      isSufficient: false,
      rows: [],
      recommendedWeight: null,
    };
  }

  const weights: number[] = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const rows: SpearmanCalibrationRow[] = [];

  let bestRho = -999;
  let bestIdx = -1;

  for (let i = 0; i < weights.length; i++) {
    const dWeight = weights[i];
    const sWeight = Math.round((1 - dWeight) * 10) / 10;

    const xyPairs = filtered.map((p) => {
      const supplyScore = calculateSupplyScore(p.searchResultCount, saturationBenchmark);
      const demandScoreNorm = calculateDemandScoreNormalized(p.demandScore);
      const oppScore = calculateOpportunityScore(supplyScore, demandScoreNorm, {
        demandWeight: dWeight,
        supplyWeight: sWeight,
      });
      return {
        x: oppScore,
        y: p.downloadsPerAsset,
      };
    });

    const rho = calculateSpearmanCorrelation(xyPairs);
    rows.push({
      demandWeight: dWeight,
      supplyWeight: sWeight,
      rho,
      isRecommended: false,
    });

    if (rho > bestRho) {
      bestRho = rho;
      bestIdx = i;
    }
  }

  if (bestIdx >= 0) {
    rows[bestIdx].isRecommended = true;
  }

  return {
    filteredPairs: filtered,
    sampleSize,
    isSufficient: true,
    rows,
    recommendedWeight: bestIdx >= 0
      ? {
          demandWeight: rows[bestIdx].demandWeight,
          supplyWeight: rows[bestIdx].supplyWeight,
          rho: rows[bestIdx].rho,
        }
      : null,
  };
}

// =========================================================================
// FASE 5A: EVALUASI RISET (BACKTEST)
// =========================================================================

/**
 * Menghitung nilai median dari sebuah array angka
 */
export function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
  }
  return Math.round(sorted[mid] * 100) / 100;
}

/**
 * Evaluasi Riset (Backtest) - Fase 5A
 * Untuk item Rencana berstatus 'Dievaluasi', bandingkan skor peluang saat riset
 * dengan unduhan per aset 60 hari setelah unggah (dari Data Saya, hanya aset yang diunggah setelah tanggal cek).
 * Tampilkan tingkat ketepatan: proporsi item berskor >= 70 yang unduhan per asetnya di atas median kelompoknya.
 */
export function computeBacktestEvaluation(
  planItems: ProductionPlanItem[],
  myDataAssets: MyDataAsset[],
  keywords: KeywordEntry[]
): BacktestEvaluationResult {
  const evaluatedPlanItems = planItems.filter((item) => item.status === 'Dievaluasi');
  const totalEvaluatedItems = evaluatedPlanItems.length;

  if (totalEvaluatedItems === 0) {
    return {
      totalEvaluatedItems: 0,
      sampleSize: 0,
      isSampleSufficient: false,
      groupMedianDownloadsPerAsset: 0,
      itemsAbove70Count: 0,
      accuratePredictionsCount: 0,
      precisionRate: 0,
      items: [],
    };
  }

  // Siapkan data per item
  const rawResults: Array<{
    planId: string;
    titleOrKeyword: string;
    platform: Platform;
    assetType: AssetType;
    researchCheckDate: string;
    opportunityScore: number;
    uploadedDate: string;
    daysSinceUpload: number;
    postResearchAssetCount: number;
    postResearchDownloads: number;
    downloadsPerAsset: number;
  }> = [];

  for (const item of evaluatedPlanItems) {
    // 1. Cari tanggal cek riset terkait
    const matchedKw = keywords.find(
      (k) => k.id === item.sourceKeywordId || k.keyword.toLowerCase() === item.titleOrKeyword.toLowerCase()
    );
    const researchCheckDate = matchedKw?.checkDate || item.createdAt.substring(0, 10);

    // 2. Filter aset di Data Saya:
    // Tipe aset sama, kategori terkait sama, dan tanggal unggah paska tanggal cek riset
    const categoryKey = (item.categoryName || '').trim().toLowerCase();
    const itemKeywordKey = item.titleOrKeyword.trim().toLowerCase();

    const postResearchAssets = myDataAssets.filter((asset) => {
      if (asset.assetType !== item.assetType) return false;
      
      const assetCat = (asset.category || '').trim().toLowerCase();
      const assetTitle = (asset.assetIdOrTitle || '').trim().toLowerCase();
      const matchCat = categoryKey && (assetCat.includes(categoryKey) || categoryKey.includes(assetCat));
      const matchKw = assetCat.includes(itemKeywordKey) || assetTitle.includes(itemKeywordKey);

      if (!matchCat && !matchKw) return false;

      // Hanya aset yang diunggah setelah tanggal cek riset
      return asset.date >= researchCheckDate;
    });

    const uniqueAssetIds = new Set(postResearchAssets.map((a) => a.assetIdOrTitle));
    const postResearchAssetCount = uniqueAssetIds.size;
    const postResearchDownloads = postResearchAssets.reduce((sum, a) => sum + a.downloads, 0);
    const downloadsPerAsset = postResearchAssetCount > 0
      ? Math.round((postResearchDownloads / postResearchAssetCount) * 100) / 100
      : 0;

    const daysSinceUpload = item.uploadedDate ? getDaysDifferenceFromToday(item.uploadedDate) : 0;

    rawResults.push({
      planId: item.id,
      titleOrKeyword: item.titleOrKeyword,
      platform: item.platform,
      assetType: item.assetType,
      researchCheckDate,
      opportunityScore: item.opportunityScore,
      uploadedDate: item.uploadedDate || '-',
      daysSinceUpload,
      postResearchAssetCount,
      postResearchDownloads,
      downloadsPerAsset,
    });
  }

  // Hitung median unduhan per aset untuk kelompok ini
  const allDpa = rawResults.map((r) => r.downloadsPerAsset);
  const groupMedian = calculateMedian(allDpa);

  // Evaluasi ketepatan
  let itemsAbove70Count = 0;
  let accuratePredictionsCount = 0;

  const items: BacktestItemResult[] = rawResults.map((r) => {
    const isOpportunityAbove70 = r.opportunityScore >= 70;
    const isAboveGroupMedian = r.downloadsPerAsset > groupMedian;
    const isAccuratePrediction = isOpportunityAbove70 && isAboveGroupMedian;

    if (isOpportunityAbove70) {
      itemsAbove70Count++;
      if (isAboveGroupMedian) {
        accuratePredictionsCount++;
      }
    }

    return {
      ...r,
      isOpportunityAbove70,
      isAboveGroupMedian,
      isAccuratePrediction,
    };
  });

  const precisionRate = itemsAbove70Count > 0
    ? Math.round((accuratePredictionsCount / itemsAbove70Count) * 1000) / 10
    : 0;

  return {
    totalEvaluatedItems,
    sampleSize: totalEvaluatedItems,
    isSampleSufficient: totalEvaluatedItems >= 10,
    groupMedianDownloadsPerAsset: groupMedian,
    itemsAbove70Count,
    accuratePredictionsCount,
    precisionRate,
    items,
  };
}

// =========================================================================
// FASE 5A: PANEL KESEHATAN DATA & DETEKSI SALAH KETIK
// =========================================================================

/**
 * Hitung metrik kesehatan data kata kunci (Fase 5A):
 * - Persentase entri bersumber
 * - Persentase terkonfirmasi
 * - Rata-rata usia data
 * - Entri tanpa sumber permintaan
 * - Peringatan kemungkinan salah ketik (perubahan > 50% antar dua cek berurutan)
 */
export function computeDataHealthMetrics(keywords: KeywordEntry[]): DataHealthMetrics {
  const totalEntries = keywords.length;
  if (totalEntries === 0) {
    return {
      totalEntries: 0,
      sourcedEntriesCount: 0,
      sourcedPercentage: 0,
      confirmedEntriesCount: 0,
      confirmedPercentage: 0,
      averageDataAgeDays: 0,
      entriesWithoutDemandSource: [],
      typoAlerts: [],
    };
  }

  // 1. Bersumber (memiliki demandSource yang tidak kosong)
  const sourcedEntries = keywords.filter(
    (k) => typeof k.demandSource === 'string' && k.demandSource.trim().length > 0
  );
  const sourcedPercentage = Math.round((sourcedEntries.length / totalEntries) * 1000) / 10;

  // 2. Terkonfirmasi (isConfirmedByUser === true)
  const confirmedEntries = keywords.filter((k) => k.isConfirmedByUser);
  const confirmedPercentage = Math.round((confirmedEntries.length / totalEntries) * 1000) / 10;

  // 3. Rata-rata usia data (hari)
  const ages = keywords.map((k) => Math.max(0, getDaysDifferenceFromToday(k.checkDate)));
  const totalAge = ages.reduce((sum, a) => sum + a, 0);
  const averageDataAgeDays = Math.round((totalAge / totalEntries) * 10) / 10;

  // 4. Entri tanpa sumber permintaan (skor permintaan terisi namun sumber kosong)
  const entriesWithoutDemandSource = keywords.filter(
    (k) => k.demandScore !== null && (!k.demandSource || !k.demandSource.trim())
  );

  // 5. Peringatan salah ketik: perubahan hasil > 50% antar dua cek berurutan
  const typoAlerts: TypoAlertItem[] = [];

  for (const k of keywords) {
    if (k.checkHistory && k.checkHistory.length > 0) {
      // Ambil snapshot terakhir sebelum cek saat ini
      const prevCheck = k.checkHistory[k.checkHistory.length - 1];
      const prevCount = prevCheck.searchResultCount;
      const currCount = k.searchResultCount;

      const diff = Math.abs(currCount - prevCount);
      const base = Math.max(prevCount, 1);
      const percentChange = diff / base;

      if (percentChange > 0.5) {
        typoAlerts.push({
          keywordId: k.id,
          keyword: k.keyword,
          platform: k.platform,
          assetType: k.assetType,
          checkDate: k.checkDate,
          currentCount: currCount,
          previousCount: prevCount,
          percentChange: Math.round(percentChange * 100),
          previousDate: prevCheck.checkDate,
          reason: `Hasil berubah drastis ${Math.round(percentChange * 100)}% (${prevCount.toLocaleString('id-ID')} -> ${currCount.toLocaleString('id-ID')})`,
        });
      }
    }
  }

  return {
    totalEntries,
    sourcedEntriesCount: sourcedEntries.length,
    sourcedPercentage,
    confirmedEntriesCount: confirmedEntries.length,
    confirmedPercentage,
    averageDataAgeDays,
    entriesWithoutDemandSource,
    typoAlerts,
  };
}

// =========================================================================
// FASE 4: SKOR PRIORITAS RENCANA PRODUKSI
// =========================================================================

/**
 * Rumus Skor Prioritas Rencana Produksi:
 * prioritas = peluang * faktor_musim * faktor_data
 * Dihitung transparan oleh kode, tanpa AI.
 */
export function calculatePriorityScore(
  opportunityScore: number,
  seasonalFactor: number,
  dataFactor: number
): number {
  const raw = opportunityScore * seasonalFactor * dataFactor;
  return Math.round(clamp(raw, 0, 1000) * 10) / 10;
}

/**
 * Tentukan faktor musim berdasarkan status momen:
 * - 1.2 jika dalam jendela unggah (active)
 * - 1.0 jika tidak ada momen terkait (atau status lain seperti upcoming/far_future)
 * - 0.5 jika jendela tahun ini sudah lewat (passed / approaching)
 */
export function determineSeasonalFactor(
  momentStatus: SeasonalWindowStatus | undefined | null,
  factors: ProductionFactors
): number {
  if (!momentStatus) return factors.seasonalNone;
  if (momentStatus === 'active') return factors.seasonalActive;
  if (momentStatus === 'passed' || momentStatus === 'approaching') return factors.seasonalPassed;
  return factors.seasonalNone;
}

/**
 * Evaluasi mendalam faktor musim lengkap beserta keterangan alasan dan pengecekan tanggal puncak kalender
 */
export function evaluateSeasonalFactorDetail(
  momentName: string | undefined | null,
  allMoments: SeasonalMoment[],
  factors: ProductionFactors
): {
  factor: number;
  reason: string;
  hasEmptyPeakDate: boolean;
  momentFound: boolean;
} {
  if (!momentName || !momentName.trim()) {
    return {
      factor: factors.seasonalNone,
      reason: `Faktor musim ${factors.seasonalNone}: tidak ada momen terkait`,
      hasEmptyPeakDate: false,
      momentFound: false,
    };
  }

  const found = allMoments.find(
    (m) => m.name.toLowerCase() === momentName.trim().toLowerCase()
  );

  if (!found) {
    return {
      factor: factors.seasonalNone,
      reason: `Faktor musim ${factors.seasonalNone}: momen "${momentName}" belum terdaftar di Kalender`,
      hasEmptyPeakDate: false,
      momentFound: false,
    };
  }

  if (!found.peakDate || !found.peakDate.trim()) {
    return {
      factor: factors.seasonalNone,
      reason: `Peringatan: Tanggal puncak untuk momen "${found.name}" belum diisi di Kalender`,
      hasEmptyPeakDate: true,
      momentFound: true,
    };
  }

  const computed = computeSeasonalMoment(found);
  if (computed.status === 'active') {
    return {
      factor: factors.seasonalActive,
      reason: `Faktor musim ${factors.seasonalActive}: dalam jendela unggah ${found.name}`,
      hasEmptyPeakDate: false,
      momentFound: true,
    };
  }

  if (computed.status === 'passed' || computed.status === 'approaching') {
    return {
      factor: factors.seasonalPassed,
      reason: `Faktor musim ${factors.seasonalPassed}: jendela ${found.name} sudah lewat`,
      hasEmptyPeakDate: false,
      momentFound: true,
    };
  }

  // upcoming_30 atau far_future
  return {
    factor: factors.seasonalNone,
    reason: `Faktor musim ${factors.seasonalNone}: jendela unggah ${found.name} belum dibuka`,
    hasEmptyPeakDate: false,
    momentFound: true,
  };
}

/**
 * Tentukan faktor data berdasarkan status kategori di Data Saya:
 * - 1.2 jika kategori "Perbanyak"
 * - 1.0 jika "Pertahankan" atau data belum cukup
 * - 0.7 jika "Kurangi"
 */
export function determineDataFactor(
  categoryStatus: CategoryStatus | undefined | null,
  factors: ProductionFactors
): number {
  if (!categoryStatus) return factors.dataPertahankan;
  if (categoryStatus === 'Perbanyak') return factors.dataPerbanyak;
  if (categoryStatus === 'Kurangi') return factors.dataKurangi;
  return factors.dataPertahankan;
}

/**
 * Cek apakah aset yang sudah diunggah sudah mencapai usia 60 hari untuk dievaluasi
 */
export function isReadyForEvaluation(
  uploadedDate?: string,
  minDays: number = 60
): { ready: boolean; daysAgo: number } {
  if (!uploadedDate) return { ready: false, daysAgo: 0 };
  const daysAgo = getDaysDifferenceFromToday(uploadedDate);
  return {
    ready: daysAgo >= minDays,
    daysAgo,
  };
}

