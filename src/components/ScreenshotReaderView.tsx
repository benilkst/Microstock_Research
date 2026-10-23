import React, { useState, useRef } from 'react';
import { ScreenshotAnalysisResult, Platform, AssetType, DailyCallCount } from '../types/microstock';
import { 
  compressScreenshotClientSide, 
  requestScreenshotAnalysis, 
  getDailyCallStats, 
  RECOMMENDED_DAILY_LIMIT 
} from '../utils/geminiClient';
import { 
  Camera, 
  Upload, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Edit3, 
  Send, 
  X, 
  Eye, 
  Info,
  Layers,
  FileCheck,
  Check
} from 'lucide-react';

interface ScreenshotReaderViewProps {
  onSendToResearchForm: (data: {
    platform: Platform;
    assetType: AssetType;
    keyword: string;
    searchResultCount: number;
    notes: string;
  }) => void;
}

export const ScreenshotReaderView: React.FC<ScreenshotReaderViewProps> = ({
  onSendToResearchForm,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalSizeKb, setOriginalSizeKb] = useState<number>(0);
  const [compressedSizeKb, setCompressedSizeKb] = useState<number>(0);
  const [platformHint, setPlatformHint] = useState<Platform>('Adobe Stock');
  const [targetAssetType, setTargetAssetType] = useState<AssetType>('Foto nyata');
  const [keywordInput, setKeywordInput] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRateLimit, setIsRateLimit] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyCallCount>(() => getDailyCallStats());

  // Editable Form states after Gemini returns analysis
  const [analysisResult, setAnalysisResult] = useState<ScreenshotAnalysisResult | null>(null);
  const [editHasilTeks, setEditHasilTeks] = useState<string>('');
  const [editHasilAngka, setEditHasilAngka] = useState<number | string>('');
  const [editGayaDominan, setEditGayaDominan] = useState<string>('');
  const [editCopySpace, setEditCopySpace] = useState<'ya' | 'sebagian' | 'tidak' | 'null'>('null');
  const [editLabelAi, setEditLabelAi] = useState<'true' | 'false' | 'null'>('null');
  const [editCelahPotensial, setEditCelahPotensial] = useState<string>('');
  const [editKontributor, setEditKontributor] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Hanya berkas gambar (JPG, PNG) yang diperbolehkan.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    setOriginalSizeKb(Math.round(file.size / 1024));
    setPreviewUrl(URL.createObjectURL(file));
    setAnalysisResult(null);

    try {
      // Tes kompresi awal untuk estimasi ukuran
      const { base64 } = await compressScreenshotClientSide(file);
      const estKb = Math.round((base64.length * 3) / 4 / 1024);
      setCompressedSizeKb(estKb);
    } catch {
      // ignore
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setIsRateLimit(false);

    try {
      // 1. Kompresi gambar di sisi klien
      const { base64, mimeType } = await compressScreenshotClientSide(selectedFile);

      // 2. Kirim ke endpoint backend Gemini multimodal
      const result = await requestScreenshotAnalysis({
        imageBase64: base64,
        mimeType,
        platformHint,
      });

      setAnalysisResult(result);
      setDailyStats(getDailyCallStats());

      // Isi formulir yang bisa diedit
      setEditHasilTeks(result.jumlah_hasil_terbaca || '');
      setEditHasilAngka(result.jumlah_hasil_angka !== null ? result.jumlah_hasil_angka : '');
      setEditGayaDominan(result.gaya_dominan || '');
      setEditCopySpace(result.ada_copy_space || 'null');
      setEditLabelAi(result.label_AI_terlihat === true ? 'true' : result.label_AI_terlihat === false ? 'false' : 'null');
      setEditCelahPotensial(result.celah_potensial || '');

      if (result.jumlah_aset_per_kontributor && result.jumlah_aset_per_kontributor.length > 0) {
        setEditKontributor(
          result.jumlah_aset_per_kontributor
            .map((k) => `${k.nama_kontributor} (~${k.perkiraan_aset_terlihat} aset)`)
            .join(', ')
        );
      } else {
        setEditKontributor('');
      }
    } catch (err: any) {
      console.warn('Pemberitahuan analisis screenshot:', err?.message || err);
      const is429 = err.message?.includes('BATAS_KUOTA_429') || err.message?.includes('429');
      setIsRateLimit(is429);
      if (is429) {
        setErrorMsg('Batas kuota panggilan Gemini tercapai (Galat 429). Mohon tunggu beberapa saat sebelum mencoba kembali.');
      } else {
        setErrorMsg(err.message?.replace(/^KODE_AKSES_DIBUTUHKAN:\s*/, '') || 'Gagal menganalisis screenshot dengan Gemini.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAndSendToPhase1 = () => {
    const parsedCount = typeof editHasilAngka === 'number' ? editHasilAngka : parseInt(String(editHasilAngka), 10) || 0;

    const notesSummary = [
      `[DATA DARI BACA SCREENSHOT - BELUM DIKONFIRMASI]`,
      editGayaDominan ? `Gaya Dominan: ${editGayaDominan}` : '',
      editCopySpace !== 'null' ? `Copy Space: ${editCopySpace}` : '',
      editLabelAi !== 'null' ? `Label AI Terlihat: ${editLabelAi === 'true' ? 'Ya' : 'Tidak'}` : '',
      editKontributor ? `Kontributor Terdeteksi: ${editKontributor}` : '',
      editCelahPotensial ? `Celah Potensial: ${editCelahPotensial}` : '',
    ].filter(Boolean).join('\n');

    onSendToResearchForm({
      platform: platformHint,
      assetType: targetAssetType,
      keyword: keywordInput.trim() || 'screenshot-search-niche',
      searchResultCount: Math.max(0, parsedCount),
      notes: notesSummary,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Mandatory Privacy Notice Banner */}
      <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-4 sm:p-5 flex items-start gap-3 text-amber-950 shadow-2xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm space-y-1">
          <p className="font-bold text-amber-900">
            Catatan Privasi &amp; Keamanan Data
          </p>
          <p className="text-amber-800 leading-relaxed text-xs">
            Hanya unggah tangkapan layar (screenshot) halaman publik hasil pencarian katalog microstock. <strong>JANGAN PERNAH</strong> mengunggah screenshot dashboard penjualan, data royalti/penghasilan, atau data akun pribadi kontributor.
          </p>
        </div>
      </div>

      {/* 2. Upload & Compression Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" />
              Unggah Screenshot Halaman Hasil Pencarian
            </h3>
            <p className="text-xs text-slate-500">
              Gambar dikompres otomatis di sisi klien sebelum dikirim ke Gemini Vision.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono">Panggilan Hari Ini: {dailyStats.count}/{dailyStats.maxRecommended}</span>
          </div>
        </div>

        {/* Settings Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Platform Screenshot:
            </label>
            <select
              value={platformHint}
              onChange={(e) => setPlatformHint(e.target.value as Platform)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium cursor-pointer"
            >
              <option value="Adobe Stock">Adobe Stock</option>
              <option value="Shutterstock">Shutterstock</option>
              <option value="Freepik">Freepik</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Target Tipe Aset:
            </label>
            <select
              value={targetAssetType}
              onChange={(e) => setTargetAssetType(e.target.value as AssetType)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium cursor-pointer"
            >
              <option value="Foto nyata">Foto nyata</option>
              <option value="Foto AI-generated">Foto AI-generated</option>
              <option value="Ilustrasi AI-generated">Ilustrasi AI-generated</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Kata Kunci Dicari (Opsional):
            </label>
            <input
              type="text"
              placeholder="Contoh: ramadan lantern vector"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Dropzone Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50"
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg, image/png, image/jpg"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
            className="hidden"
          />

          {previewUrl ? (
            <div className="space-y-3">
              <img
                src={previewUrl}
                alt="Screenshot Preview"
                className="max-h-60 mx-auto rounded-lg shadow-xs border border-slate-200 object-contain"
              />
              <div className="flex items-center justify-center gap-3 text-xs text-slate-600">
                <span>Ukuran Asli: <strong>{originalSizeKb} KB</strong></span>
                <span>&rarr;</span>
                <span className="text-emerald-700 font-semibold">
                  Terkonversi Ringan: ~{compressedSizeKb} KB
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setAnalysisResult(null);
                  }}
                  className="text-rose-600 hover:underline cursor-pointer ml-2"
                >
                  Ganti Gambar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 py-4">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-1" />
              <span className="text-xs sm:text-sm font-semibold text-slate-700 block">
                Tarik &amp; lepas screenshot ke sini, atau klik untuk memilih file
              </span>
              <span className="text-[11px] text-slate-400 block">
                Format yang didukung: JPG, PNG (halaman publik pencarian microstock)
              </span>
            </div>
          )}
        </div>

        {/* Trigger Button */}
        {selectedFile && !analysisResult && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleStartAnalysis}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Membaca Screenshot dengan Gemini Multimodal...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Analisis Screenshot Sekarang
                </>
              )}
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
            isRateLimit ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* 3. Editable Results Form (Only after analysis) */}
      {analysisResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Hasil Pembacaan Gemini
              </span>
              <h3 className="font-bold text-slate-900 text-base">
                Formulir Verifikasi Hasil Screenshot (Dapat Diedit)
              </h3>
            </div>
            <span className="text-xs text-slate-500 italic">
              Field tidak terlihat bernilai null, bukan tebakan.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Field 1: Jumlah Hasil Terbaca (Teks & Angka) */}
            <div className="space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="font-semibold text-slate-800 block">
                1. Jumlah Hasil Pencarian Terbaca:
              </label>
              <input
                type="text"
                value={editHasilTeks}
                onChange={(e) => setEditHasilTeks(e.target.value)}
                placeholder="Teks terlihat, misal: 1.420 hasil (atau kosong jika tidak tampak)"
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 font-mono"
              />
              <div className="pt-1">
                <span className="text-[11px] text-slate-500 block mb-1">
                  Nilai Angka Murni untuk Form Riset:
                </span>
                <input
                  type="number"
                  min="0"
                  value={editHasilAngka}
                  onChange={(e) => setEditHasilAngka(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 font-mono font-bold"
                />
              </div>
            </div>

            {/* Field 2: Gaya Dominan */}
            <div className="space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="font-semibold text-slate-800 block">
                2. Gaya Visual Dominan:
              </label>
              <textarea
                rows={3}
                value={editGayaDominan}
                onChange={(e) => setEditGayaDominan(e.target.value)}
                placeholder="Misal: Flat vector minimalis, warna pastel cerah, pencahayaan studio"
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900"
              />
            </div>

            {/* Field 3: Copy Space & Label AI */}
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  3. Ketersediaan Copy Space:
                </label>
                <select
                  value={editCopySpace}
                  onChange={(e) => setEditCopySpace(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 cursor-pointer"
                >
                  <option value="null">Tidak terlihat / Belum yakin (null)</option>
                  <option value="ya">Ya (Banyak ruang kosong teks)</option>
                  <option value="sebagian">Sebagian (Sebagian aset punya ruang)</option>
                  <option value="tidak">Tidak (Penuh objek, tanpa ruang teks)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  4. Label / Badge AI-Generated Terlihat:
                </label>
                <select
                  value={editLabelAi}
                  onChange={(e) => setEditLabelAi(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 cursor-pointer"
                >
                  <option value="null">Tidak terlihat / Tidak yakin (null)</option>
                  <option value="true">Ya, Terlihat jelas label AI</option>
                  <option value="false">Tidak ada indikator AI</option>
                </select>
              </div>
            </div>

            {/* Field 4: Kontributor Terdeteksi */}
            <div className="space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="font-semibold text-slate-800 block">
                5. Kontributor Terlihat (Jika Ada):
              </label>
              <textarea
                rows={3}
                value={editKontributor}
                onChange={(e) => setEditKontributor(e.target.value)}
                placeholder="Hanya diisi jika nama kontributor tampak di kartu aset. Kosongkan jika tidak ada."
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 text-xs"
              />
              <p className="text-[10px] text-slate-500">
                Format: Nama Kontributor (~jumlah aset).
              </p>
            </div>
          </div>

          {/* Field 5: Celah Potensial */}
          <div className="space-y-1.5 p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 text-xs">
            <label className="font-bold text-emerald-900 block">
              6. Celah Pasar &amp; Peluang Visual Baru:
            </label>
            <textarea
              rows={2}
              value={editCelahPotensial}
              onChange={(e) => setEditCelahPotensial(e.target.value)}
              placeholder="Apa yang belum banyak disajikan di hasil pencarian ini yang berpeluang dicari pembeli?"
              className="w-full bg-white border border-emerald-300 rounded-md px-3 py-2 text-slate-900"
            />
          </div>

          {/* Action: Confirm & Save to Phase 1 */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Data hanya tersimpan setelah Anda menekan tombol konfirmasi di bawah ini.
              </span>
            </div>

            <button
              type="button"
              onClick={handleConfirmAndSendToPhase1}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Konfirmasi &amp; Masukkan ke Form Riset Pasar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
