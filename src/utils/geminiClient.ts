/**
 * Microstock Research Fase 3 - Gemini Client Utilities & Safeguards
 * Menangani Cache 24 jam, Penghitung Panggilan Harian, Kompresi Screenshot, Galat 429 & Ringkasan Insight Portofolio
 */

import { 
  NicheIdeaCandidate, 
  ScreenshotAnalysisResult, 
  DailyCallCount, 
  AiInsightAggregatePayload 
} from '../types/microstock';
import { getTodayDateString } from './calculator';

const DAILY_CALLS_PREFIX = 'microstock_gemini_daily_';
const NICHE_CACHE_PREFIX = 'microstock_niche_cache_';
export const RECOMMENDED_DAILY_LIMIT = 50;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Jam

/**
 * 1. Ambil statistik pemanggilan API harian
 */
export function getDailyCallStats(): DailyCallCount {
  try {
    const today = getTodayDateString();
    const raw = localStorage.getItem(`${DAILY_CALLS_PREFIX}${today}`);
    const count = raw ? parseInt(raw, 10) || 0 : 0;
    return {
      date: today,
      count,
      maxRecommended: RECOMMENDED_DAILY_LIMIT,
    };
  } catch {
    return {
      date: getTodayDateString(),
      count: 0,
      maxRecommended: RECOMMENDED_DAILY_LIMIT,
    };
  }
}

/**
 * Tambah hitungan pemanggilan API harian
 */
export function incrementDailyCallCount(): DailyCallCount {
  try {
    const today = getTodayDateString();
    const current = getDailyCallStats().count + 1;
    localStorage.setItem(`${DAILY_CALLS_PREFIX}${today}`, String(current));
    return {
      date: today,
      count: current,
      maxRecommended: RECOMMENDED_DAILY_LIMIT,
    };
  } catch {
    return getDailyCallStats();
  }
}

/**
 * Buat kunci cache unik untuk parameter Ide Niche
 */
export function generateNicheCacheKey(
  assetType: string,
  theme: string,
  seasonalMoment: string,
  candidateCount: number,
  isPastWindow: boolean = false
): string {
  const normTheme = (theme || '').trim().toLowerCase();
  const normMoment = (seasonalMoment || '').trim().toLowerCase();
  return `${NICHE_CACHE_PREFIX}${assetType}_${normTheme}_${normMoment}_${candidateCount}_${isPastWindow ? 'nextyr' : 'curryr'}`;
}

/**
 * Cek dan ambil data cache Ide Niche jika belum kedaluwarsa 24 jam
 */
export function getCachedNicheIdeas(cacheKey: string): {
  isCached: boolean;
  data: NicheIdeaCandidate[] | null;
  cachedHoursAgo?: number;
} {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return { isCached: false, data: null };

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp || !Array.isArray(parsed.data)) {
      return { isCached: false, data: null };
    }

    const elapsed = Date.now() - parsed.timestamp;
    if (elapsed > CACHE_DURATION_MS) {
      localStorage.removeItem(cacheKey);
      return { isCached: false, data: null };
    }

    const hoursAgo = Math.floor(elapsed / (1000 * 60 * 60));
    return {
      isCached: true,
      data: parsed.data,
      cachedHoursAgo: hoursAgo,
    };
  } catch (err) {
    console.error('Galat membaca cache niche:', err);
    return { isCached: false, data: null };
  }
}

/**
 * Simpan hasil pencarian Ide Niche ke cache 24 jam
 */
export function setCachedNicheIdeas(cacheKey: string, data: NicheIdeaCandidate[]): void {
  try {
    const payload = {
      timestamp: Date.now(),
      data,
    };
    localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch (err) {
    console.error('Galat menyimpan cache niche:', err);
  }
}

/**
 * Kompresi screenshot di sisi klien (Client-side Canvas Compression)
 */
export async function compressScreenshotClientSide(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1280;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Gagal menginisialisasi canvas untuk kompresi gambar.'));
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        resolve({
          base64: compressedBase64,
          mimeType: 'image/jpeg',
        });
      };
      img.onerror = () => reject(new Error('Gagal memproses berkas gambar screenshot.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas dari sistem penyimpanan.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Panggil API Ide Niche (Dua Langkah via Server)
 */
export async function requestNicheIdeas(params: {
  assetType: string;
  theme?: string;
  seasonalMoment?: string;
  candidateCount: number;
  isPastWindow?: boolean;
  bypassCache?: boolean;
}): Promise<{
  data: NicheIdeaCandidate[];
  fromCache: boolean;
  cachedHoursAgo?: number;
}> {
  const cacheKey = generateNicheCacheKey(
    params.assetType,
    params.theme || '',
    params.seasonalMoment || '',
    params.candidateCount,
    params.isPastWindow || false
  );

  // 1. Cek cache 24 jam jika tidak dipaksa bypass
  if (!params.bypassCache) {
    const cached = getCachedNicheIdeas(cacheKey);
    if (cached.isCached && cached.data && cached.data.length > 0) {
      return {
        data: cached.data,
        fromCache: true,
        cachedHoursAgo: cached.cachedHoursAgo,
      };
    }
  }

  // 2. Request ke server
  const response = await fetch('/api/gemini/niche-ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assetType: params.assetType,
      theme: params.theme || '',
      seasonalMoment: params.seasonalMoment || '',
      candidateCount: params.candidateCount,
      isPastWindow: params.isPastWindow || false,
    }),
  });

  if (!response.ok) {
    let errorMsg = 'Gagal menghubungi layanan Gemini.';
    let is429 = response.status === 429;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMsg = errJson.error;
      if (errJson.isRateLimit) is429 = true;
    } catch {
      // ignore
    }

    if (is429) {
      throw new Error('BATAS_KUOTA_429: Batas kuota panggilan Gemini tercapai (Galat 429). Mohon tunggu beberapa saat sebelum mencoba kembali.');
    }
    throw new Error(errorMsg);
  }

  const result = await response.json();
  const candidates: NicheIdeaCandidate[] = result.data || [];

  // Simpan ke cache 24 jam
  if (candidates.length > 0) {
    setCachedNicheIdeas(cacheKey, candidates);
  }

  // Tambah hitungan harian
  incrementDailyCallCount();

  return {
    data: candidates,
    fromCache: false,
  };
}

/**
 * Panggil API Baca Screenshot
 */
export async function requestScreenshotAnalysis(params: {
  imageBase64: string;
  mimeType: string;
  platformHint?: string;
}): Promise<ScreenshotAnalysisResult> {
  const response = await fetch('/api/gemini/read-screenshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: params.imageBase64,
      mimeType: params.mimeType,
      platformHint: params.platformHint,
    }),
  });

  if (!response.ok) {
    let errorMsg = 'Gagal menganalisis screenshot dengan Gemini Vision.';
    let is429 = response.status === 429;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMsg = errJson.error;
      if (errJson.isRateLimit) is429 = true;
    } catch {
      // ignore
    }

    if (is429) {
      throw new Error('BATAS_KUOTA_429: Batas kuota panggilan Gemini tercapai (Galat 429). Mohon tunggu beberapa saat sebelum mencoba kembali.');
    }
    throw new Error(errorMsg);
  }

  const result = await response.json();
  incrementDailyCallCount();
  return result.data;
}

/**
 * Panggil API Ringkas Insight Portofolio (Hanya Agregat Data, Bukan Baris Mentah)
 */
export async function requestAiInsightSummary(payload: AiInsightAggregatePayload): Promise<string> {
  const response = await fetch('/api/gemini/summarize-insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  });

  if (!response.ok) {
    let errorMsg = 'Gagal menyusun narasi insight portofolio.';
    let is429 = response.status === 429;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMsg = errJson.error;
      if (errJson.isRateLimit) is429 = true;
    } catch {
      // ignore
    }

    if (is429) {
      throw new Error('BATAS_KUOTA_429: Batas kuota panggilan Gemini tercapai (Galat 429). Mohon tunggu beberapa saat sebelum mencoba kembali.');
    }
    throw new Error(errorMsg);
  }

  const result = await response.json();
  incrementDailyCallCount();
  return result.narrative || 'Ringkasan berhasil dibuat.';
}
