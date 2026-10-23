/**
 * Microstock Research Fase 3 - CSV Parser Berbasis Browser (PapaParse)
 * 100% diproses di browser klien, TIDAK DIKIRIM ke server mana pun.
 */

import Papa from 'papaparse';
import { AssetType, MyDataAsset } from '../types/microstock';

export interface ColumnMappingConfig {
  dateCol: string;
  assetIdOrTitleCol: string;
  categoryCol: string; // Bisa kosong
  downloadsCol: string;
  revenueCol: string; // Bisa kosong
  assetTypeCol: string; // Bisa kosong jika memilih manual
  fallbackAssetType: AssetType; // Digunakan jika assetTypeCol tidak dipilih atau kosong
}

export interface CsvPreviewResult {
  headers: string[];
  rawRows: Record<string, string>[];
  totalRows: number;
  fileSizeBytes: number;
  fileName: string;
}

export interface ProcessedCsvResult {
  validAssets: MyDataAsset[];
  rejectedCount: number;
  rejectedReasons: { rowIndex: number; reason: string; rawRowSnippet?: string }[];
  duplicateCount: number;
  preview5: MyDataAsset[];
}

/**
 * 1. Baca Header dan Pratinjau Baris Mentah dari CSV menggunakan PapaParse
 */
export async function parseCsvFilePreview(file: File): Promise<CsvPreviewResult> {
  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(
      `Ukuran berkas (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 5 MB. Silakan kurangi ukuran berkas atau filter rentang tanggal.`
    );
  }

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      preview: 50, // ambil 50 baris pertama untuk analisis & deteksi kolom
      complete: (results) => {
        const headers = results.meta.fields || [];
        if (headers.length === 0) {
          return reject(new Error('Berkas CSV tidak memiliki baris tajuk (header) yang valid.'));
        }
        resolve({
          headers,
          rawRows: results.data,
          totalRows: results.data.length,
          fileSizeBytes: file.size,
          fileName: file.name,
        });
      },
      error: (error) => {
        reject(new Error(`Gagal membaca berkas CSV: ${error.message}`));
      },
    });
  });
}

/**
 * 2. Deteksi Otomatis Kemungkinan Pemetaan Kolom berdasarkan Kata Kunci
 */
export function autoDetectColumnMapping(headers: string[]): Partial<ColumnMappingConfig> {
  const findMatch = (patterns: string[]): string => {
    for (const h of headers) {
      const lower = h.trim().toLowerCase();
      for (const p of patterns) {
        if (lower === p || lower.includes(p)) {
          return h;
        }
      }
    }
    return '';
  };

  return {
    dateCol: findMatch(['date', 'tanggal', 'upload_date', 'created_at', 'submit_date', 'day']),
    assetIdOrTitleCol: findMatch(['id', 'asset_id', 'content_id', 'title', 'judul', 'media_id', 'asset', 'name']),
    categoryCol: findMatch(['category', 'kategori', 'keyword', 'tags', 'tag', 'niche', 'subject']),
    downloadsCol: findMatch(['download', 'unduhan', 'downloads', 'sales', 'penjualan', 'dl', 'purchases']),
    revenueCol: findMatch(['revenue', 'earnings', 'pendapatan', 'royalty', 'income', 'earning', 'amount', '$']),
    assetTypeCol: findMatch(['type', 'asset_type', 'media_type', 'tipe', 'content_type']),
  };
}

/**
 * 3. Parser Angka yang mendukung Koma Desimal, Titik Ribuan, Simbol Mata Uang ($/Rp)
 */
export function parseFlexibleNumber(raw: any): number | null {
  if (raw === undefined || raw === null) return null;
  let str = String(raw).trim();
  if (!str) return null;

  // Bersihkan simbol mata uang atau whitespace
  str = str.replace(/[$\u20AC\u00A3Rp,]/g, (match) => (match === ',' ? ',' : ''));
  str = str.trim();

  // Kasus koma desimal Indonesia/Eropa: "12,50" -> "12.50"
  // Atau "1.250,50" -> titik adalah ribuan, koma adalah desimal
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Format 1.250,50
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Format 1,250.50
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Hanya ada koma: "12,5" -> "12.5" atau "1,000"
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  }

  const num = Number(str);
  return isNaN(num) ? null : num;
}

/**
 * 4. Parser Tanggal Multi-Format
 * Mendukung YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, YYYY/MM/DD, ISO date
 */
export function parseFlexibleDate(raw: any): string | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // 1. Cek format standar YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    if (Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // 2. Cek format DD/MM/YYYY atau DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    let p1 = Number(dmyMatch[1]);
    let p2 = Number(dmyMatch[2]);
    const year = dmyMatch[3];

    // Asumsi DD/MM/YYYY kecuali p1 > 12 yang pasti tanggal, atau p2 > 12 yang berarti p1 adalah bulan (MM/DD/YYYY)
    let day = p1;
    let month = p2;
    if (p1 <= 12 && p2 > 12) {
      month = p1;
      day = p2;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 3. Coba parsing dengan objek Date bawaan JavaScript
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      if (year >= 2000 && year <= 2050) {
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
  } catch {
    // fallback
  }

  return null;
}

/**
 * 5. Normalisasi Tipe Aset Microstock
 */
export function normalizeAssetType(raw: any, fallback: AssetType): AssetType {
  if (!raw) return fallback;
  const str = String(raw).trim().toLowerCase();

  if (str.includes('ai') && (str.includes('ilustrasi') || str.includes('vector') || str.includes('illustration'))) {
    return 'Ilustrasi AI-generated';
  }
  if (str.includes('ai') && (str.includes('foto') || str.includes('photo'))) {
    return 'Foto AI-generated';
  }
  if (str.includes('vektor') || str.includes('vector') || str.includes('ilustrasi') || str.includes('illustration')) {
    return 'Ilustrasi AI-generated';
  }
  if (str.includes('foto') || str.includes('photo') || str.includes('real')) {
    return 'Foto nyata';
  }

  return fallback;
}

/**
 * 6. Proses Penuh File CSV Berdasarkan Pemetaan Kolom Pengguna
 */
export async function processFullCsvFile(
  file: File,
  mapping: ColumnMappingConfig
): Promise<ProcessedCsvResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        try {
          const rows = results.data;
          const validAssets: MyDataAsset[] = [];
          const rejectedReasons: { rowIndex: number; reason: string; rawRowSnippet?: string }[] = [];
          const seenKey = new Set<string>();
          let duplicateCount = 0;

          rows.forEach((row, idx) => {
            const rowNumber = idx + 2; // baris ke-1 adalah header di spreadsheet

            // Cek ID / Judul
            const rawId = mapping.assetIdOrTitleCol ? row[mapping.assetIdOrTitleCol]?.trim() : '';
            if (!rawId) {
              rejectedReasons.push({
                rowIndex: rowNumber,
                reason: `Kolom ID / Judul aset ('${mapping.assetIdOrTitleCol}') kosong atau tidak ditemukan.`,
                rawRowSnippet: JSON.stringify(row).substring(0, 100),
              });
              return;
            }

            // Cek Tanggal
            const rawDate = mapping.dateCol ? row[mapping.dateCol] : '';
            const parsedDate = parseFlexibleDate(rawDate);
            if (!parsedDate) {
              rejectedReasons.push({
                rowIndex: rowNumber,
                reason: `Format tanggal tidak valid ('${rawDate || 'kosong'}'). Diharapkan format YYYY-MM-DD atau DD/MM/YYYY.`,
                rawRowSnippet: JSON.stringify(row).substring(0, 100),
              });
              return;
            }

            // Cek Unduhan / Penjualan
            const rawDownloads = mapping.downloadsCol ? row[mapping.downloadsCol] : '';
            const parsedDownloads = parseFlexibleNumber(rawDownloads);
            if (parsedDownloads === null || parsedDownloads < 0) {
              rejectedReasons.push({
                rowIndex: rowNumber,
                reason: `Angka unduhan/penjualan tidak valid ('${rawDownloads || 'kosong'}'). Diharapkan angka non-negatif.`,
                rawRowSnippet: JSON.stringify(row).substring(0, 100),
              });
              return;
            }

            // Cek Pendapatan (opsional)
            let parsedRevenue: number | null = null;
            if (mapping.revenueCol && row[mapping.revenueCol] !== undefined) {
              parsedRevenue = parseFlexibleNumber(row[mapping.revenueCol]);
            }

            // Tipe Aset
            const rawAssetType = mapping.assetTypeCol ? row[mapping.assetTypeCol] : '';
            const finalAssetType = normalizeAssetType(rawAssetType, mapping.fallbackAssetType);

            // Kategori (opsional)
            const rawCategory = mapping.categoryCol ? row[mapping.categoryCol]?.trim() : '';
            const finalCategory = rawCategory || 'Umum';

            // Deduplikasi berdasarkan ID Aset + Tanggal
            const uniqueDedupeKey = `${rawId.toLowerCase()}_${parsedDate}`;
            if (seenKey.has(uniqueDedupeKey)) {
              duplicateCount++;
              return; // Lewati duplikat
            }
            seenKey.add(uniqueDedupeKey);

            validAssets.push({
              id: `myasset-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
              assetIdOrTitle: rawId,
              date: parsedDate,
              category: finalCategory,
              downloads: Math.round(parsedDownloads),
              revenue: parsedRevenue !== null ? Math.round(parsedRevenue * 100) / 100 : null,
              assetType: finalAssetType,
              createdAt: new Date().toISOString(),
            });
          });

          resolve({
            validAssets,
            rejectedCount: rejectedReasons.length,
            rejectedReasons,
            duplicateCount,
            preview5: validAssets.slice(0, 5),
          });
        } catch (err: any) {
          reject(new Error(`Terjadi galat pemrosesan data CSV: ${err.message || err}`));
        }
      },
      error: (err) => {
        reject(new Error(`PapaParse gagal memproses berkas CSV: ${err.message}`));
      },
    });
  });
}
