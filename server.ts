import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware JSON parser dengan limit untuk base64 image screenshot & aggregate payload
app.use(express.json({ limit: '15mb' }));

// Inisialisasi GoogleGenAI instance di sisi server
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY tidak ditemukan di environment server.');
  }
  return new GoogleGenAI({ apiKey });
};

// Cooldown untuk alat Google Search jika kuota alat terbatas
let searchToolCooldownUntil = 0;

// ==========================================
// 1. ENDPOINT: IDE NICHE (DUA LANGKAH)
// ==========================================
app.post('/api/gemini/niche-ideas', async (req, res) => {
  try {
    const { assetType, theme, seasonalMoment, candidateCount = 10, isPastWindow } = req.body;
    const count = Math.min(15, Math.max(3, Number(candidateCount) || 10));

    const ai = getGenAI();

    // ----------------------------------------------------
    // LANGKAH 1: Panggilan Gemini dengan Google Search Grounding
    // Mencari sinyal tren terkini dan data permintaan aktual.
    // ----------------------------------------------------
    const currentYear = new Date().getFullYear();
    const targetYearText = isPastWindow
      ? `Tahun target: Musim depan (${currentYear + 1}), karena jendela unggah tahun ${currentYear} telah lewat.`
      : `Tahun target: ${currentYear}.`;

    const queryContext = [
      `Cari tren dan permintaan microstock terbaru untuk platform Adobe Stock, Shutterstock, dan Freepik.`,
      targetYearText,
      `Tipe aset yang ditargetkan: ${assetType || 'Semua tipe aset'}.`,
      theme ? `Tema / Fokus: "${theme}".` : '',
      seasonalMoment ? `Momen musiman terkait: "${seasonalMoment}".` : '',
      isPastWindow ? `PERINGATAN: Jendela musim tahun ini telah lewat. Fokuskan riset ide untuk target musim tahun berikutnya.` : '',
      `Fokuskan pencarian pada: kata kunci yang sedang naik daun (trending searches), demand sinyal dari creative insights/shot lists, dan celah pasar visual yang belum jenuh.`,
    ].filter(Boolean).join(' ');

    let step1Text = '';
    const extractedSources: { judul: string; url: string }[] = [];
    const isSearchToolInCooldown = Date.now() < searchToolCooldownUntil;

    if (!isSearchToolInCooldown) {
      try {
        const step1Response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: queryContext,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        step1Text = step1Response.text || '';

        // Ekstrak metadata grounding HANYA dari chunk web asli groundingChunks
        const rawChunks = step1Response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const seenUrls = new Set<string>();

        for (const chunk of rawChunks) {
          const web = (chunk as any).web;
          if (web?.uri && web?.title && !seenUrls.has(web.uri)) {
            seenUrls.add(web.uri);
            extractedSources.push({
              judul: web.title,
              url: web.uri,
            });
          }
        }
      } catch (groundingErr: any) {
        const isQuotaErr =
          groundingErr?.status === 429 ||
          groundingErr?.message?.includes('429') ||
          groundingErr?.message?.includes('RESOURCE_EXHAUSTED') ||
          groundingErr?.message?.includes('quota');

        if (isQuotaErr) {
          searchToolCooldownUntil = Date.now() + 10 * 60 * 1000;
        }
      }
    }

    // Jika pencarian grounding tidak menghasilkan teks (misal offline/cooldown),
    // buat ringkasan analisis kontekstual, tetapi JANGAN mengarang URL grounding.
    if (!step1Text) {
      step1Text = `Analisis tren komersial microstock untuk Adobe Stock, Shutterstock, dan Freepik. Target tipe aset: ${assetType || 'Semua tipe aset'}. Tema / Fokus: "${theme || 'Umum'}". Momen Musiman: "${seasonalMoment || 'Umum'}". ${isPastWindow ? 'Target produksi untuk musim tahun depan.' : ''}`;
    }

    // ----------------------------------------------------
    // LANGKAH 2: Panggilan Gemini TANPA Tools untuk Parsing ke JSON
    // Mengubah hasil Langkah 1 menjadi JSON terstruktur
    // ----------------------------------------------------
    const allowedUrlsPrompt = extractedSources.length > 0
      ? `SUMBER DOKUMEN WEB BERSUMBER (HANYA DARI METADATA GROUNDING RESMI):\n${JSON.stringify(extractedSources, null, 2)}`
      : `SUMBER DOKUMEN WEB BERSUMBER: TIDAK ADA SUMBER METADATA GROUNDING. (Peraturan: kandidat tidak boleh mencantumkan sumber dan saran_permintaan_1_5 WAJIB null).`;

    const step2Prompt = `
Anda adalah analis kata kunci microstock profesional. Ubah ringkasan tren berikut menjadi persis ${count} kandidat ide niche kata kunci microstock.

DATA TREN (LANGKAH 1):
${step1Text}

${allowedUrlsPrompt}

${isPastWindow ? `PERINGATAN SIKLUS MUSIM: Jendela unggah untuk tahun ${currentYear} sudah lewat. JANGAN sarankan produksi untuk tahun berjalan. Seluruh saran ide WAJIB menargetkan musim tahun ${currentYear + 1}.` : ''}

ATURAN KETAT:
1. Buat tepat ${count} kandidat ide niche yang spesifik dan komersial untuk tipe aset "${assetType || 'Microstock'}".
2. kata_kunci_en HARUS berupa frase kata kunci komersial dalam bahasa Inggris (standar pencarian pembeli microstock internasional).
3. varian_id: terjemahan / padanan konsep dalam bahasa Indonesia.
4. alasan: mengapa topik ini berpeluang (gap kompetisi atau keunikan visual).
5. sinyal_tren: kutipan atau fakta tren dari hasil pencarian di atas.
6. sumber: array sumber [{ judul, url }]. HANYA boleh mengambil dari daftar SUMBER DOKUMEN WEB BERSUMBER di atas. DILARANG MENULISKAN ATAU MEMBUAT URL LAIN YANG TIDAK ADA DALAM DAFTAR TERSEBUT!
7. ATURAN SKOR PERMINTAAN: Tentukan saran_permintaan_1_5 (skala angka bulat 1 sampai 5) berdasarkan kekuatan sinyal minat pembeli. JIKA TIDAK ADA SUMBER SAMA SEKALI DARI DAFTAR GROUNDING DI ATAS, saran_permintaan_1_5 WAJIB bernilai NULL!
8. DILARANG KERAS MENGARANG ANGKA HASIL PENCARIAN ATAU STATISTIK PALSU.
9. saran_sudut: berikan rekomendasi sudut pandang:
   - copy_space: saran penempatan ruang kosong untuk teks pembeli (misal: "sisi kiri untuk teks promosi").
   - konteks_lokal: elemen budaya / lokalitas jika relevan, atau "universal".
   - gaya: rekomendasi tata cahaya, komposisi, atau estetika visual.
`;

    const step2Response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: step2Prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            kandidat: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  kata_kunci_en: { type: Type.STRING },
                  varian_id: { type: Type.STRING },
                  alasan: { type: Type.STRING },
                  sinyal_tren: { type: Type.STRING },
                  sumber: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        judul: { type: Type.STRING },
                        url: { type: Type.STRING },
                      },
                      required: ['judul', 'url'],
                    },
                  },
                  saran_permintaan_1_5: {
                    type: Type.INTEGER,
                    description: 'Skor 1-5 jika bersumber dari grounding metadata, atau null jika tidak ada sumber.',
                  },
                  saran_sudut: {
                    type: Type.OBJECT,
                    properties: {
                      copy_space: { type: Type.STRING },
                      konteks_lokal: { type: Type.STRING },
                      gaya: { type: Type.STRING },
                    },
                    required: ['copy_space', 'konteks_lokal', 'gaya'],
                  },
                },
                required: [
                  'kata_kunci_en',
                  'varian_id',
                  'alasan',
                  'sinyal_tren',
                  'sumber',
                  'saran_sudut',
                ],
              },
            },
          },
          required: ['kandidat'],
        },
      },
    });

    const rawJsonText = step2Response.text || '{"kandidat":[]}';
    let parsedJson: any = { kandidat: [] };
    try {
      parsedJson = JSON.parse(rawJsonText);
    } catch {
      const match = rawJsonText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedJson = JSON.parse(match[0]);
      }
    }

    // Filter ketat Fase 3: Tampilkan HANYA URL yang berasal dari metadata grounding
    const allowedUrlSet = new Set(extractedSources.map((s) => s.url));

    const sanitizedKandidat = (parsedJson.kandidat || []).map((k: any) => {
      // Hanya izinkan sumber yang URL-nya persis ada di metadata grounding
      const validSources = Array.isArray(k.sumber)
        ? k.sumber.filter((s: any) => s && s.url && allowedUrlSet.has(s.url))
        : [];
      const hasSource = validSources.length > 0;

      return {
        ...k,
        sumber: validSources,
        saran_permintaan_1_5: hasSource && typeof k.saran_permintaan_1_5 === 'number'
          ? Math.max(1, Math.min(5, Math.round(k.saran_permintaan_1_5)))
          : null,
      };
    });

    return res.json({
      success: true,
      data: sanitizedKandidat,
      metadata: {
        totalSourcesFound: extractedSources.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    const isRateLimit =
      error?.status === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.message?.includes('quota');
    const statusCode = isRateLimit ? 429 : 500;
    const cleanMessage = isRateLimit
      ? 'Batas kuota panggilan Gemini tercapai (Galat 429). Mohon tunggu beberapa saat sebelum mencoba kembali.'
      : (error?.message || 'Terjadi galat saat memproses riset niche dengan Gemini.');

    return res.status(statusCode).json({
      success: false,
      error: cleanMessage,
      isRateLimit,
    });
  }
});

// ==========================================
// 2. ENDPOINT: BACA SCREENSHOT MULTIMODAL
// ==========================================
app.post('/api/gemini/read-screenshot', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', platformHint } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Data gambar screenshot tidak ditemukan.' });
    }

    const ai = getGenAI();
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const visionPrompt = `
Anda adalah asisten analisis visual microstock. Periksa screenshot halaman hasil pencarian platform microstock (${platformHint || 'Adobe Stock / Shutterstock / Freepik'}) ini dengan teliti.

TUGAS EKSTRAKSI:
1. jumlah_hasil_terbaca: Berapa jumlah hasil pencarian / aset yang tertera di layar? (Contoh teks: "1.420 hasil", "35,120 assets", "1,200 resources"). Jika angka hasil tidak terlihat atau tertutup, WAJIB bernilai NULL. JANGAN MENEBAK!
2. jumlah_aset_per_kontributor: Apakah terlihat nama-nama kontributor di bawah thumbnail atau kartu aset? Jika ADA nama yang terlihat jelas, buat daftarnya dengan perkiraan berapa aset milik kontributor tersebut yang tampak di layar. JIKA NAMA KONTRIBUTOR TIDAK TERLIHAT, WAJIB bernilai NULL.
3. gaya_dominan: Deskripsikan gaya visual dominan yang memenuhi halaman (misal: "3D render clay glossy", "fotografi studio cahaya terang flat lay", "flat vector minimalis monokrom"). Jika tidak terlihat, isi null.
4. ada_copy_space: Apakah thumbnail hasil pencarian menyediakan ruang kosong (copy space) untuk teks pembeli? Pilih persis salah satu: "ya", "sebagian", atau "tidak". Jika tidak terlihat, isi null.
5. label_AI_terlihat: Apakah terlihat label atau badge "Generative AI" / "AI Created" pada thumbnail? Bernilai true jika ada, false jika tidak ada, atau null jika tidak yakin / tidak terbaca.
6. celah_potensial: Apa variasi sudut, gaya, warna, atau konteks lokal yang BELUM BANYAK muncul di hasil pencarian ini yang dapat menjadi peluang bagi kontributor baru?

ATURAN MUTLAK:
- Seluruh field yang TIDAK TERLIHAT secara nyata di screenshot WAJIB bernilai NULL.
- DILARANG KERAS MENGARANG ATAU MENEBAK ANGKA.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          {
            text: visionPrompt,
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            jumlah_hasil_terbaca: {
              type: Type.STRING,
              description: 'Angka hasil pencarian yang tertera di screenshot, atau null jika tidak tampak.',
            },
            jumlah_hasil_angka: {
              type: Type.INTEGER,
              description: 'Nilai angka murni dari jumlah hasil jika terbaca (misal 1420), atau null.',
            },
            jumlah_aset_per_kontributor: {
              type: Type.ARRAY,
              description: 'Hanya jika nama kontributor tampak di layar, atau null.',
              items: {
                type: Type.OBJECT,
                properties: {
                  nama_kontributor: { type: Type.STRING },
                  perkiraan_aset_terlihat: { type: Type.INTEGER },
                },
                required: ['nama_kontributor', 'perkiraan_aset_terlihat'],
              },
            },
            gaya_dominan: { type: Type.STRING },
            ada_copy_space: {
              type: Type.STRING,
              description: 'Pilihan: ya, sebagian, tidak, atau null.',
            },
            label_AI_terlihat: { type: Type.BOOLEAN },
            celah_potensial: { type: Type.STRING },
          },
          required: ['gaya_dominan', 'ada_copy_space', 'celah_potensial'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    const isRateLimit =
      error?.status === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.message?.includes('quota');
    const statusCode = isRateLimit ? 429 : 500;
    const cleanMessage = isRateLimit
      ? 'Batas kuota panggilan Gemini tercapai (Galat 429). Mohon tunggu beberapa saat sebelum mencoba kembali.'
      : (error?.message || 'Gagal memproses screenshot dengan Gemini Vision.');

    return res.status(statusCode).json({
      success: false,
      error: cleanMessage,
      isRateLimit,
    });
  }
});

// ==========================================
// 3. ENDPOINT: RINGKAS INSIGHT PORTOFOLIO (FASE 3)
// ==========================================
app.post('/api/gemini/summarize-insights', async (req, res) => {
  try {
    const { payload } = req.body;
    if (!payload || !payload.summaryPerAssetType) {
      return res.status(400).json({ success: false, error: 'Payload data agregat tidak ditemukan.' });
    }

    const ai = getGenAI();

    const prompt = `
Anda adalah konsultan analitik portofolio microstock senior.
Tugas Anda adalah menyusun narasi insight analitik yang tajam, profesional, dan dapat langsung ditindaklanjuti berdasarkan data RINGKASAN AGREGAT berikut.

DATA RINGKASAN AGREGAT PORTOFOLIO:
${JSON.stringify(payload, null, 2)}

ATURAN KETAT DARI PENGGUNA:
1. DILARANG KERAS MENGHITUNG ULANG, MENGUBAH, ATAU MENGARANG ANGKA BARU.
2. Seluruh angka yang Anda sebutkan (unduhan, pendapatan, rasio unduhan per aset, jumlah aset) HARUS PERSIS SAMA dengan data di atas.
3. Gunakan Bahasa Indonesia yang lugas dan berbobot bisnis.
4. Susun narasi menggunakan Markdown dengan struktur:
   ### 1. Ringkasan Eksekutif Performa
   (Analisis perbandingan performa antar tipe aset, kontribusi unduhan & pendapatan)

   ### 2. Kategori Unggulan (Status: Perbanyak)
   (Sebutkan kategori-kategori berkinerja tinggi, rasio unduhan per aset, dan mengapa layak diperluas produksinya)

   ### 3. Kategori Evaluasi & Efisiensi (Status: Kurangi / Pertahankan)
   (Analisis kategori yang kurang optimal atau jenuh, serta kategori yang perlu dipertahankan)

   ### 4. Rekomendasi Alokasi Waktu Produksi Selanjutnya
   (Arahan taktis pembagian fokus waktu produksi kontributor untuk memaksimalkan ROI)
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    return res.json({
      success: true,
      narrative: response.text || 'Tidak dapat menghasilkan narasi.',
    });
  } catch (error: any) {
    const isRateLimit =
      error?.status === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.message?.includes('quota');
    const statusCode = isRateLimit ? 429 : 500;
    const cleanMessage = isRateLimit
      ? 'Batas kuota panggilan Gemini tercapai (Galat 429). Mohon tunggu beberapa saat sebelum mencoba kembali.'
      : (error?.message || 'Gagal menyusun narasi insight portofolio.');

    return res.status(statusCode).json({
      success: false,
      error: cleanMessage,
      isRateLimit,
    });
  }
});

// ==========================================
// VITE INTEGRATION FOR DEV / PROD
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Microstock Research Fase 3 berjalan di port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Gagal menjalankan server:', err);
  process.exit(1);
});
