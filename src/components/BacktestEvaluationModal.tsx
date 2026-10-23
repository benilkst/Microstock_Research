import React from 'react';
import { ProductionPlanItem, MyDataAsset, KeywordEntry } from '../types/microstock';
import { computeBacktestEvaluation, formatIndonesianDate } from '../utils/calculator';
import { 
  BarChart3, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Layers, 
  HelpCircle,
  FileCheck2,
  Calendar,
  Clock,
  ArrowUpRight
} from 'lucide-react';

interface BacktestEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionPlan: ProductionPlanItem[];
  myDataAssets: MyDataAsset[];
  keywords: KeywordEntry[];
}

export const BacktestEvaluationModal: React.FC<BacktestEvaluationModalProps> = ({
  isOpen,
  onClose,
  productionPlan,
  myDataAssets,
  keywords,
}) => {
  if (!isOpen) return null;

  const result = computeBacktestEvaluation(productionPlan, myDataAssets, keywords);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Evaluasi Riset &amp; Pengujian Balik (Backtest)
              </h3>
              <p className="text-[11px] text-slate-500">
                Membandingkan skor peluang saat riset dengan performa unduhan riil 60 hari paska unggah
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Penjelasan Metodologi Backtest */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-600 text-[11px] leading-relaxed">
            <span className="font-bold text-slate-900 block text-xs">
              Aturan Evaluasi Matematis (Tanpa AI):
            </span>
            <p>
              Hanya mengevaluasi item Rencana Produksi berstatus <strong>&ldquo;Dievaluasi&rdquo;</strong>.
              Menghitung unduhan per aset dari portofolio <strong>Data Saya</strong> khusus untuk aset yang diunggah
              <strong> setelah tanggal cek riset</strong>.
            </p>
            <p>
              Tingkat ketepatan dihitung sebagai proporsi item berskor peluang <strong>&ge; 70</strong> yang unduhan per asetnya berada <strong>di atas median kelompok</strong>.
            </p>
          </div>

          {/* Peringatan Sampel Kurang dari 10 Item */}
          {!result.isSampleSufficient && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong className="block text-amber-900">Peringatan Signifikansi Statistik:</strong>
                Jumlah sampel yang telah dievaluasi saat ini baru <strong>{result.sampleSize} item</strong> (kurang dari syarat minimal 10 item).
                Tingkat ketepatan mungkin belum representatif sampai portofolio Anda memiliki minimal 10 item dievaluasi.
              </div>
            </div>
          )}

          {/* Ringkasan Skor Metrik Backtest */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-indigo-900 block">Tingkat Ketepatan</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-indigo-900 font-mono">
                  {result.precisionRate}%
                </span>
              </div>
              <span className="text-[10px] text-indigo-700 block">
                ({result.accuratePredictionsCount}/{result.itemsAbove70Count} prediksi akurat)
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-slate-700 block">Median Unduhan/Aset</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {result.groupMedianDownloadsPerAsset}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block">Ambang tengah performa kelompok</span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-slate-700 block">Item Dievaluasi (n)</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {result.sampleSize}
                </span>
                <span className="text-[11px] text-slate-500">item</span>
              </div>
              <span className="text-[10px] text-slate-400 block">Minimal syarat: 10 item</span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-slate-700 block">Item Skor &ge; 70</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {result.itemsAbove70Count}
                </span>
                <span className="text-[11px] text-slate-500">item</span>
              </div>
              <span className="text-[10px] text-slate-400 block">Target peluang tinggi</span>
            </div>
          </div>

          {/* Tabel Detail Item Dievaluasi */}
          <div className="space-y-2 pt-2">
            <span className="font-bold text-slate-900 text-xs block">
              Daftar Item Rencana Berstatus &ldquo;Dievaluasi&rdquo; ({result.items.length})
            </span>

            {result.items.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-700 text-xs">Belum ada item berstatus &ldquo;Dievaluasi&rdquo;</p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Ubah status item di tab Rencana Produksi menjadi &ldquo;Dievaluasi&rdquo; setelah aset diunggah lebih dari 60 hari untuk melihat hasil perbandingan.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2 px-3">Judul / Kata Kunci</th>
                      <th className="py-2 px-2">Platform &amp; Tipe</th>
                      <th className="py-2 px-2 text-right">Skor Riset</th>
                      <th className="py-2 px-2 text-right">Aset Paska Cek</th>
                      <th className="py-2 px-2 text-right">Unduhan/Aset</th>
                      <th className="py-2 px-3 text-center">Hasil Backtest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.items.map((item) => (
                      <tr key={item.planId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{item.titleOrKeyword}</span>
                          <span className="text-[10px] text-slate-400">
                            Cek riset: {formatIndonesianDate(item.researchCheckDate)} &middot; Unggah: {formatIndonesianDate(item.uploadedDate)}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="font-semibold text-slate-700 block">{item.platform}</span>
                          <span className="text-[10px] text-slate-500">{item.assetType}</span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                          {item.opportunityScore.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">
                          {item.postResearchAssetCount} aset ({item.postResearchDownloads} unduhan)
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-800">
                          {item.downloadsPerAsset.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.isAccuratePrediction ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Akurat (&gt; Median)
                            </span>
                          ) : item.isOpportunityAbove70 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Di Bawah Median
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              Skor &lt; 70
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
