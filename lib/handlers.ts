import crypto from 'node:crypto';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

// Inisialisasi GoogleGenAI instance di sisi server
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY tidak ditemukan di environment server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Cooldown untuk alat Google Search jika kuota alat terbatas
let searchToolCooldownUntil = 0;

/**
 * Verifikasi Kode Akses Aplikasi (X-App-Passcode)
 * Memakai crypto.timingSafeEqual untuk mencegah timing attack.
 */
export function verifyPasscode(passcodeHeader: string | undefined): {
  ok: boolean;
  status?: number;
  error?: string;
} {
  const serverPasscode = process.env.APP_PASSCODE;
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production';

  // Jika APP_PASSCODE belum diatur di server:
  if (!serverPasscode) {
    // Di lingkungan produksi (Vercel), tolak semua panggilan AI (gagal tertutup)
    if (isProduction) {
      return {
        ok: false,
        status: 401,
        error: 'Akses fitur AI dinonaktifkan: APP_PASSCODE belum dikonfigurasi di server produksi.',
      };
    }
    // Di lingkungan pengembangan / pratinjau AI Studio, pemeriksaan boleh dilewati jika belum diatur
    return { ok: true };
  }

  // Jika APP_PASSCODE sudah diatur di server, periksa header
  if (!passcodeHeader || typeof passcodeHeader !== 'string') {
    return {
      ok: false,
      status: 401,
      error: 'Kode akses fitur AI diperlukan. Silakan masukkan kode akses di aplikasi.',
    };
  }

  try {
    const expected = Buffer.from(serverPasscode, 'utf8');
    const actual = Buffer.from(passcodeHeader, 'utf8');

    if (expected.length !== actual.length) {
      return {
        ok: false,
        status: 401,
        error: 'Kode akses fitur AI tidak cocok. Periksa kembali kode akses Anda.',
      };
    }

    const match = crypto.timingSafeEqual(expected, actual);
    if (!match) {
      return {
        ok: false,
        status: 401,
        error: 'Kode akses fitur AI tidak cocok. Periksa kembali kode akses Anda.',
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      status: 401,
      error: 'Verifikasi kode akses gagal.',
    };
  }
}

/**
 * 1. Handler Ide Niche (Dua Langkah Grounding & Schema)
 */
export async function handleNicheIdeas(body: any) {
  const { assetType, theme, seasonalMoment, candidateCount = 10, isPastWindow } = body || {};

  // Validasi input
  if (!assetType || typeof assetType !== 'string' || assetType.length > 60) {
    throw { status: 400, message: 'Parameter tipe aset tidak valid.' };
  }
  if (theme && (typeof theme !== 'string' || theme.length > 250)) {
    throw { status: 400, message: 'Panjang teks tema melebihi batas (maks 250 karakter).' };
  }
  if (seasonalMoment && (typeof seasonalMoment !== 'string' || seasonalMoment.length > 250)) {
    throw { status: 400, message: 'Panjang teks momen musiman melebihi batas (maks 250 karakter).' };
  }

  const count = Math.min(15, Math.max(3, Number(candidateCount) || 10));
  const ai = getGenAI();

  // LANGKAH 1: Gemini dengan Google Search Grounding
  const currentYear = new Date().getFullYear();
  const targetYearText = isPastWindow
    ? `Tahun target: Musim depan (${currentYear + 1}), karena jendela unggah tahun ${currentYear} telah lewat.`
    : `Tahun target: ${currentYear}.`;

  const queryContext = [
    `Cari tren dan permintaan microstock terbaru untuk platform Adobe Stock, Shutterstock, dan Freepik.`,
    targetYearText,
    `Tipe aset yang ditargetkan: ${assetType}.`,
    theme ? `Tema / Fokus: "${theme.slice(0, 200)}".` : '',
    seasonalMoment ? `Momen musiman terkait: "${seasonalMoment.slice(0, 200)}".` : '',
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

  // LANGKAH 2: Sintesis Rekomendasi Terstruktur
  const sourcesContext = extractedSources.length > 0
    ? `Gunakan dan tautkan HANYA daftar sumber web resmi berikut yang terbukti valid dari pencarian:\n` +
      extractedSources.map((s, idx) => `[Sumber ${idx + 1}] Judul: "${s.judul}" | URL: "${s.url}"`).join('\n')
    : `Pencarian grounding tidak mengembalikan URL metadata spesifik. JANGAN MENGARANG URL PALSU. Kosongkan array "sumber" (jadikan []) dan jadikan "saran_permintaan_1_5": null.`;

  const synthesisPrompt = `
Anda adalah analis pasar dan kurator aset komersial microstock profesional.
Analisis data pasar berikut dan hasilkan ${count} rekomendasi ide niche komersial untuk tipe aset: "${assetType}".

${sourcesContext}

Konteks Pencarian & Tren Awal:
${step1Text ? step1Text.slice(0, 3000) : 'Gunakan wawasan tren visual microstock global.'}

ATURAN STRUKTUR & VALIDASI KETAT:
1. "kata_kunci_en": Kata kunci utama dalam bahasa Inggris (2-4 kata spesifik, komersial, dicari pembeli global).
2. "varian_id": Penjelasan/judul konteks dalam bahasa Indonesia yang ringkas.
3. "alasan": Mengapa niche ini memiliki peluang (jelaskan rasio permintaan vs pasokan).
4. "sinyal_tren": Sinyal nyata mengapa topik ini dicari saat ini.
5. "sumber": Array berisi objek { judul, url }.
   - KRITIS: HANYA BOLEH mencantumkan URL yang PERSIS SAMA dengan daftar [Sumber X] di atas.
   - JIKA tidak ada sumber valid di atas, array "sumber" WAJIB KOSONG [].
   - DILARANG MENGARANG ATAU MENGUBAH URL.
6. "saran_permintaan_1_5": Angka bulat 1 sampai 5.
   - JIKA dan HANYA JIKA ada sumber rujukan valid di field "sumber", berikan nilai 1-5 berdasarkan kekuatan sinyal.
   - JIKA "sumber" kosong, nilai "saran_permintaan_1_5" WAJIB NULL.
7. "saran_sudut": Rekomendasi sudut visual taktis:
   - "copy_space": Di mana ruang kosong untuk teks ditempatkan (misal: "sisi kanan atas 40%").
   - "konteks_lokal": Konteks budaya, objek, atau situasi spesifik.
   - "gaya": Pencahayaan, palet warna, dan komposisi visual.
`;

  const step2Response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: synthesisPrompt,
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

  // Filter ketat: Tampilkan HANYA URL yang berasal dari metadata grounding
  const allowedUrlSet = new Set(extractedSources.map((s) => s.url));

  const sanitizedKandidat = (parsedJson.kandidat || []).map((k: any) => {
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

  return {
    success: true,
    data: sanitizedKandidat,
    metadata: {
      totalSourcesFound: extractedSources.length,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * 2. Handler Baca Screenshot Multimodal
 */
export async function handleScreenshot(body: any) {
  const { imageBase64, mimeType = 'image/jpeg', platformHint } = body || {};

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw { status: 400, message: 'Data gambar screenshot tidak ditemukan atau tidak valid.' };
  }

  // Batasi ukuran gambar di sisi server (maksimal ~5MB base64 string)
  if (imageBase64.length > 5 * 1024 * 1024) {
    throw { status: 400, message: 'Ukuran data gambar terlalu besar (maksimal ~3 MB setelah dikompresi).' };
  }

  // Validasi tipe mime
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  const safeMime = allowedMimes.includes(mimeType) ? mimeType : 'image/jpeg';
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  const ai = getGenAI();

  const safePlatformHint = typeof platformHint === 'string'
    ? platformHint.slice(0, 80)
    : 'Adobe Stock / Shutterstock / Freepik';

  const visionPrompt = `
Anda adalah asisten analisis visual microstock. Periksa screenshot halaman hasil pencarian platform microstock (${safePlatformHint}) ini dengan teliti.

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
            mimeType: safeMime,
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

  return {
    success: true,
    data: parsed,
  };
}

/**
 * 3. Handler Ringkas Insight Portofolio AI
 */
export async function handleSummarizeInsights(body: any) {
  const { payload } = body || {};
  if (!payload || typeof payload !== 'object' || !payload.summaryPerAssetType) {
    throw { status: 400, message: 'Payload data agregat portofolio tidak ditemukan atau tidak lengkap.' };
  }

  // Batasi panjang payload agregat agar tidak dieksploitasi
  const jsonStr = JSON.stringify(payload);
  if (jsonStr.length > 50000) {
    throw { status: 400, message: 'Ukuran payload data melebihi batas yang diizinkan.' };
  }

  const ai = getGenAI();

  const prompt = `
Anda adalah konsultan analitik portofolio microstock senior.
Tugas Anda adalah menyusun narasi insight analitik yang tajam, profesional, dan dapat langsung ditindaklanjuti berdasarkan data RINGKASAN AGREGAT berikut.

DATA RINGKASAN AGREGAT PORTOFOLIO:
${jsonStr}

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

  return {
    success: true,
    narrative: response.text || 'Tidak dapat menghasilkan narasi.',
  };
}

/**
 * Format error response aman (tanpa membocorkan kunci rahasia atau detail internal)
 */
export function formatErrorResponse(error: any) {
  const isRateLimit =
    error?.status === 429 ||
    error?.message?.includes('429') ||
    error?.message?.includes('RESOURCE_EXHAUSTED') ||
    error?.message?.includes('quota');

  if (isRateLimit) {
    return {
      status: 429,
      body: {
        success: false,
        error: 'Batas kuota panggilan Gemini tercapai (Galat 429). Mohon tunggu beberapa saat sebelum mencoba kembali.',
        isRateLimit: true,
      },
    };
  }

  const status = typeof error?.status === 'number' ? error.status : 500;
  const message = error?.message || 'Terjadi kesalahan pada layanan pemrosesan AI.';

  return {
    status,
    body: {
      success: false,
      error: message,
      isRateLimit: false,
    },
  };
}
