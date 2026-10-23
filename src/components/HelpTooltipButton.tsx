import React from 'react';
import { HelpCircle } from 'lucide-react';

export type HelpTopic = 
  | 'skor_permintaan' 
  | 'jumlah_hasil' 
  | 'skor_kepercayaan' 
  | 'faktor_musim' 
  | 'acuan_jenuh' 
  | 'ambang_status';

export const HELP_TOPIC_SECTION_MAP: Record<HelpTopic, string> = {
  skor_permintaan: 'sec-3-konsep-dasar',
  jumlah_hasil: 'sec-3-konsep-dasar',
  skor_kepercayaan: 'sec-5-cara-membaca-skor',
  faktor_musim: 'sec-4-cara-memakai',
  acuan_jenuh: 'sec-5-cara-membaca-skor',
  ambang_status: 'sec-4-cara-memakai',
};

interface HelpTooltipButtonProps {
  topic: HelpTopic;
  onOpenGuide?: (sectionId: string) => void;
  title?: string;
  className?: string;
}

export const HelpTooltipButton: React.FC<HelpTooltipButtonProps> = ({
  topic,
  onOpenGuide,
  title,
  className = '',
}) => {
  const defaultTitles: Record<HelpTopic, string> = {
    skor_permintaan: 'Buka Panduan: Penilaian Skor Permintaan (1-5)',
    jumlah_hasil: 'Buka Panduan: Cara Mencatat Jumlah Hasil Pencarian',
    skor_kepercayaan: 'Buka Panduan: Kriteria Skor Kepercayaan (Tinggi, Sedang, Rendah)',
    faktor_musim: 'Buka Panduan: Rumus Faktor Musim & Jendela Unggah',
    acuan_jenuh: 'Buka Panduan: Konsep Acuan Jenuh Pasokan Platform',
    ambang_status: 'Buka Panduan: Ambang Evaluasi Kategori (Perbanyak/Pertahankan/Kurangi)',
  };

  const sectionId = HELP_TOPIC_SECTION_MAP[topic];
  const tooltipText = title || defaultTitles[topic];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpenGuide?.(sectionId);
      }}
      className={`inline-flex items-center justify-center p-0.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer shrink-0 ${className}`}
      title={tooltipText}
      aria-label={tooltipText}
    >
      <HelpCircle className="w-3.5 h-3.5" />
    </button>
  );
};
