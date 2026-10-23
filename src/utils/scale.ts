/**
 * Utilitas Pengelolaan Skala Tampilan Microstock Research
 * Menggunakan variabel CSS --skala dan html { font-size: calc(16px * var(--skala)) }
 */

export const DISPLAY_SCALE_STORAGE_KEY = 'microstock_display_scale';
export const DEFAULT_DISPLAY_SCALE = 0.7; // Default 70%

export function getStoredDisplayScale(): number {
  if (typeof window === 'undefined') return DEFAULT_DISPLAY_SCALE;
  try {
    const saved = localStorage.getItem(DISPLAY_SCALE_STORAGE_KEY);
    if (!saved) return DEFAULT_DISPLAY_SCALE;
    const val = parseFloat(saved);
    if (isNaN(val) || val < 0.6 || val > 1.0) return DEFAULT_DISPLAY_SCALE;
    return Math.round(val * 100) / 100;
  } catch {
    return DEFAULT_DISPLAY_SCALE;
  }
}

export function applyDisplayScale(scale: number): void {
  const clamped = Math.max(0.6, Math.min(1.0, Math.round(scale * 100) / 100));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DISPLAY_SCALE_STORAGE_KEY, String(clamped));
    } catch (e) {
      console.warn('Gagal menyimpan skala ke localStorage', e);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--skala', String(clamped));
    }
  }
}
