import React, { useState, useMemo, useRef } from 'react';
import { KeywordEntry, AppSettings, KeywordWithMetrics } from '../types/microstock';
import { computeKeywordMetrics, formatIndonesianDate, getTodayDateString } from '../utils/calculator';
import { 
  exportKeywordsToCSV, 
  exportKeywordsToJSON, 
  parseCSVToKeywords, 
  parseJSONToKeywords 
} from '../utils/storage';
import { 
  TrendingUp, 
  Download, 
  Upload, 
  FileText, 
  Database, 
  Search, 
  Calendar, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Trash2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface HistoryTrendViewProps {
  keywords: KeywordEntry[];
  settings: AppSettings;
  selectedKeywordFilter?: string;
  onOpenAddModal: (prefillKeyword?: string) => void;
  onDeleteEntry: (id: string) => void;
  onImportEntries: (entries: KeywordEntry[], mode: 'merge' | 'replace') => void;
}

export const HistoryTrendView: React.FC<HistoryTrendViewProps> = ({
  keywords,
  settings,
  selectedKeywordFilter,
  onOpenAddModal,
  onDeleteEntry,
  onImportEntries,
}) => {
  // Unique list of keywords
  const uniqueKeywords = useMemo(() => {
    const set = new Set<string>();
    keywords.forEach((k) => set.add(k.keyword.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [keywords]);

  // Current selected keyword to analyze
  const [activeKeyword, setActiveKeyword] = useState<string>(() => {
    if (selectedKeywordFilter && uniqueKeywords.includes(selectedKeywordFilter)) {
      return selectedKeywordFilter;
    }
    return uniqueKeywords[0] || '';
  });

  // If selectedKeywordFilter changes from parent, sync it
  React.useEffect(() => {
    if (selectedKeywordFilter && uniqueKeywords.includes(selectedKeywordFilter)) {
      setActiveKeyword(selectedKeywordFilter);
    }
  }, [selectedKeywordFilter, uniqueKeywords]);

  // Metric toggle for chart: 'results' (Jumlah Hasil) vs 'opportunity' (Skor Peluang) vs 'both'
  const [chartMetric, setChartMetric] = useState<'results' | 'opportunity'>('results');
  const [hoveredPoint, setHoveredPoint] = useState<KeywordWithMetrics | null>(null);

  // Import modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileText, setImportFileText] = useState<string>('');
  const [importFileType, setImportFileType] = useState<'csv' | 'json'>('csv');
  const [importPreview, setImportPreview] = useState<KeywordEntry[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Historical entries for the selected keyword
  const keywordHistory = useMemo(() => {
    if (!activeKeyword) return [];
    const entries = keywords
      .filter((k) => k.keyword.toLowerCase().trim() === activeKeyword.toLowerCase().trim())
      .map((k) => ({
        ...k,
        metrics: computeKeywordMetrics(k, settings),
      }));

    // Sort chronologically (oldest to newest for the line chart)
    return entries.sort((a, b) => new Date(a.checkDate).getTime() - new Date(b.checkDate).getTime());
  }, [keywords, activeKeyword, settings]);

  // Trend analysis (comparing oldest to newest)
  const trendAnalysis = useMemo(() => {
    if (keywordHistory.length < 2) {
      return {
        direction: 'neutral' as const,
        diff: 0,
        percent: 0,
        text: 'Dibutuhkan minimal 2 tanggal pemeriksaan untuk melihat tren pertumbuhan.',
      };
    }
    const first = keywordHistory[0].searchResultCount;
    const last = keywordHistory[keywordHistory.length - 1].searchResultCount;
    const diff = last - first;
    const percent = first > 0 ? Math.round((diff / first) * 100) : 0;

    if (diff > 0) {
      return {
        direction: 'up' as const,
        diff,
        percent,
        text: `Pasokan kompetitor meningkat +${diff.toLocaleString('id-ID')} hasil (+${percent}%) sejak pemeriksaan awal.`,
      };
    } else if (diff < 0) {
      return {
        direction: 'down' as const,
        diff,
        percent,
        text: `Pasokan kompetitor tercatat berkurang ${Math.abs(diff).toLocaleString('id-ID')} hasil (${percent}%).`,
      };
    } else {
      return {
        direction: 'neutral' as const,
        diff: 0,
        percent: 0,
        text: 'Jumlah pasokan kompetitor relatif stabil antara pemeriksaan.',
      };
    }
  }, [keywordHistory]);

  // Compute SVG chart coordinates
  const chartData = useMemo(() => {
    if (keywordHistory.length === 0) return null;

    const padding = { top: 30, right: 30, bottom: 40, left: 60 };
    const width = 640;
    const height = 260;

    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const values = keywordHistory.map((d) =>
      chartMetric === 'results' ? d.searchResultCount : d.metrics.opportunityScore
    );

    const minVal = chartMetric === 'opportunity' ? 0 : Math.max(0, Math.min(...values) * 0.9);
    const maxVal = chartMetric === 'opportunity' ? 100 : Math.max(...values, 10) * 1.1;

    const points = keywordHistory.map((item, idx) => {
      const x =
        keywordHistory.length === 1
          ? padding.left + innerWidth / 2
          : padding.left + (idx / (keywordHistory.length - 1)) * innerWidth;
      const val = chartMetric === 'results' ? item.searchResultCount : item.metrics.opportunityScore;
      const range = maxVal - minVal || 1;
      const y = padding.top + innerHeight - ((val - minVal) / range) * innerHeight;
      return { x, y, item, val };
    });

    const pathD = points.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');

    // Area path under line
    const areaD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`
      : '';

    return {
      width,
      height,
      padding,
      innerWidth,
      innerHeight,
      minVal,
      maxVal,
      points,
      pathD,
      areaD,
    };
  }, [keywordHistory, chartMetric]);

  // Handle file input for CSV/JSON import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccessMsg(null);
    const isCsv = file.name.endsWith('.csv');
    const isJson = file.name.endsWith('.json');

    if (!isCsv && !isJson) {
      setImportError('Silakan pilih file berekstensi .csv atau .json');
      return;
    }

    setImportFileType(isCsv ? 'csv' : 'json');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportFileText(content);

      if (isCsv) {
        const res = parseCSVToKeywords(content);
        if (res.success && res.data) {
          setImportPreview(res.data);
        } else {
          setImportError(res.error || 'Format CSV tidak dikenali.');
          setImportPreview(null);
        }
      } else {
        const res = parseJSONToKeywords(content);
        if (res.success && res.data) {
          setImportPreview(res.data);
        } else {
          setImportError(res.error || 'Format JSON tidak valid.');
          setImportPreview(null);
        }
      }
    };

    reader.onerror = () => {
      setImportError('Gagal membaca berkas dari perangkat.');
    };

    reader.readAsText(file);
  };

  const handleExecuteImport = (mode: 'merge' | 'replace') => {
    if (!importPreview || importPreview.length === 0) return;
    onImportEntries(importPreview, mode);
    setImportSuccessMsg(`Berhasil mengimpor ${importPreview.length} entri kata kunci!`);
    setTimeout(() => {
      setIsImportModalOpen(false);
      setImportPreview(null);
      setImportFileText('');
      setImportSuccessMsg(null);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Title & Export/Import Buttons */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Riwayat &amp; Grafik Tren Kata Kunci
          </h2>
          <p className="text-xs text-slate-500">
            Pantau pertumbuhan pasokan kompetisi dari waktu ke waktu dan kelola cadangan data Anda.
          </p>
        </div>

        {/* Action Suite: Export & Import */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV */}
          <button
            type="button"
            onClick={() => exportKeywordsToCSV(keywords)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="Ekspor seluruh data ke file CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            Ekspor CSV
          </button>

          {/* Export JSON */}
          <button
            type="button"
            onClick={() => exportKeywordsToJSON(keywords)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="Ekspor seluruh data ke format JSON Backup"
          >
            <Database className="w-3.5 h-3.5 text-slate-600" />
            Ekspor JSON
          </button>

          {/* Import Button */}
          <button
            type="button"
            onClick={() => {
              setImportError(null);
              setImportSuccessMsg(null);
              setImportPreview(null);
              setIsImportModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Impor Data
          </button>
        </div>
      </div>

      {/* Main Content: Keyword Selector & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Keyword Selector List */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Pilih Kata Kunci ({uniqueKeywords.length})
            </span>
            <span className="text-[11px] text-slate-500">Klik untuk grafik</span>
          </div>

          <div className="max-h-80 lg:max-h-[460px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {uniqueKeywords.map((kw) => {
              const count = keywords.filter((k) => k.keyword.toLowerCase().trim() === kw.toLowerCase().trim()).length;
              const isSelected = activeKeyword.toLowerCase().trim() === kw.toLowerCase().trim();

              return (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setActiveKeyword(kw)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-2xs'
                      : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className="truncate pr-2">{kw}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count} cek
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chart & Trend Insight */}
        <div className="lg:col-span-2 space-y-4">
          {/* Chart Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
            {/* Header Chart */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase text-slate-400 block">
                  Grafik Riwayat Kata Kunci
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {activeKeyword || 'Pilih Kata Kunci'}
                </h3>
              </div>

              {/* Chart Metric Selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartMetric('results')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    chartMetric === 'results'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Jumlah Hasil (Kompetisi)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('opportunity')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    chartMetric === 'opportunity'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Skor Peluang (0-100)
                </button>
              </div>
            </div>

            {/* Trend Summary Badge */}
            {trendAnalysis && (
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                {trendAnalysis.direction === 'up' ? (
                  <ArrowUpRight className="w-4 h-4 text-rose-600 shrink-0" />
                ) : trendAnalysis.direction === 'down' ? (
                  <ArrowDownRight className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Minus className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span>{trendAnalysis.text}</span>
              </div>
            )}

            {/* SVG Interactive Line Chart */}
            {chartData && chartData.points.length > 0 ? (
              <div className="relative overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                  className="w-full h-auto max-h-72 select-none"
                >
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                    const y =
                      chartData.padding.top +
                      chartData.innerHeight -
                      pct * chartData.innerHeight;
                    const val = chartData.minVal + pct * (chartData.maxVal - chartData.minVal);
                    return (
                      <g key={i}>
                        <line
                          x1={chartData.padding.left}
                          y1={y}
                          x2={chartData.width - chartData.padding.right}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={chartData.padding.left - 8}
                          y={y + 3}
                          fontSize="9"
                          fill="#64748b"
                          textAnchor="end"
                          fontFamily="monospace"
                        >
                          {chartMetric === 'results' ? Math.round(val).toLocaleString('id-ID') : Math.round(val)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area under the line */}
                  {chartData.areaD && (
                    <path d={chartData.areaD} fill="url(#chartGradient)" />
                  )}

                  {/* The Line */}
                  <path
                    d={chartData.pathD}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Interactive Points */}
                  {chartData.points.map((pt, idx) => {
                    const isHovered = hoveredPoint?.id === pt.item.id;
                    return (
                      <g key={idx}>
                        {/* Invisible larger hover hit area */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="14"
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPoint(pt.item)}
                          onClick={() => setHoveredPoint(pt.item)}
                        />
                        {/* Visual Dot */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? '6' : '4'}
                          fill={isHovered ? '#059669' : '#ffffff'}
                          stroke="#10b981"
                          strokeWidth="2.5"
                          className="transition-all"
                        />
                        {/* X-axis date labels */}
                        <text
                          x={pt.x}
                          y={chartData.height - chartData.padding.bottom + 16}
                          fontSize="9"
                          fill="#64748b"
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          {pt.item.checkDate.split('-').slice(1).join('/')}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Hover/Tap Tooltip Details */}
                {hoveredPoint && (
                  <div className="mt-3 p-3 bg-slate-900 text-white rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-400">
                        {formatIndonesianDate(hoveredPoint.checkDate)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {hoveredPoint.platform} &middot; {hoveredPoint.assetType}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono pt-1">
                      <span>
                        Hasil Pencarian: <strong>{hoveredPoint.searchResultCount.toLocaleString('id-ID')}</strong>
                      </span>
                      <span>
                        Skor Peluang: <strong className="text-emerald-400">{hoveredPoint.metrics.opportunityScore}</strong>
                      </span>
                      <span>
                        Kepercayaan: <strong>{hoveredPoint.metrics.confidenceLevel}</strong>
                      </span>
                    </div>
                    {hoveredPoint.notes && (
                      <p className="text-[11px] text-slate-300 italic pt-1">
                        &quot;{hoveredPoint.notes}&quot;
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Belum ada data riwayat untuk kata kunci ini.
              </div>
            )}
          </div>

          {/* Historical Data Points Table for This Keyword */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Entri Riwayat ({keywordHistory.length})
              </span>
              <button
                type="button"
                onClick={() => onOpenAddModal(activeKeyword)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Catat Cek Baru Hari Ini
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60">
                    <th className="py-2.5 px-3">Tanggal Cek</th>
                    <th className="py-2.5 px-3">Platform</th>
                    <th className="py-2.5 px-3">Jumlah Hasil</th>
                    <th className="py-2.5 px-3">Peluang</th>
                    <th className="py-2.5 px-3">Kepercayaan</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {keywordHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {formatIndonesianDate(item.checkDate)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{item.platform}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-900">
                        {item.searchResultCount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                        {item.metrics.opportunityScore}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-semibold ${
                            item.metrics.confidenceLevel === 'Tinggi'
                              ? 'text-emerald-700'
                              : item.metrics.confidenceLevel === 'Sedang'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {item.metrics.confidenceLevel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Hapus data cek tanggal ${item.checkDate}?`)) {
                              onDeleteEntry(item.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                          title="Hapus baris riwayat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Impor CSV / JSON */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" />
                Impor Data Riset Kata Kunci
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer text-xs font-bold"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Pilih file CSV hasil ekspor atau file cadangan JSON dari komputer atau perangkat HP Anda.
              </p>

              {/* File Input Box */}
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv, .json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <span className="font-semibold text-slate-700 block">
                  Klik untuk memilih file CSV atau JSON
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Mendukung berkas ekspor Microstock Research
                </span>
              </div>

              {/* Error Notification */}
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Success Notification */}
              {importSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{importSuccessMsg}</span>
                </div>
              )}

              {/* Preview of Imported Data */}
              {importPreview && importPreview.length > 0 && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between font-semibold text-emerald-950">
                    <span>Ditemukan {importPreview.length} Baris Riset Valid</span>
                    <span className="font-mono text-[11px]">Format: {importFileType.toUpperCase()}</span>
                  </div>
                  <p className="text-emerald-800 text-[11px]">
                    Contoh entri pertama: <strong>&quot;{importPreview[0].keyword}&quot;</strong> ({importPreview[0].platform} - {importPreview[0].assetType})
                  </p>

                  <div className="pt-2 border-t border-emerald-200/80 flex flex-col sm:flex-row items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExecuteImport('merge')}
                      className="w-full sm:flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      Gabungkan (Merge dengan Data Saat Ini)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('PERINGATAN: Opsi ini akan menghapus data lama dan menggantikannya dengan isi file ini. Lanjutkan?')) {
                          handleExecuteImport('replace');
                        }
                      }}
                      className="w-full sm:w-auto py-2 px-3 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Gantikan Semua
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
