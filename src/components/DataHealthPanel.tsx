import React, { useState } from 'react';
import { KeywordEntry, TypoAlertItem } from '../types/microstock';
import { computeDataHealthMetrics, formatIndonesianDate } from '../utils/calculator';
import { 
  Activity, 
  ShieldCheck, 
  FileText, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Edit3, 
  RotateCw,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DataHealthPanelProps {
  keywords: KeywordEntry[];
  onOpenRecheckQueue?: () => void;
  onEditKeyword?: (entry: KeywordEntry) => void;
}

export const DataHealthPanel: React.FC<DataHealthPanelProps> = ({
  keywords,
  onOpenRecheckQueue,
  onEditKeyword,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const metrics = computeDataHealthMetrics(keywords);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Panel */}
      <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Panel Kesehatan Data Riset
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                metrics.typoAlerts.length > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {metrics.typoAlerts.length > 0 ? `${metrics.typoAlerts.length} Perlu Verifikasi` : 'Status Baik'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Integritas sumber data, konfirmasi pengguna, rata-rata usia, dan deteksi anomali hasil pencarian
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
        >
          {isExpanded ? (
            <><span>Tutup Detail</span><ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <><span>Buka Detail</span><ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      </div>

      {/* Grid 4 Indikator Utama */}
      <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-3 bg-white">
        {/* 1. Persentase Bersumber */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Entri Bersumber</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {metrics.sourcedPercentage}%
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              ({metrics.sourcedEntriesCount}/{metrics.totalEntries})
            </span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-emerald-600 h-full rounded-full"
              style={{ width: `${metrics.sourcedPercentage}%` }}
            />
          </div>
        </div>

        {/* 2. Persentase Terkonfirmasi */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Terkonfirmasi</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {metrics.confirmedPercentage}%
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              ({metrics.confirmedEntriesCount}/{metrics.totalEntries})
            </span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-indigo-600 h-full rounded-full"
              style={{ width: `${metrics.confirmedPercentage}%` }}
            />
          </div>
        </div>

        {/* 3. Rata-rata Usia Data */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Rata-rata Usia</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {metrics.averageDataAgeDays}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              hari
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Batas ambang segar: 14 hari
          </p>
        </div>

        {/* 4. Aksi Cepat Antrean */}
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-900 block">Antrean Cek Ulang</span>
            <p className="text-[10px] text-amber-700 mt-0.5">
              Pembaruan snapshot bertanggal &gt; 14 hari
            </p>
          </div>
          {onOpenRecheckQueue && (
            <button
              type="button"
              onClick={onOpenRecheckQueue}
              className="w-full mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Buka Antrean Cek
            </button>
          )}
        </div>
      </div>

      {/* ALERT DETEKSI SALAH KETIK (Perubahan > 50% Antar Dua Cek Berurutan) */}
      {metrics.typoAlerts.length > 0 && (
        <div className="mx-5 mb-5 p-4 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2.5">
          <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Peringatan: Periksa Kemungkinan Salah Ketik ({metrics.typoAlerts.length} Entri)</span>
          </div>
          <p className="text-[11px] text-amber-900 leading-relaxed">
            Jumlah hasil pencarian pada entri berikut berubah lebih dari <strong>50%</strong> dibanding pengecekan sebelumnya. Mohon verifikasi kembali angka di platform untuk menghindari kekeliruan ketik.
          </p>

          <div className="divide-y divide-amber-200/60 border border-amber-200 rounded-lg overflow-hidden bg-white text-xs">
            {metrics.typoAlerts.map((alert) => (
              <div key={alert.keywordId} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{alert.keyword}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {alert.platform} &middot; {alert.assetType}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Dari <strong>{alert.previousCount.toLocaleString('id-ID')}</strong> ({formatIndonesianDate(alert.previousDate)})
                    {' '}&rarr;{' '}
                    menjadi <strong className="text-amber-800">{alert.currentCount.toLocaleString('id-ID')}</strong> ({formatIndonesianDate(alert.checkDate)})
                    {' '}&bull;{' '}
                    <span className="font-bold text-rose-600 font-mono">Selisih {alert.percentChange}%</span>
                  </div>
                </div>

                {onEditKeyword && (
                  <button
                    type="button"
                    onClick={() => {
                      const entry = keywords.find((k) => k.id === alert.keywordId);
                      if (entry) onEditKeyword(entry);
                    }}
                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" /> Verifikasi &amp; Perbaiki
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Tambahan: Entri Tanpa Sumber Permintaan */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-3 text-xs bg-slate-50/40">
          <div className="flex items-center justify-between pt-2">
            <span className="font-bold text-slate-800 text-xs">
              Entri Tanpa Sumber Permintaan ({metrics.entriesWithoutDemandSource.length})
            </span>
          </div>

          {metrics.entriesWithoutDemandSource.length === 0 ? (
            <p className="text-slate-400 italic text-[11px]">
              Bagus! Seluruh entri yang memiliki skor permintaan telah dilengkapi sumber referensi yang sah.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {metrics.entriesWithoutDemandSource.map((entry) => (
                <div key={entry.id} className="p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{entry.keyword}</span>
                    <span className="text-[11px] text-slate-500 ml-2">
                      (Skor permintaan: {entry.demandScore}/5 &middot; Sumber kosong)
                    </span>
                  </div>
                  {onEditKeyword && (
                    <button
                      type="button"
                      onClick={() => onEditKeyword(entry)}
                      className="px-2 py-1 text-emerald-700 hover:text-emerald-900 font-semibold text-[11px] cursor-pointer"
                    >
                      Lengkapi Sumber
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
