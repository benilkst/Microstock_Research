import React, { useState } from 'react';
import { AppSettings } from '../types/microstock';
import { calculateSupplyScore, calculateDemandScoreNormalized, calculateOpportunityScore } from '../utils/calculator';
import { HelpCircle, ChevronDown, ChevronUp, Calculator, ShieldCheck, Info } from 'lucide-react';
import { HelpTooltipButton } from './HelpTooltipButton';

interface FormulaExplainerProps {
  settings: AppSettings;
  onOpenGuide?: (sectionId: string) => void;
}

export const FormulaExplainer: React.FC<FormulaExplainerProps> = ({ settings, onOpenGuide }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState(2500);
  const [testDemand, setTestDemand] = useState(4);

  const testSupply = calculateSupplyScore(testResults);
  const testDemandNorm = calculateDemandScoreNormalized(testDemand);
  const testOpp = calculateOpportunityScore(testSupply, testDemandNorm, settings);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 sm:px-6 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              Transparansi Rumus & Perhitungan Skor
              <span className="text-[11px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                100% Kode Murni
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Skor Peluang & Skor Kepercayaan dihitung transparan tanpa AI atau API eksternal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-xs hidden sm:inline text-slate-500 font-medium">
            {isOpen ? 'Tutup Rumus' : 'Buka Detail Rumus'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 py-4 sm:px-6 sm:pb-6 border-t border-slate-100 bg-slate-50/40 space-y-5 text-sm text-slate-700">
          {/* Disclaimer Wajib */}
          <div className="flex items-start gap-3 p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900 text-xs sm:text-sm">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">
                Prinsip Utama: Indikator Relatif, Bukan Angka Mutlak
              </p>
              <p className="text-amber-700 mt-0.5 text-xs">
                Skor peluang adalah metrik perbandingan antar kata kunci sejenis dalam satu tipe aset untuk memandu prioritas produksi konten Anda, bukan jaminan kepastian penjualan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rumus 1: Pasokan */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <span>1. Skor Pasokan (0.0 – 1.0)</span>
                  {onOpenGuide && <HelpTooltipButton topic="jumlah_hasil" onOpenGuide={onOpenGuide} />}
                </span>
                <span className="text-xs text-slate-400">Kompetisi Pasar</span>
              </div>
              <div className="bg-slate-900 text-emerald-400 p-2.5 rounded font-mono text-xs overflow-x-auto">
                skor_pasokan = batasi(1 - log10(jumlah_hasil + 1) / log10(acuan), 0, 1)
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Menggunakan logaritma basis 10 agar sensitif pada rentang 0 hingga acuan jenuh (default 10.000.000 hasil). Semakin sedikit hasil pencarian kompetitor di platform, semakin tinggi skor pasokan.
              </p>
            </div>

            {/* Rumus 2: Permintaan */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <span>2. Skor Permintaan (0.0 – 1.0)</span>
                  {onOpenGuide && <HelpTooltipButton topic="skor_permintaan" onOpenGuide={onOpenGuide} />}
                </span>
                <span className="text-xs text-slate-400">Minat Pembeli</span>
              </div>
              <div className="bg-slate-900 text-emerald-400 p-2.5 rounded font-mono text-xs overflow-x-auto">
                skor_permintaan = skor_permintaan_1_5 / 5
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dinormalisasi dari input skala 1 sampai 5 (misal dari Adobe Insights, Google Trends, Shot List Shutterstock, atau trending Freepik).
              </p>
            </div>
          </div>

          {/* Rumus 3: Peluang */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-xs uppercase tracking-wide">
                3. Skor Peluang Gabungan (0 – 100)
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Bobot: Permintaan ({settings.demandWeight * 100}%) | Pasokan ({settings.supplyWeight * 100}%)
              </span>
            </div>
            <div className="bg-slate-900 text-emerald-400 p-2.5 rounded font-mono text-xs overflow-x-auto">
              peluang = 100 * (bobot_permintaan * skor_permintaan + bobot_pasokan * skor_pasokan)
            </div>
            <p className="text-xs text-slate-600">
              Bobot default adalah 0,5 dan 0,5 (dapat disesuaikan di menu Pengaturan).
            </p>
          </div>

          {/* Rumus 4: Prioritas Rencana Produksi (Fase 4) */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <span>4. Skor Prioritas Rencana Produksi</span>
                {onOpenGuide && <HelpTooltipButton topic="faktor_musim" onOpenGuide={onOpenGuide} />}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Peluang &times; Musim &times; Data
              </span>
            </div>
            <div className="bg-slate-900 text-emerald-400 p-2.5 rounded font-mono text-xs overflow-x-auto">
              skor_prioritas = peluang * faktor_musim * faktor_data
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <p>
                &bull; <strong>faktor_musim:</strong> {settings.productionFactors?.seasonalActive || 1.2} jika dalam jendela unggah ideal, {settings.productionFactors?.seasonalNone || 1.0} jika tanpa momen musiman, {settings.productionFactors?.seasonalPassed || 0.5} jika jendela musim tahun ini sudah terlewati.
              </p>
              <p>
                &bull; <strong>faktor_data:</strong> {settings.productionFactors?.dataPerbanyak || 1.2} jika kategori &ldquo;Perbanyak&rdquo;, {settings.productionFactors?.dataPertahankan || 1.0} jika &ldquo;Pertahankan&rdquo; atau data belum cukup, {settings.productionFactors?.dataKurangi || 0.7} jika &ldquo;Kurangi&rdquo;.
              </p>
            </div>
          </div>

          {/* Kriteria Skor Kepercayaan */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <span>Kriteria Skor Kepercayaan (Confidence Score)</span>
                  {onOpenGuide && <HelpTooltipButton topic="skor_kepercayaan" onOpenGuide={onOpenGuide} />}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 rounded bg-emerald-50/70 border border-emerald-200">
                <span className="font-bold text-emerald-800 block mb-1">Tinggi</span>
                <p className="text-emerald-700 text-[11px] leading-tight">
                  Skor permintaan terisi (1-5), sumber terisi, jumlah hasil terisi, dan tanggal cek maksimal 14 hari yang lalu.
                </p>
              </div>
              <div className="p-2.5 rounded bg-amber-50/70 border border-amber-200">
                <span className="font-bold text-amber-800 block mb-1">Sedang</span>
                <p className="text-amber-700 text-[11px] leading-tight">
                  Tepat salah satu kriteria di atas belum terpenuhi (misal data berumur &gt; 14 hari atau belum ada sumber).
                </p>
              </div>
              <div className="p-2.5 rounded bg-rose-50/70 border border-rose-200">
                <span className="font-bold text-rose-800 block mb-1">Rendah</span>
                <p className="text-rose-700 text-[11px] leading-tight">
                  Dua atau lebih kriteria belum terpenuhi (data tidak lengkap atau sudah usang).
                </p>
              </div>
            </div>
          </div>

          {/* Simulator Interaktif */}
          <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 space-y-3">
            <span className="font-semibold text-slate-900 text-xs uppercase tracking-wide block">
              Simulasi Interaktif Rumus Langsung
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-600 font-medium block mb-1">
                  Jumlah Hasil: <span className="font-mono text-slate-900 font-bold">{testResults.toLocaleString('id-ID')}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="500000"
                  step="500"
                  value={testResults}
                  onChange={(e) => setTestResults(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-0.5 font-mono">
                  <span>0</span>
                  <span>50k</span>
                  <span>250k</span>
                  <span>500k+</span>
                </div>
              </div>
              <div>
                <label className="text-slate-600 font-medium block mb-1">
                  Skor Permintaan: <span className="font-mono text-slate-900 font-bold">{testDemand} / 5</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={testDemand}
                  onChange={(e) => setTestDemand(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-0.5 font-mono">
                  <span>1 (Rendah)</span>
                  <span>3</span>
                  <span>5 (Sangat Tinggi)</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-600">
                  Pasokan: <strong className="font-mono text-slate-900">{testSupply.toFixed(3)}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">
                  Permintaan Norm: <strong className="font-mono text-slate-900">{testDemandNorm.toFixed(2)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-md font-semibold text-xs shadow-xs">
                <span>Skor Peluang Hasil:</span>
                <span className="font-mono text-sm">{testOpp}</span>
                <span className="text-[10px] opacity-80">/ 100</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
