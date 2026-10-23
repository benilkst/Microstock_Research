import React, { useState, useEffect, useMemo } from 'react';
import { 
  AssetType, 
  NicheIdeaCandidate, 
  SeasonalMoment, 
  DailyCallCount 
} from '../types/microstock';
import { 
  requestNicheIdeas, 
  getDailyCallStats, 
  RECOMMENDED_DAILY_LIMIT,
  generateNicheCacheKey,
  getCachedNicheIdeas
} from '../utils/geminiClient';
import { computeSeasonalMoment } from '../utils/calculator';
import { 
  Sparkles, 
  Search, 
  ExternalLink, 
  Send, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  Copy, 
  Check, 
  Info, 
  Compass,
  Calendar,
  ListPlus
} from 'lucide-react';

interface NicheIdeasViewProps {
  seasonalMoments: SeasonalMoment[];
  onSendToResearchForm: (data: {
    keyword: string;
    assetType: AssetType;
    demandScore: number | null;
    demandSource: string;
    notes: string;
  }) => void;
  onAddToProductionPlan?: (data: {
    titleOrKeyword: string;
    assetType: AssetType;
    opportunityScore: number;
    sourceType: 'ide_niche';
    seasonalMomentName?: string;
    notes: string;
  }) => void;
}

export const NicheIdeasView: React.FC<NicheIdeasViewProps> = ({
  seasonalMoments,
  onSendToResearchForm,
  onAddToProductionPlan,
}) => {
  const [assetType, setAssetType] = useState<AssetType>('Foto nyata');
  const [theme, setTheme] = useState('');
  const [selectedMomentId, setSelectedMomentId] = useState('');
  const [candidateCount, setCandidateCount] = useState(10);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRateLimit, setIsRateLimit] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);

  const [candidates, setCandidates] = useState<NicheIdeaCandidate[]>([]);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cachedHoursAgo, setCachedHoursAgo] = useState<number | undefined>(undefined);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

  const [dailyStats, setDailyStats] = useState<DailyCallCount>(() => getDailyCallStats());

  // Hitung status momen musiman terpilih (Fase 3: Jendela Terlewat)
  const selectedMoment = useMemo(() => {
    return seasonalMoments.find((m) => m.id === selectedMomentId) || null;
  }, [seasonalMoments, selectedMomentId]);

  const computedSelectedMoment = useMemo(() => {
    return selectedMoment ? computeSeasonalMoment(selectedMoment) : null;
  }, [selectedMoment]);

  const isPastWindow = useMemo(() => {
    if (!computedSelectedMoment) return false;
    return (
      computedSelectedMoment.daysUntilWindowEnd < 0 ||
      computedSelectedMoment.status === 'approaching' ||
      computedSelectedMoment.status === 'passed'
    );
  }, [computedSelectedMoment]);

  // Check initial cache on load or parameter change
  useEffect(() => {
    const cacheKey = generateNicheCacheKey(
      assetType,
      theme,
      selectedMoment ? selectedMoment.name : '',
      candidateCount,
      isPastWindow
    );
    const cached = getCachedNicheIdeas(cacheKey);
    if (cached.isCached && cached.data) {
      setCandidates(cached.data);
      setIsFromCache(true);
      setCachedHoursAgo(cached.cachedHoursAgo);
    }
  }, [assetType, theme, selectedMoment, candidateCount, isPastWindow]);

  // Countdown timer for 429
  useEffect(() => {
    if (retryCountdown <= 0) return;
    const timer = setInterval(() => {
      setRetryCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [retryCountdown]);

  const handleSearchIdeas = async (bypassCache = false) => {
    setIsLoading(true);
    setErrorMsg(null);
    setIsRateLimit(false);
    setLoadingStep('Langkah 1/2: Mencari sinyal tren & rujukan web dengan Google Search grounding...');

    try {
      const timer = setTimeout(() => {
        setLoadingStep('Langkah 2/2: Mengonversi data tren ke skema JSON dan memvalidasi sumber grounding...');
      }, 3500);

      const result = await requestNicheIdeas({
        assetType,
        theme: theme.trim(),
        seasonalMoment: selectedMoment ? selectedMoment.name : '',
        candidateCount,
        isPastWindow,
        bypassCache,
      });

      clearTimeout(timer);
      setCandidates(result.data);
      setIsFromCache(result.fromCache);
      setCachedHoursAgo(result.cachedHoursAgo);
      setDailyStats(getDailyCallStats());
    } catch (err: any) {
      console.warn('Pemberitahuan requestNicheIdeas:', err?.message || err);
      const is429 = err.message?.includes('BATAS_KUOTA_429') || err.message?.includes('429');
      setIsRateLimit(is429);
      if (is429) {
        setErrorMsg('Batas kuota panggilan Gemini tercapai (Galat 429). Mohon tunggu beberapa saat sebelum mencoba kembali.');
        setRetryCountdown(45);
      } else {
        setErrorMsg(err.message || 'Gagal mencari ide niche. Pastikan koneksi server aktif.');
      }
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyword(text);
    setTimeout(() => setCopiedKeyword(null), 2000);
  };

  const handleSendToForm = (c: NicheIdeaCandidate) => {
    const primarySource = c.sumber && c.sumber.length > 0 ? `${c.sumber[0].judul} (${c.sumber[0].url})` : '';
    const formattedNotes = [
      `[SARAN AI - BELUM DIKONFIRMASI]`,
      `Varian Indonesia: ${c.varian_id}`,
      `Alasan: ${c.alasan}`,
      `Sinyal Tren: ${c.sinyal_tren}`,
      `Saran Sudut: Copy space (${c.saran_sudut.copy_space}) | Konteks (${c.saran_sudut.konteks_lokal}) | Gaya (${c.saran_sudut.gaya})`,
      isPastWindow ? `Catatan Musim: Menargetkan siklus musim tahun depan.` : '',
    ].filter(Boolean).join('\n');

    onSendToResearchForm({
      keyword: c.kata_kunci_en,
      assetType: assetType,
      demandScore: c.saran_permintaan_1_5,
      demandSource: primarySource,
      notes: formattedNotes,
    });
  };

  const isLimitWarning = dailyStats.count >= RECOMMENDED_DAILY_LIMIT * 0.8;

  return (
    <div className="space-y-6">
      {/* Top Banner: Explainer & Daily Usage */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                Eksplorasi Ide Niche &amp; Tren Komersial
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase">
                  Tren Bersumber
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Pencarian DUA LANGKAH dengan Google Search grounding untuk menemukan tren nyata dan rujukan bersumber dari metadata web asli.
              </p>
            </div>
          </div>

          {/* Daily Call Tracker */}
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs self-start sm:self-auto">
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] font-mono uppercase">Panggilan Hari Ini</span>
              <span className="font-mono font-bold text-slate-800">
                {dailyStats.count} / {dailyStats.maxRecommended}
              </span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>

        {/* Warning if close to daily limit */}
        {isLimitWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Perhatian Kuota:</strong> Anda telah melakukan {dailyStats.count} panggilan hari ini. Disarankan memanfaatkan hasil cache 24 jam untuk menghemat panggilan API.
            </span>
          </div>
        )}
      </div>

      {/* Input Parameters Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-slate-500" />
            Parameter Pencarian Niche
          </span>
          <span className="text-[11px] text-slate-400">
            Hanya berjalan saat tombol ditekan
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* 1. Tipe Aset */}
          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Tipe Aset <span className="text-rose-500">*</span>
            </label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as AssetType)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="Foto nyata">Foto nyata</option>
              <option value="Foto AI-generated">Foto AI-generated</option>
              <option value="Ilustrasi AI-generated">Ilustrasi AI-generated</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Dipisah ketat agar ide sesuai karakter produksi.
            </p>
          </div>

          {/* 2. Tema Opsional */}
          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Tema / Subjek (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: kuliner tradisional, solar panel, UMKM"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Kosongkan untuk tren umum microstock.
            </p>
          </div>

          {/* 3. Momen Musiman Opsional */}
          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Momen Musiman (Opsional)
            </label>
            <select
              value={selectedMomentId}
              onChange={(e) => setSelectedMomentId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">-- Tanpa Momen Khusus --</option>
              {seasonalMoments.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.category})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Terkoneksi langsung dengan Kalender Musiman.
            </p>
          </div>

          {/* 4. Jumlah Kandidat */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-semibold text-slate-700 uppercase tracking-wide">
                Jumlah Kandidat:
              </label>
              <span className="font-mono font-bold text-slate-900">{candidateCount}</span>
            </div>
            <input
              type="range"
              min="3"
              max="15"
              step="1"
              value={candidateCount}
              onChange={(e) => setCandidateCount(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer mt-1"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
              <span>Min 3</span>
              <span>Default 10</span>
              <span>Maks 15</span>
            </div>
          </div>
        </div>

        {/* FASE 3 BANNER: Jendela Musim Terlewat */}
        {isPastWindow && computedSelectedMoment && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-950">
                Jendela unggah musim ini sudah lewat, target musim berikutnya
              </h4>
              <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                Jendela unggah ideal (120-60 hari sebelum puncak {computedSelectedMoment.peakDate}) telah terlewati untuk siklus tahun berjalan.
                Sistem tidak menyarankan produksi untuk tahun ini, melainkan menargetkan persiapan siklus musim tahun depan agar aset Anda memiliki indeksasi optimal sebelum puncak pencarian berikutnya.
              </p>
            </div>
          </div>
        )}

        {/* Trigger Button & Cache Banner */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Hasil otomatis dicache 24 jam untuk kombinasi input yang sama.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isFromCache && (
              <button
                type="button"
                onClick={() => handleSearchIdeas(true)}
                disabled={isLoading}
                className="w-full sm:w-auto px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Abaikan cache dan cari ulang dari Google Search grounding"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Perbarui Ide (Bypass Cache)
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSearchIdeas(false)}
              disabled={isLoading || retryCountdown > 0}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Memproses Dua Langkah...
                </>
              ) : retryCountdown > 0 ? (
                `Tunggu ${retryCountdown}d (429)`
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Cari Ide Niche
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading Steps Indicator */}
      {isLoading && (
        <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-indigo-900">
            <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
            <span>Proses Dua Langkah Gemini Sedang Berjalan...</span>
          </div>
          <p className="text-indigo-800 font-mono text-[11px] pl-6">
            {loadingStep}
          </p>
          <div className="w-full bg-indigo-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full w-2/3 animate-pulse rounded-full" />
          </div>
        </div>
      )}

      {/* Error / Rate Limit Message */}
      {errorMsg && (
        <div className={`p-4 rounded-xl border text-xs space-y-2 ${
          isRateLimit ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{isRateLimit ? 'Batas Kuota Gemini (Galat 429)' : 'Terjadi Galat'}</span>
          </div>
          <p className="leading-relaxed">{errorMsg}</p>
          {isRateLimit && (
            <div className="pt-1 flex items-center gap-2">
              <span className="font-mono text-[11px] text-amber-800">
                {retryCountdown > 0 ? `Dapat mencoba kembali dalam ${retryCountdown} detik...` : 'Anda dapat mencoba kembali sekarang.'}
              </span>
              {retryCountdown === 0 && (
                <button
                  type="button"
                  onClick={() => handleSearchIdeas(false)}
                  className="px-3 py-1 bg-amber-600 text-white font-bold rounded-md hover:bg-amber-700 cursor-pointer"
                >
                  Coba Lagi Sekarang
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cache Status Badge */}
      {isFromCache && candidates.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>
              Menampilkan hasil tersimpan dari cache 24 jam {cachedHoursAgo !== undefined ? `(${cachedHoursAgo} jam yang lalu)` : ''}.
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase">
            Hemat Kuota API
          </span>
        </div>
      )}

      {/* Candidate Cards Grid */}
      {candidates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              {candidates.length} Rekomendasi Ide Niche ({assetType})
            </h3>
            <span className="text-xs text-slate-500">
              Klik &quot;Kirim ke Form Riset&quot; untuk input ke Riset Pasar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {candidates.map((item, idx) => {
              const hasDemand = item.saran_permintaan_1_5 !== null && item.saran_permintaan_1_5 > 0;
              const hasSource = item.sumber && item.sumber.length > 0;

              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: English Keyword & Copy */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {assetType}
                          </span>
                        </div>
                        <h4 className="font-bold text-base sm:text-lg text-slate-900 mt-1 flex items-center gap-2">
                          <span>{item.kata_kunci_en}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.kata_kunci_en)}
                            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                            title="Salin kata kunci"
                          >
                            {copiedKeyword === item.kata_kunci_en ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </h4>
                        <p className="text-xs text-slate-500 italic">
                          &quot;{item.varian_id}&quot;
                        </p>
                      </div>

                      {/* Demand suggestion badge - Label "bersumber" */}
                      <div className="text-right shrink-0">
                        {hasDemand ? (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-md text-xs font-bold">
                            ★ {item.saran_permintaan_1_5} / 5
                            <span className="block text-[9px] font-normal text-emerald-600">
                              bersumber
                            </span>
                          </div>
                        ) : (
                          <div className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] italic">
                            Tanpa sumber (null)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Alasan & Sinyal Tren */}
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="font-semibold text-slate-700">Celah / Alasan:</span>{' '}
                        <span className="text-slate-600">{item.alasan}</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-700 border border-slate-150">
                        <span className="font-semibold text-indigo-900 block text-[11px] mb-0.5">
                          Sinyal Tren Terdeteksi:
                        </span>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {item.sinyal_tren}
                        </p>
                      </div>
                    </div>

                    {/* Saran Sudut Pandang */}
                    <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-200 text-[11px] space-y-1">
                      <span className="font-bold text-slate-800 uppercase tracking-wide block text-[10px]">
                        Rekomendasi Sudut Kreatif:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-slate-600">
                        <div>
                          <strong className="text-slate-700">Copy Space:</strong> {item.saran_sudut.copy_space}
                        </div>
                        <div>
                          <strong className="text-slate-700">Konteks:</strong> {item.saran_sudut.konteks_lokal}
                        </div>
                        <div>
                          <strong className="text-slate-700">Gaya:</strong> {item.saran_sudut.gaya}
                        </div>
                      </div>
                    </div>

                    {/* Sumber Web Asli (Hanya dari Grounding Metadata) - Label "bersumber" */}
                    {hasSource && (
                      <div className="space-y-1 text-xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Sumber Rujukan Bersumber:
                        </span>
                        <div className="space-y-1">
                          {item.sumber.map((s, sIdx) => (
                            <a
                              key={sIdx}
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[11px] text-emerald-700 hover:text-emerald-800 hover:underline truncate"
                              title={s.judul}
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{s.judul}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions: Send to Form or Add to Production Plan */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 italic">
                      Label: Belum Dikonfirmasi
                    </span>
                    <div className="flex items-center gap-2">
                      {onAddToProductionPlan && (
                        <button
                          type="button"
                          onClick={() => {
                            const demand = item.saran_permintaan_1_5 || 3;
                            const opp = Math.round((demand / 5) * 100);
                            onAddToProductionPlan({
                              titleOrKeyword: item.kata_kunci_en,
                              assetType,
                              opportunityScore: opp,
                              sourceType: 'ide_niche',
                              seasonalMomentName: selectedMoment?.name,
                              notes: `Ide Niche: ${item.alasan}. Sudut: Gaya ${item.saran_sudut.gaya}, Konteks ${item.saran_sudut.konteks_lokal}`,
                            });
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-lg border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Masukkan ke Rencana Produksi"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                          Rencana
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSendToForm(item)}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Kirim ke Form Riset
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
