/**
 * Microstock Research - Gemini Client Utilities & Safeguards
 * Menangani Cache 24 jam, Penghitung Panggilan Harian, Kompresi Screenshot, Galat 429, Kode Akses & Offline Safeguard
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
const APP_PASSCODE_STORAGE_KEY = 'microstock_app_passcode';
export const RECOMMENDED_DAILY_LIMIT = 50;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Jam

/**
 * 0. Manajemen Kode Akses Aplikasi (localStorage)
 */
export function getStoredPasscode(): string {
  try {
    return localStorage.getItem(APP_PASSCODE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredPasscode(passcode: string): void {
  try {
    localStorage.setItem(APP_PASSCODE_STORAGE_KEY, passcode.trim());
  } catch (err) {
    console.error('Gagal menyimpan kode akses di localStorage:', err);
  }
}

export function clearStoredPasscode(): void {
  try {
    localStorage.removeItem(APP_PASSCODE_STORAGE_KEY);
  } catch (err) {
    console.error('Gagal menghapus kode akses dari localStorage:', err);
  }
}

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
 * Memastikan resolusi proporsional maks 1280px dan ukuran berkas di bawah 3 MB
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
 * Helper internal untuk menangani respon HTTP API dan kode akses / offline
 */
async function handleApiResponse(response: Response, defaultErrorMsg: string) {
  if (!response.ok) {
    let errorMsg = defaultErrorMsg;
    let is429 = response.status === 429;
    let is401 = response.status === 401;

    try {
      const errJson = await response.json();
      if (errJson.error) errorMsg = errJson.error;
      if (errJson.isRateLimit) is429 = true;
      if (errJson.needsPasscode) is401 = true;
    } catch {
      // ignore
    }

    if (is401) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ai-passcode-needed', { detail: { message: errorMsg } }));
      }
      throw new Error(`KODE_AKSES_DIBUTUHKAN: ${errorMsg}`);
    }

    if (is429) {
      throw new Error('BATAS_KUOTA_429: Batas kuota panggilan Gemini tercapai (Galat 429). Mohon tunggu beberapa saat sebelum mencoba kembali.');
    }

    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Helper untuk menangani galat jaringan / offline / timeout
 */
function handleNetworkError(err: any): never {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Fitur AI membutuhkan koneksi internet. Periksa jaringan Anda dan coba kembali.');
  }
  if (
    err?.name === 'AbortError' ||
    err?.name === 'TimeoutError' ||
    err?.message?.toLowerCase().includes('timeout') ||
    err?.message?.toLowerCase().includes('aborted')
  ) {
    throw new Error('Waktu permintaan ke server AI habis (timeout). Server sedang sibuk, silakan coba beberapa saat lagi.');
  }
  if (
    err?.name === 'TypeError' ||
    err?.message?.toLowerCase().includes('failed to fetch') ||
    err?.message?.toLowerCase().includes('network')
  ) {
    throw new Error('Gagal terhubung ke server backend AI. Pastikan koneksi stabil dan coba kembali.');
  }
  throw err;
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
  // Cek koneksi online
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Fitur AI membutuhkan koneksi internet. Periksa jaringan Anda dan coba kembali.');
  }

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

  // 2. Request ke server (mendukung Vercel /api/niche dan Express)
  try {
    const response = await fetch('/api/niche', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Passcode': getStoredPasscode(),
      },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        assetType: params.assetType,
        theme: params.theme || '',
        seasonalMoment: params.seasonalMoment || '',
        candidateCount: params.candidateCount,
        isPastWindow: params.isPastWindow || false,
      }),
    });

    const result = await handleApiResponse(response, 'Gagal menghubungi layanan Gemini untuk Ide Niche.');
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
  } catch (err: any) {
    return handleNetworkError(err);
  }
}

/**
 * Panggil API Baca Screenshot
 */
export async function requestScreenshotAnalysis(params: {
  imageBase64: string;
  mimeType: string;
  platformHint?: string;
}): Promise<ScreenshotAnalysisResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Fitur AI membutuhkan koneksi internet. Periksa jaringan Anda dan coba kembali.');
  }

  try {
    const response = await fetch('/api/screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Passcode': getStoredPasscode(),
      },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        imageBase64: params.imageBase64,
        mimeType: params.mimeType,
        platformHint: params.platformHint,
      }),
    });

    const result = await handleApiResponse(response, 'Gagal menganalisis screenshot dengan Gemini Vision.');
    incrementDailyCallCount();
    return result.data;
  } catch (err: any) {
    return handleNetworkError(err);
  }
}

/**
 * Panggil API Ringkas Insight Portofolio (Hanya Agregat Data, Bukan Baris Mentah)
 */
export async function requestAiInsightSummary(payload: AiInsightAggregatePayload): Promise<string> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Fitur AI membutuhkan koneksi internet. Periksa jaringan Anda dan coba kembali.');
  }

  try {
    const response = await fetch('/api/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Passcode': getStoredPasscode(),
      },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({ payload }),
    });

    const result = await handleApiResponse(response, 'Gagal menyusun narasi insight portofolio.');
    incrementDailyCallCount();
    return result.narrative || 'Ringkasan berhasil dibuat.';
  } catch (err: any) {
    return handleNetworkError(err);
  }
}
