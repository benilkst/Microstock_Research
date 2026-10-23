/**
 * Microstock Research Fase 4 - Lapisan Penyedia Data (Adapter Pattern)
 * 
 * Standar Arsitektur:
 * - Menyediakan antarmuka tunggal untuk sumber data: 'manual' | 'screenshot' | 'api'
 * - Hanya mengimplementasikan 1 adapter aktif: ManualDataProvider
 * - TIDAK memanggil API platform eksternal apa pun
 * - TIDAK menyimpan kunci API di localStorage
 */

import { DataProvider, DataSourceType, KeywordEntry } from '../types/microstock';
import { getTodayDateString } from './calculator';

export class ManualDataProvider implements DataProvider {
  id: DataSourceType = 'manual';
  name = 'Input Manual Pengguna';
  description = 'Memasukkan data riset langsung dari hasil pemeriksaan mandiri di platform microstock';

  validateEntry(entry: Partial<KeywordEntry>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!entry.keyword || entry.keyword.trim().length === 0) {
      errors.push('Kata kunci tidak boleh kosong');
    }

    if (entry.searchResultCount === undefined || entry.searchResultCount === null || isNaN(entry.searchResultCount) || entry.searchResultCount < 0) {
      errors.push('Jumlah hasil pencarian harus berupa angka non-negatif');
    }

    if (entry.demandScore !== null && entry.demandScore !== undefined) {
      if (entry.demandScore < 1 || entry.demandScore > 5) {
        errors.push('Skor permintaan harus bernilai antara 1 sampai 5');
      }
      if (!entry.demandSource || entry.demandSource.trim().length === 0) {
        errors.push('Sumber skor permintaan wajib diisi jika skor permintaan ditentukan');
      }
    }

    if (!entry.checkDate || !/^\d{4}-\d{2}-\d{2}$/.test(entry.checkDate)) {
      errors.push('Format tanggal cek harus YYYY-MM-DD');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  createCleanEntry(
    raw: Partial<KeywordEntry>,
    sourceType: DataSourceType = 'manual'
  ): Omit<KeywordEntry, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      platform: raw.platform || 'Adobe Stock',
      assetType: raw.assetType || 'Foto nyata',
      keyword: (raw.keyword || '').trim(),
      searchResultCount: typeof raw.searchResultCount === 'number' ? Math.max(0, raw.searchResultCount) : 0,
      checkDate: raw.checkDate || getTodayDateString(),
      demandScore: raw.demandScore !== undefined ? raw.demandScore : null,
      demandSource: (raw.demandSource || '').trim(),
      topAssetIds: Array.isArray(raw.topAssetIds) ? raw.topAssetIds.slice(0, 10) : [],
      notes: (raw.notes || '').trim(),
      isAiSuggested: Boolean(raw.isAiSuggested),
      isConfirmedByUser: Boolean(raw.isConfirmedByUser),
      sumber_data: sourceType,
    };
  }
}

/**
 * Registry Penyedia Data (Adapter Factory)
 */
export const activeDataProvider = new ManualDataProvider();

export const AVAILABLE_DATA_PROVIDERS: DataProvider[] = [
  activeDataProvider,
];
