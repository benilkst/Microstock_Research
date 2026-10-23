/**
 * Microstock Research Fase 3 - Penyimpanan Data & Ekspor/Impor
 * Dilengkapi try/catch dan proteksi data lokal
 * Mendukung Entri Riset, Data Saya, Kalibrasi Bobot Spearman, dan Momen Musiman
 */

import { 
  AppSettings, 
  KeywordEntry, 
  SeasonalMoment, 
  MyDataAsset, 
  ResearchCategoryMatch,
  ProductionPlanItem,
  ProductionFactors,
  ProductionStatus
} from '../types/microstock';
import { getTodayDateString, subtractDays } from './calculator';

const STORAGE_KEYS = {
  KEYWORDS: 'microstock_keywords_v1',
  SETTINGS: 'microstock_settings_v1',
  SEASONAL: 'microstock_seasonal_v1',
  MY_DATA: 'microstock_my_data_v1',
  CATEGORY_MATCHES: 'microstock_category_matches_v1',
  PRODUCTION_PLAN: 'microstock_production_plan_v1',
};

export const DEFAULT_PRODUCTION_FACTORS: ProductionFactors = {
  seasonalActive: 1.2,
  seasonalNone: 1.0,
  seasonalPassed: 0.5,
  dataPerbanyak: 1.2,
  dataPertahankan: 1.0,
  dataKurangi: 0.7,
};

export const DEFAULT_SATURATION_BENCHMARKS = {
  'Adobe Stock': {
    'Foto nyata': 10000000,
    'Foto AI-generated': 10000000,
    'Ilustrasi AI-generated': 10000000,
  },
  'Shutterstock': {
    'Foto nyata': 10000000,
    'Foto AI-generated': 10000000,
    'Ilustrasi AI-generated': 10000000,
  },
  'Freepik': {
    'Foto nyata': 10000000,
    'Foto AI-generated': 10000000,
    'Ilustrasi AI-generated': 10000000,
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  demandWeight: 0.5,
  supplyWeight: 0.5,
  categoryThresholds: {
    minAssets: 5,
    minMonths: 2,
    perbanyakDownloadsPerAsset: 2.0,
    kurangiDownloadsPerAsset: 0.5,
  },
  productionFactors: DEFAULT_PRODUCTION_FACTORS,
  weightHistory: [
    {
      id: 'init-weight',
      date: new Date(Date.now() - 30 * 86400000).toISOString(),
      demandWeight: 0.5,
      supplyWeight: 0.5,
      notes: 'Inisialisasi bobot default 0,5 Permintaan & 0,5 Pasokan',
    },
  ],
  saturationBenchmarks: DEFAULT_SATURATION_BENCHMARKS,
  benchmarkHistory: [],
  groupWeights: {},
};

/**
 * Daftar Momen Musiman Awal
 */
export const DEFAULT_SEASONAL_MOMENTS: SeasonalMoment[] = [
  {
    id: 'moment-natal',
    name: 'Hari Natal (Christmas)',
    category: 'Libur Akhir Tahun',
    peakDate: '2026-12-25',
    description: 'Puncak pencarian ornamen natal, keluarga berkumpul, salju, dan hadiah akhir tahun.',
    keywordsRecommendation: ['christmas greeting card', 'christmas background vector', 'merry christmas tree gift'],
  },
  {
    id: 'moment-tahun-baru',
    name: 'Tahun Baru (New Year)',
    category: 'Libur Akhir Tahun',
    peakDate: '2027-01-01',
    description: 'Pesta kembang api, kalender, tipografi angka tahun baru, resolusi baru.',
    keywordsRecommendation: ['happy new year celebration', 'new year calendar 2027', 'gold fireworks background'],
  },
  {
    id: 'moment-imlek',
    name: 'Tahun Baru Imlek (Chinese New Year)',
    category: 'Perayaan Budaya',
    peakDate: '2027-02-06',
    description: 'Lampion merah, ornamen oriental, angpao, zodiak binatang tahun baru, keluarga.',
    keywordsRecommendation: ['chinese new year lantern', 'lunar new year celebration', 'red envelope angpao gold'],
  },
  {
    id: 'moment-valentine',
    name: 'Hari Kasih Sayang (Valentine\'s Day)',
    category: 'Momen Komersial',
    peakDate: '2027-02-14',
    description: 'Hati, cokelat, bunga mawar, kartu romantis, kado pasangan.',
    keywordsRecommendation: ['valentines day heart card', 'romantic couple gift', 'red rose flower flat lay'],
  },
  {
    id: 'moment-ramadan',
    name: 'Bulan Suci Ramadan',
    category: 'Keagamaan',
    peakDate: '2027-02-10',
    description: 'Bulan puasa, sahur, buka puasa bersama, masjid, lentera fanous, kurma.',
    keywordsRecommendation: ['ramadan kareem greeting', 'arabic lantern fanous', 'iftar food table', 'mosque silhouette at sunset'],
  },
  {
    id: 'moment-lebaran',
    name: 'Hari Raya Idul Fitri (Lebaran)',
    category: 'Keagamaan',
    peakDate: '2027-03-12',
    description: 'Ketupat, mudik lebaran, silaturahmi keluarga, kartu ucapan selamat idul fitri.',
    keywordsRecommendation: ['eid mubarak ketupat vector', 'silaturahmi idul fitri keluarga', 'indonesian mudik journey'],
  },
  {
    id: 'moment-back-to-school',
    name: 'Tahun Ajaran Baru (Back to School)',
    category: 'Pendidikan',
    peakDate: '2027-07-15',
    description: 'Alat tulis, tas sekolah, ruang kelas, bus sekolah, buku catatan, pembelajaran.',
    keywordsRecommendation: ['back to school supplies', 'student classroom desk', 'stationery school banner flat lay'],
  },
  {
    id: 'moment-kemerdekaan-ri',
    name: 'Hari Kemerdekaan RI (17 Agustus)',
    category: 'Nasional',
    peakDate: '2027-08-17',
    description: 'Bendera merah putih, lomba tradisional (panjat pinang, balap karung), pahlawan.',
    keywordsRecommendation: ['hari kemerdekaan indonesia 17 agustus', 'bendera merah putih berkibar', 'lomba panjat pinang perayaan'],
  },
  {
    id: 'moment-halloween',
    name: 'Halloween',
    category: 'Perayaan Musiman',
    peakDate: '2027-10-31',
    description: 'Labu jack-o\'-lantern, kostum hantu, kelelawar, pesta permen trick-or-treat.',
    keywordsRecommendation: ['halloween pumpkin jack o lantern', 'spooky ghost party poster', 'autumn halloween background'],
  },
  {
    id: 'moment-black-friday',
    name: 'Black Friday & Cyber Monday',
    category: 'E-commerce & Bisnis',
    peakDate: '2026-11-27',
    description: 'Diskon belanja, label promo, tas belanja, persentase diskon, banner online shop.',
    keywordsRecommendation: ['black friday sale banner', 'cyber monday shopping cart', 'special discount 50 percent off'],
  },
];

/**
 * Data Riset Awal (Fase 1 & Fase 3)
 */
export const DEFAULT_SAMPLE_KEYWORDS: KeywordEntry[] = [
  {
    id: 'kw-1',
    platform: 'Adobe Stock',
    assetType: 'Ilustrasi AI-generated',
    keyword: 'ramadan kareem islamic floral banner',
    searchResultCount: 3820,
    checkDate: subtractDays(getTodayDateString(), 45),
    demandScore: 5,
    demandSource: 'Adobe Contributor Insights & Search Suggestion',
    topAssetIds: ['89421034', '89421055', '89421102'],
    notes: 'Permintaan sangat tinggi menjelang kuartal pertama. Kompetisi sedang.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'kw-2',
    platform: 'Shutterstock',
    assetType: 'Foto nyata',
    keyword: 'indonesian traditional culinary rendang meat',
    searchResultCount: 1650,
    checkDate: subtractDays(getTodayDateString(), 40),
    demandScore: 4,
    demandSource: 'Shutterstock The Shot List & Google Trends ID',
    topAssetIds: ['210489912', '210489945'],
    notes: 'Foto asli kuliner nusantara dengan tata cahaya natural masih jarang yang berkualitas tinggi.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'kw-3',
    platform: 'Freepik',
    assetType: 'Foto AI-generated',
    keyword: 'asian business professional meeting with hologram',
    searchResultCount: 840,
    checkDate: subtractDays(getTodayDateString(), 35),
    demandScore: 4,
    demandSource: 'Freepik Trending Searches Tab',
    topAssetIds: ['FP-384910', 'FP-384915'],
    notes: 'Kombinasi teknologi masa depan dan talent lokal Asia Timur/Tenggara.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'kw-4',
    platform: 'Adobe Stock',
    assetType: 'Foto nyata',
    keyword: 'bali rice terrace subak harvest morning light',
    searchResultCount: 12400,
    checkDate: subtractDays(getTodayDateString(), 38),
    demandScore: 5,
    demandSource: 'Adobe Travel Category Top Sellers',
    topAssetIds: ['5501923', '5501980', '5502100'],
    notes: 'Persaingan cukup padat tetapi pembeli stabil dari agensi pariwisata internasional.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'kw-5',
    platform: 'Shutterstock',
    assetType: 'Ilustrasi AI-generated',
    keyword: 'retro vintage coffee shop badge emblem vector',
    searchResultCount: 42000,
    checkDate: subtractDays(getTodayDateString(), 32),
    demandScore: 3,
    demandSource: 'Shutterstock Contributor Portal Search',
    topAssetIds: ['1002341', '1002342'],
    notes: 'Pasokan sangat tinggi (42k), skor peluang pasokan menjadi lebih rendah.',
    checkHistory: [
      {
        id: 'chk-5-prev',
        checkDate: subtractDays(getTodayDateString(), 65),
        searchResultCount: 21000,
        demandScore: 3,
        demandSource: 'Shutterstock Contributor Portal Search',
        notes: 'Pengecekan awal',
        recordedAt: new Date(Date.now() - 65 * 86400000).toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'kw-6',
    platform: 'Freepik',
    assetType: 'Ilustrasi AI-generated',
    keyword: 'cute cat character 3d isometric back to school',
    searchResultCount: 1950,
    checkDate: subtractDays(getTodayDateString(), 30),
    demandScore: 5,
    demandSource: 'Freepik Designer Trends Q3',
    topAssetIds: ['FP-99011', 'FP-99014'],
    notes: 'Gaya 3d render karakter imut untuk stiker dan media edukasi anak.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'kw-7',
    platform: 'Adobe Stock',
    assetType: 'Foto AI-generated',
    keyword: 'cyberpunk batik warrior neon lighting futuristic',
    searchResultCount: 310,
    checkDate: subtractDays(getTodayDateString(), 28),
    demandScore: 3,
    demandSource: 'Microstockgroup & Reddit Art Discussion',
    topAssetIds: ['7712301'],
    notes: 'Niche sangat spesifik, persaingan rendah sekali (< 500 hasil).',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'kw-8',
    platform: 'Shutterstock',
    assetType: 'Foto nyata',
    keyword: 'elderly indonesian woman batik artisan weaving cloth',
    searchResultCount: 420,
    checkDate: subtractDays(getTodayDateString(), 34),
    demandScore: 4,
    demandSource: 'Shutterstock Shot List (Cultural Diversity)',
    topAssetIds: ['4491028', '4491030'],
    notes: 'Dokumentasi budaya otentik yang bernilai komersial tinggi untuk periklanan ESG.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'kw-9',
    platform: 'Adobe Stock',
    assetType: 'Foto nyata',
    keyword: 'solar panel technician rooftop renewable energy',
    searchResultCount: 2200,
    checkDate: subtractDays(getTodayDateString(), 26),
    demandScore: 5,
    demandSource: 'Adobe Stock Green Energy Insights',
    topAssetIds: ['6610291', '6610294'],
    notes: 'Kebutuhan korporasi untuk laporan keberlanjutan energi bersih.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'kw-10',
    platform: 'Freepik',
    assetType: 'Foto nyata',
    keyword: 'traditional indonesian herbal jamu bottle modern',
    searchResultCount: 680,
    checkDate: subtractDays(getTodayDateString(), 25),
    demandScore: 4,
    demandSource: 'Freepik Wellness Trending Searches',
    topAssetIds: ['FP-77210', 'FP-77215'],
    notes: 'Kesehatan holistik dan minuman herbal khas Nusantara dengan kemasan estetik.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'kw-11',
    platform: 'Shutterstock',
    assetType: 'Foto nyata',
    keyword: 'indonesian coffee shop barista pouring latte art',
    searchResultCount: 8900,
    checkDate: subtractDays(getTodayDateString(), 22),
    demandScore: 4,
    demandSource: 'Shutterstock Coffee Lifestyle Collection',
    topAssetIds: ['3320119', '3320120'],
    notes: 'Pasokan cukup ramai, butuh diferensiasi biji kopi lokal dan kedai unik.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'kw-12',
    platform: 'Adobe Stock',
    assetType: 'Foto nyata',
    keyword: 'asian student graduation ceremony diploma gown',
    searchResultCount: 5400,
    checkDate: subtractDays(getTodayDateString(), 24),
    demandScore: 4,
    demandSource: 'Adobe Stock Education Category Trends',
    topAssetIds: ['991044', '991045'],
    notes: 'Momen kelulusan universitas dengan wajah lokal Asia.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Data Riwayat Portofolio Contoh untuk "Data Saya"
 * Memberikan dataset lengkap agar analitik, kategori status, dan kalibrasi Spearman dapat diuji langsung
 */
export const DEFAULT_SAMPLE_MY_DATA: MyDataAsset[] = [
  // 1. Kategori: Kuliner Tradisional Nusantara (Foto nyata) - diunggah 15-20 hari lalu (paska riset kw-2)
  { id: 'ast-101', assetIdOrTitle: 'Foto Rendang Daging Sapi Piring Tradisional', date: subtractDays(getTodayDateString(), 20), category: 'Kuliner Tradisional Nusantara', downloads: 38, revenue: 28.5, assetType: 'Foto nyata' },
  { id: 'ast-102', assetIdOrTitle: 'Bumbu Rendang Rempah di Cobek Batu', date: subtractDays(getTodayDateString(), 18), category: 'Kuliner Tradisional Nusantara', downloads: 29, revenue: 21.0, assetType: 'Foto nyata' },
  { id: 'ast-103', assetIdOrTitle: 'Sate Ayam Madura Bakaran Arang Asap', date: subtractDays(getTodayDateString(), 15), category: 'Kuliner Tradisional Nusantara', downloads: 34, revenue: 24.2, assetType: 'Foto nyata' },
  { id: 'ast-104', assetIdOrTitle: 'Nasi Tumpeng Mini Hiasan Daun Pisang', date: subtractDays(getTodayDateString(), 12), category: 'Kuliner Tradisional Nusantara', downloads: 41, revenue: 31.0, assetType: 'Foto nyata' },
  { id: 'ast-105', assetIdOrTitle: 'Gado-gado Siram Saus Kacang Gurih', date: subtractDays(getTodayDateString(), 8), category: 'Kuliner Tradisional Nusantara', downloads: 22, revenue: 16.5, assetType: 'Foto nyata' },
  { id: 'ast-106', assetIdOrTitle: 'Es Cendol Dawet Gula Merah Nangka', date: subtractDays(getTodayDateString(), 5), category: 'Kuliner Tradisional Nusantara', downloads: 19, revenue: 13.0, assetType: 'Foto nyata' },

  // 2. Kategori: Tenun & Kerajinan Budaya Batik (Foto nyata) - paska riset kw-8 (34 hari lalu)
  { id: 'ast-201', assetIdOrTitle: 'Pengrajin Batik Tulis Wanita Tua Canting', date: subtractDays(getTodayDateString(), 22), category: 'Tenun & Kerajinan Budaya Batik', downloads: 44, revenue: 35.2, assetType: 'Foto nyata' },
  { id: 'ast-202', assetIdOrTitle: 'Tangan Memegang Canting Meneteskan Lilin', date: subtractDays(getTodayDateString(), 19), category: 'Tenun & Kerajinan Budaya Batik', downloads: 36, revenue: 27.0, assetType: 'Foto nyata' },
  { id: 'ast-203', assetIdOrTitle: 'Kain Tenun Ikat Tradisional Motif Etnik', date: subtractDays(getTodayDateString(), 14), category: 'Tenun & Kerajinan Budaya Batik', downloads: 28, revenue: 21.5, assetType: 'Foto nyata' },
  { id: 'ast-204', assetIdOrTitle: 'Pewarnaan Alami Kain Batik Rebusan Kayu', date: subtractDays(getTodayDateString(), 10), category: 'Tenun & Kerajinan Budaya Batik', downloads: 25, revenue: 19.0, assetType: 'Foto nyata' },
  { id: 'ast-205', assetIdOrTitle: 'Gulungan Benang Sutra Tradisional Warna-warni', date: subtractDays(getTodayDateString(), 6), category: 'Tenun & Kerajinan Budaya Batik', downloads: 18, revenue: 12.5, assetType: 'Foto nyata' },

  // 3. Kategori: Lanskap & Pertanian Bali (Foto nyata) - paska riset kw-4 (38 hari lalu)
  { id: 'ast-301', assetIdOrTitle: 'Terasering Sawah Jatiluwih Pagi Hari Kabut', date: subtractDays(getTodayDateString(), 25), category: 'Lanskap & Pertanian Bali', downloads: 52, revenue: 42.0, assetType: 'Foto nyata' },
  { id: 'ast-302', assetIdOrTitle: 'Petani Bali Membawa Padi Topi Caping', date: subtractDays(getTodayDateString(), 21), category: 'Lanskap & Pertanian Bali', downloads: 46, revenue: 37.5, assetType: 'Foto nyata' },
  { id: 'ast-303', assetIdOrTitle: 'Aliran Saluran Air Subak Tradisional Sawah', date: subtractDays(getTodayDateString(), 16), category: 'Lanskap & Pertanian Bali', downloads: 29, revenue: 22.0, assetType: 'Foto nyata' },
  { id: 'ast-304', assetIdOrTitle: 'Matahari Terbit di Atas Bukit Sawah Berundak', date: subtractDays(getTodayDateString(), 11), category: 'Lanskap & Pertanian Bali', downloads: 35, revenue: 28.0, assetType: 'Foto nyata' },
  { id: 'ast-305', assetIdOrTitle: 'Pondok Petani Kayu di Tengah Persawahan Hijau', date: subtractDays(getTodayDateString(), 7), category: 'Lanskap & Pertanian Bali', downloads: 21, revenue: 15.0, assetType: 'Foto nyata' },

  // 4. Kategori: Energi Surya & Teknisi Panel (Foto nyata) - paska riset kw-9 (26 hari lalu)
  { id: 'ast-401', assetIdOrTitle: 'Teknisi Memeriksa Panel Surya Atap Gedung', date: subtractDays(getTodayDateString(), 18), category: 'Energi Surya & Teknisi Panel', downloads: 48, revenue: 39.0, assetType: 'Foto nyata' },
  { id: 'ast-402', assetIdOrTitle: 'Deretan Solar Panel Bersih Menghadap Matahari', date: subtractDays(getTodayDateString(), 14), category: 'Energi Surya & Teknisi Panel', downloads: 37, revenue: 30.5, assetType: 'Foto nyata' },
  { id: 'ast-403', assetIdOrTitle: 'Teknisi Wanita Helm Keselamatan Membawa Tablet', date: subtractDays(getTodayDateString(), 10), category: 'Energi Surya & Teknisi Panel', downloads: 42, revenue: 34.0, assetType: 'Foto nyata' },
  { id: 'ast-404', assetIdOrTitle: 'Inverter Tenaga Surya dan Kabel Industri', date: subtractDays(getTodayDateString(), 7), category: 'Energi Surya & Teknisi Panel', downloads: 24, revenue: 18.0, assetType: 'Foto nyata' },
  { id: 'ast-405', assetIdOrTitle: 'Pemasangan Braket Penyangga Solar Rooftop', date: subtractDays(getTodayDateString(), 3), category: 'Energi Surya & Teknisi Panel', downloads: 20, revenue: 15.0, assetType: 'Foto nyata' },

  // 5. Kategori: Minuman Herbal Jamu Sehat (Foto nyata) - paska riset kw-10 (25 hari lalu)
  { id: 'ast-501', assetIdOrTitle: 'Botol Kaca Jamu Kunyit Asam Dingin Segar', date: subtractDays(getTodayDateString(), 16), category: 'Minuman Herbal Jamu Sehat', downloads: 32, revenue: 24.0, assetType: 'Foto nyata' },
  { id: 'ast-502', assetIdOrTitle: 'Beras Kencur Hangat di Cangkir Keramik', date: subtractDays(getTodayDateString(), 13), category: 'Minuman Herbal Jamu Sehat', downloads: 27, revenue: 20.0, assetType: 'Foto nyata' },
  { id: 'ast-503', assetIdOrTitle: 'Rimpang Jahe Merah Kunyit Temulawak Segar', date: subtractDays(getTodayDateString(), 9), category: 'Minuman Herbal Jamu Sehat', downloads: 25, revenue: 18.5, assetType: 'Foto nyata' },
  { id: 'ast-504', assetIdOrTitle: 'Proses Penyaringan Minuman Herbal Tradisional', date: subtractDays(getTodayDateString(), 6), category: 'Minuman Herbal Jamu Sehat', downloads: 18, revenue: 13.0, assetType: 'Foto nyata' },
  { id: 'ast-505', assetIdOrTitle: 'Paket Minuman Sehat Rempah Alami Flat Lay', date: subtractDays(getTodayDateString(), 2), category: 'Minuman Herbal Jamu Sehat', downloads: 16, revenue: 11.0, assetType: 'Foto nyata' },

  // 6. Kategori: Kedai Kopi & Barista Lokal (Foto nyata) - paska riset kw-11 (22 hari lalu)
  { id: 'ast-601', assetIdOrTitle: 'Barista Menuangkan Susu Latte Art Angsa', date: subtractDays(getTodayDateString(), 15), category: 'Kedai Kopi & Barista Lokal', downloads: 14, revenue: 9.8, assetType: 'Foto nyata' },
  { id: 'ast-602', assetIdOrTitle: 'Biji Kopi Sangrai Robusta di Sendok Kayu', date: subtractDays(getTodayDateString(), 12), category: 'Kedai Kopi & Barista Lokal', downloads: 12, revenue: 8.0, assetType: 'Foto nyata' },
  { id: 'ast-603', assetIdOrTitle: 'Mesin Espresso Portafilter Ekstraksi Crema', date: subtractDays(getTodayDateString(), 8), category: 'Kedai Kopi & Barista Lokal', downloads: 11, revenue: 7.5, assetType: 'Foto nyata' },
  { id: 'ast-604', assetIdOrTitle: 'Suasana Kedai Kopi Meja Kayu Hangat', date: subtractDays(getTodayDateString(), 5), category: 'Kedai Kopi & Barista Lokal', downloads: 10, revenue: 6.5, assetType: 'Foto nyata' },
  { id: 'ast-605', assetIdOrTitle: 'Es Kopi Susu Gula Aren Gelas Takeaway', date: subtractDays(getTodayDateString(), 2), category: 'Kedai Kopi & Barista Lokal', downloads: 9, revenue: 5.5, assetType: 'Foto nyata' },

  // 7. Kategori: Wisuda & Sarjana Asia (Foto nyata) - paska riset kw-12 (24 hari lalu)
  { id: 'ast-701', assetIdOrTitle: 'Mahasiswi Asia Tersenyum Memegang Ijazah Wisuda', date: subtractDays(getTodayDateString(), 17), category: 'Wisuda & Sarjana Asia', downloads: 35, revenue: 26.0, assetType: 'Foto nyata' },
  { id: 'ast-702', assetIdOrTitle: 'Kelompok Mahasiswa Melempar Toga ke Udara', date: subtractDays(getTodayDateString(), 13), category: 'Wisuda & Sarjana Asia', downloads: 40, revenue: 31.0, assetType: 'Foto nyata' },
  { id: 'ast-703', assetIdOrTitle: 'Foto Keluarga Merayakan Wisuda Anak Pertama', date: subtractDays(getTodayDateString(), 9), category: 'Wisuda & Sarjana Asia', downloads: 26, revenue: 19.5, assetType: 'Foto nyata' },
  { id: 'ast-704', assetIdOrTitle: 'Detail Medali Kelulusan dan Selempang Cumlaude', date: subtractDays(getTodayDateString(), 5), category: 'Wisuda & Sarjana Asia', downloads: 22, revenue: 15.0, assetType: 'Foto nyata' },
  { id: 'ast-705', assetIdOrTitle: 'Buket Bunga Hadiah Wisuda Boneka Beruang', date: subtractDays(getTodayDateString(), 2), category: 'Wisuda & Sarjana Asia', downloads: 17, revenue: 12.0, assetType: 'Foto nyata' },

  // 8. Kategori: Ornamen Ramadan & Floral Islami (Ilustrasi AI-generated) - paska riset kw-1 (45 hari lalu)
  { id: 'ast-801', assetIdOrTitle: 'Spanduk Horizontal Ramadan Lentera Emas Arabesque', date: subtractDays(getTodayDateString(), 30), category: 'Ornamen Ramadan & Floral Islami', downloads: 72, revenue: 54.0, assetType: 'Ilustrasi AI-generated' },
  { id: 'ast-802', assetIdOrTitle: 'Pola Geometris Islami Vektor Latar Hijau Emerald', date: subtractDays(getTodayDateString(), 25), category: 'Ornamen Ramadan & Floral Islami', downloads: 64, revenue: 48.0, assetType: 'Ilustrasi AI-generated' },
  { id: 'ast-803', assetIdOrTitle: 'Kartu Ucapan Idul Fitri Ketupat Kaligrafi Floral', date: subtractDays(getTodayDateString(), 20), category: 'Ornamen Ramadan & Floral Islami', downloads: 58, revenue: 43.5, assetType: 'Ilustrasi AI-generated' },
  { id: 'ast-804', assetIdOrTitle: 'Siluet Masjid Kubah Saat Senja Bulan Sabit', date: subtractDays(getTodayDateString(), 15), category: 'Ornamen Ramadan & Floral Islami', downloads: 49, revenue: 36.0, assetType: 'Ilustrasi AI-generated' },
  { id: 'ast-805', assetIdOrTitle: 'Lentera Kaca Fanous Vintage Cahaya Lilin Lembut', date: subtractDays(getTodayDateString(), 10), category: 'Ornamen Ramadan & Floral Islami', downloads: 41, revenue: 30.5, assetType: 'Ilustrasi AI-generated' },

  // 9. Kategori: Karakter Kucing 3D Back to School (Ilustrasi AI-generated) - paska riset kw-6 (30 hari lalu)
  { id: 'ast-901', assetIdOrTitle: 'Render 3D Kucing Imut Membawa Ransel Sekolah', date: subtractDays(getTodayDateString(), 22), category: 'Karakter Kucing 3D Back to School', downloads: 55, revenue: 41.0, assetType: 'Ilustrasi AI-generated' },
  { id: 'ast-902', assetIdOrTitle: 'Anak Kucing Duduk di Tumpukan Buku Warna-Warni', date: subtractDays(getTodayDateString(), 18), category: 'Karakter Kucing 3D Back to School', downloads: 47, revenue: 35.0, assetType: 'Ilustrasi AI-generated' },
  { id: 'ast-903', assetIdOrTitle: 'Kucing Memakai Kacamata Bulat Menulis di Meja', date: subtractDays(getTodayDateString(), 14), category: 'Karakter Kucing 3D Back to School', downloads: 39, revenue: 29.0, assetType: 'Ilustrasi AI-generated' },
  { id: 'ast-904', assetIdOrTitle: 'Stiker Emotikon Kucing Lucu Belajar Matematika', date: subtractDays(getTodayDateString(), 10), category: 'Karakter Kucing 3D Back to School', downloads: 33, revenue: 24.5, assetType: 'Ilustrasi AI-generated' },
  { id: 'ast-905', assetIdOrTitle: 'Kucing Imut Menaiki Bus Sekolah Kuning Ceria', date: subtractDays(getTodayDateString(), 5), category: 'Karakter Kucing 3D Back to School', downloads: 28, revenue: 20.0, assetType: 'Ilustrasi AI-generated' },

  // 10. Kategori: Lambang Retro Kedai Kopi (Ilustrasi AI-generated) - paska riset kw-5 (32 hari lalu)
  { id: 'ast-1001', assetIdOrTitle: 'Logo Vintage Kedai Kopi Vektor Monokrom', date: subtractDays(getTodayDateString(), 24), category: 'Lambang Retro Kedai Kopi', downloads: 8, revenue: 5.6, assetType: 'Ilustrasi AI-generated' },
  { id: 'ast-1002', assetIdOrTitle: 'Stempel Lingkaran Roastery Cangkir Berasap', date: subtractDays(getTodayDateString(), 20), category: 'Lambang Retro Kedai Kopi', downloads: 7, revenue: 4.9, assetType: 'Ilustrasi AI-generated' },
  { id: 'ast-1003', assetIdOrTitle: 'Emblem Tipografi Coffee Addict Grunge Texture', date: subtractDays(getTodayDateString(), 15), category: 'Lambang Retro Kedai Kopi', downloads: 6, revenue: 4.2, assetType: 'Ilustrasi AI-generated' },
  { id: 'ast-1004', assetIdOrTitle: 'Ikon Cangkir Kopi Garis Minimalis Klasik', date: subtractDays(getTodayDateString(), 11), category: 'Lambang Retro Kedai Kopi', downloads: 5, revenue: 3.5, assetType: 'Ilustrasi AI-generated' },
  { id: 'ast-1005', assetIdOrTitle: 'Label Biji Kopi Arabika Vektor Retro 1980', date: subtractDays(getTodayDateString(), 6), category: 'Lambang Retro Kedai Kopi', downloads: 5, revenue: 3.5, assetType: 'Ilustrasi AI-generated' },

  // 11. Kategori: Bisnis Hologram & AI Asia (Foto AI-generated) - paska riset kw-3 (35 hari lalu)
  { id: 'ast-1101', assetIdOrTitle: 'Pebisnis Asia Interaksi Antarmuka Hologram 3D', date: subtractDays(getTodayDateString(), 26), category: 'Bisnis Hologram & AI Asia', downloads: 36, revenue: 28.0, assetType: 'Foto AI-generated' },
  { id: 'ast-1102', assetIdOrTitle: 'Wanita Karier Asia Rapat Virtual Metaverse', date: subtractDays(getTodayDateString(), 21), category: 'Bisnis Hologram & AI Asia', downloads: 31, revenue: 23.5, assetType: 'Foto AI-generated' },
  { id: 'ast-1103', assetIdOrTitle: 'Robot Humanoid Berjabat Tangan Eksekutif Finansial', date: subtractDays(getTodayDateString(), 16), category: 'Bisnis Hologram & AI Asia', downloads: 27, revenue: 20.0, assetType: 'Foto AI-generated' },
  { id: 'ast-1104', assetIdOrTitle: 'Analisis Grafik Data Saham Menyala di Udara', date: subtractDays(getTodayDateString(), 12), category: 'Bisnis Hologram & AI Asia', downloads: 24, revenue: 17.5, assetType: 'Foto AI-generated' },
  { id: 'ast-1105', assetIdOrTitle: 'Ruang Kerja Pintar Futuristik Pencakar Langit', date: subtractDays(getTodayDateString(), 7), category: 'Bisnis Hologram & AI Asia', downloads: 19, revenue: 14.0, assetType: 'Foto AI-generated' },

  // 12. Kategori: Cyberpunk Batik & Warrior (Foto AI-generated) - paska riset kw-7 (28 hari lalu)
  { id: 'ast-1201', assetIdOrTitle: 'Prajurit Masa Depan Zirah Neon Motif Batik Parang', date: subtractDays(getTodayDateString(), 20), category: 'Cyberpunk Batik & Warrior', downloads: 16, revenue: 12.0, assetType: 'Foto AI-generated' },
  { id: 'ast-1202', assetIdOrTitle: 'Topeng Wayang Cyberpunk Lampu LED Kota Gelap', date: subtractDays(getTodayDateString(), 16), category: 'Cyberpunk Batik & Warrior', downloads: 14, revenue: 10.5, assetType: 'Foto AI-generated' },
  { id: 'ast-1203', assetIdOrTitle: 'Pahlawan Wanita Sayap Cahaya Ornamen Tradisional', date: subtractDays(getTodayDateString(), 12), category: 'Cyberpunk Batik & Warrior', downloads: 13, revenue: 9.5, assetType: 'Foto AI-generated' },
  { id: 'ast-1204', assetIdOrTitle: 'Pedang Keris Energi Plasma Futuristik Hujan', date: subtractDays(getTodayDateString(), 8), category: 'Cyberpunk Batik & Warrior', downloads: 11, revenue: 8.0, assetType: 'Foto AI-generated' },
  { id: 'ast-1205', assetIdOrTitle: 'Kendaraan Terbang Ornamen Batik di Langit Malam', date: subtractDays(getTodayDateString(), 4), category: 'Cyberpunk Batik & Warrior', downloads: 9, revenue: 6.5, assetType: 'Foto AI-generated' },
];

/**
 * Pemetaan Awal Riset Kata Kunci ke Kategori Portofolio (12 Pasang untuk Kalibrasi Spearman)
 */
export const DEFAULT_CATEGORY_MATCHES: ResearchCategoryMatch[] = [
  { researchId: 'kw-1', categoryName: 'Ornamen Ramadan & Floral Islami', assetType: 'Ilustrasi AI-generated' },
  { researchId: 'kw-2', categoryName: 'Kuliner Tradisional Nusantara', assetType: 'Foto nyata' },
  { researchId: 'kw-3', categoryName: 'Bisnis Hologram & AI Asia', assetType: 'Foto AI-generated' },
  { researchId: 'kw-4', categoryName: 'Lanskap & Pertanian Bali', assetType: 'Foto nyata' },
  { researchId: 'kw-5', categoryName: 'Lambang Retro Kedai Kopi', assetType: 'Ilustrasi AI-generated' },
  { researchId: 'kw-6', categoryName: 'Karakter Kucing 3D Back to School', assetType: 'Ilustrasi AI-generated' },
  { researchId: 'kw-7', categoryName: 'Cyberpunk Batik & Warrior', assetType: 'Foto AI-generated' },
  { researchId: 'kw-8', categoryName: 'Tenun & Kerajinan Budaya Batik', assetType: 'Foto nyata' },
  { researchId: 'kw-9', categoryName: 'Energi Surya & Teknisi Panel', assetType: 'Foto nyata' },
  { researchId: 'kw-10', categoryName: 'Minuman Herbal Jamu Sehat', assetType: 'Foto nyata' },
  { researchId: 'kw-11', categoryName: 'Kedai Kopi & Barista Lokal', assetType: 'Foto nyata' },
  { researchId: 'kw-12', categoryName: 'Wisuda & Sarjana Asia', assetType: 'Foto nyata' },
];

// =========================================================================
// OPERASI PENYIMPANAN LOCALSTORAGE
// =========================================================================

export function loadKeywordsFromStorage(): KeywordEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.KEYWORDS);
    if (!raw) {
      saveKeywordsToStorage(DEFAULT_SAMPLE_KEYWORDS);
      return DEFAULT_SAMPLE_KEYWORDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_SAMPLE_KEYWORDS;
  } catch (err) {
    console.error('Galat membaca keywords:', err);
    return DEFAULT_SAMPLE_KEYWORDS;
  }
}

export function saveKeywordsToStorage(entries: KeywordEntry[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.KEYWORDS, JSON.stringify(entries));
    return true;
  } catch (err) {
    console.error('Galat menyimpan keywords:', err);
    return false;
  }
}

export function loadSettingsFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      demandWeight: typeof parsed.demandWeight === 'number' ? parsed.demandWeight : 0.5,
      supplyWeight: typeof parsed.supplyWeight === 'number' ? parsed.supplyWeight : 0.5,
      categoryThresholds: parsed.categoryThresholds || DEFAULT_SETTINGS.categoryThresholds,
      productionFactors: parsed.productionFactors || DEFAULT_SETTINGS.productionFactors,
      weightHistory: Array.isArray(parsed.weightHistory) ? parsed.weightHistory : DEFAULT_SETTINGS.weightHistory,
      saturationBenchmarks: parsed.saturationBenchmarks || DEFAULT_SATURATION_BENCHMARKS,
      benchmarkHistory: Array.isArray(parsed.benchmarkHistory) ? parsed.benchmarkHistory : [],
      groupWeights: parsed.groupWeights && typeof parsed.groupWeights === 'object' ? parsed.groupWeights : {},
    };
  } catch (err) {
    console.error('Galat membaca pengaturan:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettingsToStorage(settings: AppSettings): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.error('Galat menyimpan pengaturan:', err);
    return false;
  }
}

export function loadSeasonalMomentsFromStorage(): SeasonalMoment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SEASONAL);
    if (!raw) {
      saveSeasonalMomentsToStorage(DEFAULT_SEASONAL_MOMENTS);
      return DEFAULT_SEASONAL_MOMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_SEASONAL_MOMENTS;
  } catch (err) {
    console.error('Galat membaca kalender musiman:', err);
    return DEFAULT_SEASONAL_MOMENTS;
  }
}

export function saveSeasonalMomentsToStorage(moments: SeasonalMoment[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.SEASONAL, JSON.stringify(moments));
    return true;
  } catch (err) {
    console.error('Galat menyimpan kalender musiman:', err);
    return false;
  }
}

export function loadMyDataAssetsFromStorage(): MyDataAsset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MY_DATA);
    if (!raw) {
      saveMyDataAssetsToStorage(DEFAULT_SAMPLE_MY_DATA);
      return DEFAULT_SAMPLE_MY_DATA;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_SAMPLE_MY_DATA;
  } catch (err) {
    console.error('Galat membaca Data Saya:', err);
    return DEFAULT_SAMPLE_MY_DATA;
  }
}

export function saveMyDataAssetsToStorage(assets: MyDataAsset[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.MY_DATA, JSON.stringify(assets));
    return true;
  } catch (err) {
    console.error('Galat menyimpan Data Saya:', err);
    return false;
  }
}

export function clearMyDataAssetsFromStorage(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEYS.MY_DATA);
    localStorage.removeItem(STORAGE_KEYS.CATEGORY_MATCHES);
    return true;
  } catch (err) {
    console.error('Galat menghapus Data Saya:', err);
    return false;
  }
}

export function loadCategoryMatchesFromStorage(): ResearchCategoryMatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORY_MATCHES);
    if (!raw) {
      saveCategoryMatchesToStorage(DEFAULT_CATEGORY_MATCHES);
      return DEFAULT_CATEGORY_MATCHES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_CATEGORY_MATCHES;
  } catch (err) {
    console.error('Galat membaca pencocokan kategori:', err);
    return DEFAULT_CATEGORY_MATCHES;
  }
}

export function saveCategoryMatchesToStorage(matches: ResearchCategoryMatch[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORY_MATCHES, JSON.stringify(matches));
    return true;
  } catch (err) {
    console.error('Galat menyimpan pencocokan kategori:', err);
    return false;
  }
}

// =========================================================================
// FASE 4: PENYIMPANAN RENCANA PRODUKSI
// =========================================================================

export const DEFAULT_SAMPLE_PRODUCTION_PLAN: ProductionPlanItem[] = [
  {
    id: 'plan-1',
    titleOrKeyword: 'Spanduk Floral Geometris Lentera Ramadan',
    assetType: 'Ilustrasi AI-generated',
    platform: 'Adobe Stock',
    status: 'Produksi',
    opportunityScore: 82.0,
    seasonalFactor: 1.2,
    dataFactor: 1.2,
    priorityScore: 118.1,
    sourceType: 'riset',
    sourceKeywordId: 'kw-1',
    categoryName: 'Ornamen Ramadan & Floral Islami',
    seasonalMomentName: 'Bulan Suci Ramadan',
    notes: 'Jendela unggah ideal sedang aktif (120-60 hari sebelum puncak). Kategori Perbanyak.',
    createdAt: subtractDays(getTodayDateString(), 15),
    updatedAt: subtractDays(getTodayDateString(), 10),
  },
  {
    id: 'plan-2',
    titleOrKeyword: 'Lanskap Sawah Terasering Jatiluwih Bali',
    assetType: 'Foto nyata',
    platform: 'Adobe Stock',
    status: 'Riset',
    opportunityScore: 78.5,
    seasonalFactor: 1.0,
    dataFactor: 1.2,
    priorityScore: 94.2,
    sourceType: 'riset',
    sourceKeywordId: 'kw-4',
    categoryName: 'Lanskap & Pertanian Bali',
    notes: 'Kategori terbukti berkinerja tinggi di Data Saya. Siapkan sesi foto pencahayaan pagi.',
    createdAt: subtractDays(getTodayDateString(), 12),
    updatedAt: subtractDays(getTodayDateString(), 8),
  },
  {
    id: 'plan-3',
    titleOrKeyword: 'Prajurit Cyberpunk Batik Neon Futuristic',
    assetType: 'Foto AI-generated',
    platform: 'Freepik',
    status: 'Ide',
    opportunityScore: 68.0,
    seasonalFactor: 1.0,
    dataFactor: 1.0,
    priorityScore: 68.0,
    sourceType: 'ide_niche',
    notes: 'Ide niche AI bersumber. Celah pasokan rendah di Freepik.',
    createdAt: subtractDays(getTodayDateString(), 5),
    updatedAt: subtractDays(getTodayDateString(), 5),
  },
  {
    id: 'plan-4',
    titleOrKeyword: 'Teknisi Panel Surya Atap Gedung Ramah Lingkungan',
    assetType: 'Foto nyata',
    platform: 'Adobe Stock',
    status: 'Diunggah',
    opportunityScore: 75.0,
    seasonalFactor: 1.0,
    dataFactor: 1.2,
    priorityScore: 90.0,
    sourceType: 'riset',
    sourceKeywordId: 'kw-9',
    categoryName: 'Energi Surya & Teknisi Panel',
    uploadedDate: subtractDays(getTodayDateString(), 65), // > 60 days
    notes: 'Diunggah 65 hari lalu. Siap dievaluasi dengan unduhan riil di Data Saya.',
    createdAt: subtractDays(getTodayDateString(), 75),
    updatedAt: subtractDays(getTodayDateString(), 65),
  },
  {
    id: 'plan-5',
    titleOrKeyword: 'Botol Jamu Herbal Kunyit Asam Segar',
    assetType: 'Foto nyata',
    platform: 'Freepik',
    status: 'Diunggah',
    opportunityScore: 70.0,
    seasonalFactor: 1.0,
    dataFactor: 1.0,
    priorityScore: 70.0,
    sourceType: 'riset',
    sourceKeywordId: 'kw-10',
    categoryName: 'Minuman Herbal Jamu Sehat',
    uploadedDate: subtractDays(getTodayDateString(), 22),
    notes: 'Diunggah 22 hari lalu, masih dalam masa tunggu 60 hari untuk evaluasi.',
    createdAt: subtractDays(getTodayDateString(), 30),
    updatedAt: subtractDays(getTodayDateString(), 22),
  },
  {
    id: 'plan-6',
    titleOrKeyword: 'Foto Rendang Daging Piring Tradisional',
    assetType: 'Foto nyata',
    platform: 'Shutterstock',
    status: 'Dievaluasi',
    opportunityScore: 76.0,
    seasonalFactor: 1.0,
    dataFactor: 1.2,
    priorityScore: 91.2,
    sourceType: 'riset',
    sourceKeywordId: 'kw-2',
    categoryName: 'Kuliner Tradisional Nusantara',
    uploadedDate: subtractDays(getTodayDateString(), 85),
    notes: 'Evaluasi performa: Unduhan mencapai rata-rata 38 per aset di portofolio.',
    createdAt: subtractDays(getTodayDateString(), 90),
    updatedAt: subtractDays(getTodayDateString(), 20),
  },
];

export function loadProductionPlanFromStorage(): ProductionPlanItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTION_PLAN);
    if (!raw) {
      saveProductionPlanToStorage(DEFAULT_SAMPLE_PRODUCTION_PLAN);
      return DEFAULT_SAMPLE_PRODUCTION_PLAN;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_SAMPLE_PRODUCTION_PLAN;
  } catch (err) {
    console.error('Galat membaca rencana produksi:', err);
    return DEFAULT_SAMPLE_PRODUCTION_PLAN;
  }
}

export function saveProductionPlanToStorage(items: ProductionPlanItem[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTION_PLAN, JSON.stringify(items));
    return true;
  } catch (err) {
    console.error('Galat menyimpan rencana produksi:', err);
    return false;
  }
}

// =========================================================================
// EKSPOR & IMPOR LENGKAP SEMUA DATA APLIKASI (FASE 5A - SCHEMA_VERSION: 5)
// =========================================================================

export const CURRENT_SCHEMA_VERSION = 5;

export function exportFullAppJSON(
  keywords: KeywordEntry[],
  myDataAssets: MyDataAsset[],
  matches: ResearchCategoryMatch[],
  seasonalMoments: SeasonalMoment[],
  productionPlan: ProductionPlanItem[],
  settings: AppSettings
): string {
  const payload = {
    application: 'Microstock Research',
    phase: 5,
    schema_version: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    backupNotice: 'Data ini hanya tersimpan di browser lokal Anda. Simpan berkas ini di tempat aman untuk pencadangan berkala.',
    keywords: keywords.map((k) => ({
      ...k,
      sumber_data: k.sumber_data || 'manual',
      checkHistory: Array.isArray(k.checkHistory) ? k.checkHistory : [],
    })),
    myDataAssets,
    categoryMatches: matches,
    seasonalMoments,
    productionPlan,
    settings,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Validasi dan migrasi berkas cadangan JSON
 * Menolak berkas dengan format tidak dikenal atau schema_version di luar cakupan
 */
export function parseFullAppJSON(jsonText: string): {
  success: boolean;
  data?: {
    keywords?: KeywordEntry[];
    myDataAssets?: MyDataAsset[];
    categoryMatches?: ResearchCategoryMatch[];
    seasonalMoments?: SeasonalMoment[];
    productionPlan?: ProductionPlanItem[];
    settings?: AppSettings;
    migratedFromVersion?: number;
  };
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonText);
    if (typeof parsed !== 'object' || parsed === null) {
      return { success: false, error: 'Berkas bukan objek JSON yang valid.' };
    }

    // Validasi penanda aplikasi
    const isAppBackup = 
      parsed.application === 'Microstock Research' ||
      (Array.isArray(parsed.keywords) && typeof parsed.settings === 'object');

    if (!isAppBackup) {
      return { 
        success: false, 
        error: 'Berkas ditolak: Berkas ini bukan cadangan data Microstock Research yang sah.' 
      };
    }

    const version = typeof parsed.schema_version === 'number' ? parsed.schema_version : (parsed.phase || 1);

    // Tolak versi yang tidak dikenal di masa depan (> CURRENT_SCHEMA_VERSION)
    if (version > CURRENT_SCHEMA_VERSION) {
      return {
        success: false,
        error: `Berkas ditolak: Versi skema cadangan (v${version}) lebih baru dari versi aplikasi saat ini (v${CURRENT_SCHEMA_VERSION}). Harap perbarui aplikasi terlebih dahulu.`
      };
    }

    // Tolak jika versi kurang dari 1 atau tidak valid sama sekali
    if (version < 1) {
      return {
        success: false,
        error: 'Berkas ditolak: Format versi cadangan tidak dikenal atau rusak.'
      };
    }

    // Migrasi data lama ke schema_version 5 (hanya menambah default field baru jika belum ada tanpa menimpa nilai asli)
    const rawKeywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
    const migratedKeywords: KeywordEntry[] = rawKeywords.map((k: any) => ({
      ...k,
      sumber_data: k.sumber_data || 'manual',
      checkHistory: Array.isArray(k.checkHistory) ? k.checkHistory : [],
    }));

    const rawSettings = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : DEFAULT_SETTINGS;
    const migratedSettings: AppSettings = {
      demandWeight: typeof rawSettings.demandWeight === 'number' ? rawSettings.demandWeight : 0.5,
      supplyWeight: typeof rawSettings.supplyWeight === 'number' ? rawSettings.supplyWeight : 0.5,
      categoryThresholds: rawSettings.categoryThresholds || DEFAULT_SETTINGS.categoryThresholds,
      productionFactors: rawSettings.productionFactors || DEFAULT_PRODUCTION_FACTORS,
      weightHistory: Array.isArray(rawSettings.weightHistory) ? rawSettings.weightHistory : (DEFAULT_SETTINGS.weightHistory || []),
      saturationBenchmarks: rawSettings.saturationBenchmarks || DEFAULT_SATURATION_BENCHMARKS,
      benchmarkHistory: Array.isArray(rawSettings.benchmarkHistory) ? rawSettings.benchmarkHistory : [],
      groupWeights: rawSettings.groupWeights && typeof rawSettings.groupWeights === 'object' ? rawSettings.groupWeights : {},
    };

    // Jangan pernah menimpa dengan sampel jika backup tidak memilikinya; gunakan array yang ada atau kosong
    const rawProductionPlan: ProductionPlanItem[] = Array.isArray(parsed.productionPlan) 
      ? parsed.productionPlan 
      : [];

    return {
      success: true,
      data: {
        keywords: migratedKeywords,
        myDataAssets: Array.isArray(parsed.myDataAssets) ? parsed.myDataAssets : [],
        categoryMatches: Array.isArray(parsed.categoryMatches) ? parsed.categoryMatches : [],
        seasonalMoments: Array.isArray(parsed.seasonalMoments) ? parsed.seasonalMoments : [],
        productionPlan: rawProductionPlan,
        settings: migratedSettings,
        migratedFromVersion: version < CURRENT_SCHEMA_VERSION ? version : undefined,
      },
    };
  } catch (err: any) {
    return { success: false, error: `Gagal membaca format JSON: ${err.message || err}` };
  }
}

// Format CSV eksport untuk kata kunci (Fase 1 kompatibilitas)
export function exportKeywordsToCSV(entries: KeywordEntry[]): string {
  const headers = [
    'ID',
    'Platform',
    'Tipe Aset',
    'Kata Kunci',
    'Jumlah Hasil',
    'Tanggal Cek',
    'Skor Permintaan (1-5)',
    'Sumber Skor Permintaan',
    'ID Aset Teratas',
    'Sumber Data',
    'Catatan',
    'Dibuat Pada',
  ];

  const escapeCSV = (str: string | number | null | undefined): string => {
    if (str === null || str === undefined) return '';
    const s = String(str);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes(';')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = entries.map((e) => [
    escapeCSV(e.id),
    escapeCSV(e.platform),
    escapeCSV(e.assetType),
    escapeCSV(e.keyword),
    escapeCSV(e.searchResultCount),
    escapeCSV(e.checkDate),
    escapeCSV(e.demandScore ?? ''),
    escapeCSV(e.demandSource || ''),
    escapeCSV((e.topAssetIds || []).join('; ')),
    escapeCSV(e.sumber_data || 'manual'),
    escapeCSV(e.notes || ''),
    escapeCSV(e.createdAt),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Ekspor CSV untuk Rencana Produksi (Fase 4)
 */
export function exportProductionPlanToCSV(items: ProductionPlanItem[]): string {
  const headers = [
    'ID',
    'Judul / Kata Kunci',
    'Tipe Aset',
    'Platform',
    'Status',
    'Skor Peluang',
    'Faktor Musim',
    'Faktor Data',
    'Skor Prioritas',
    'Sumber Pembuatan',
    'Kategori Portofolio',
    'Momen Musiman',
    'Tanggal Unggah',
    'Catatan',
    'Dibuat Pada',
    'Diperbarui Pada',
  ];

  const escapeCSV = (str: string | number | null | undefined): string => {
    if (str === null || str === undefined) return '';
    const s = String(str);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes(';')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = items.map((item) => [
    escapeCSV(item.id),
    escapeCSV(item.titleOrKeyword),
    escapeCSV(item.assetType),
    escapeCSV(item.platform),
    escapeCSV(item.status),
    escapeCSV(item.opportunityScore),
    escapeCSV(item.seasonalFactor),
    escapeCSV(item.dataFactor),
    escapeCSV(item.priorityScore),
    escapeCSV(item.sourceType),
    escapeCSV(item.categoryName || '-'),
    escapeCSV(item.seasonalMomentName || '-'),
    escapeCSV(item.uploadedDate || '-'),
    escapeCSV(item.notes || ''),
    escapeCSV(item.createdAt),
    escapeCSV(item.updatedAt),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export function parseCSVToKeywords(csvText: string): { success: boolean; data?: KeywordEntry[]; error?: string } {
  try {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length <= 1) {
      return { success: false, error: 'Berkas CSV kosong atau hanya berisi baris tajuk.' };
    }

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if ((char === ',' || char === ';') && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    };

    const parsedEntries: KeywordEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 4) continue;

      const platform = (['Adobe Stock', 'Shutterstock', 'Freepik'].includes(cols[1]?.trim()) ? cols[1].trim() : 'Adobe Stock') as KeywordEntry['platform'];
      const assetType = (['Foto nyata', 'Foto AI-generated', 'Ilustrasi AI-generated'].includes(cols[2]?.trim()) ? cols[2].trim() : 'Foto nyata') as KeywordEntry['assetType'];
      const keyword = cols[3]?.trim();
      if (!keyword) continue;

      const searchResultCount = parseInt(cols[4]?.trim() || '0', 10) || 0;
      const checkDate = cols[5]?.trim() || getTodayDateString();
      const rawDemand = parseInt(cols[6]?.trim() || '', 10);
      const demandScore = !isNaN(rawDemand) && rawDemand >= 1 && rawDemand <= 5 ? rawDemand : null;
      const demandSource = cols[7]?.trim() || '';
      const topAssetIds = cols[8] ? cols[8].split(/;|,/).map((s) => s.trim()).filter(Boolean).slice(0, 10) : [];
      const notes = cols[9]?.trim() || '';

      parsedEntries.push({
        id: cols[0] && cols[0].length > 3 ? cols[0] : `kw-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        platform,
        assetType,
        keyword,
        searchResultCount,
        checkDate,
        demandScore,
        demandSource,
        topAssetIds,
        notes,
        createdAt: cols[10] || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (parsedEntries.length === 0) {
      return { success: false, error: 'Tidak ditemukan data valid yang dapat diimpor dari CSV.' };
    }

    return { success: true, data: parsedEntries };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Gagal membaca format CSV: ${message}` };
  }
}

export function triggerDownloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportKeywordsToJSON(entries: KeywordEntry[]): string {
  const data = JSON.stringify(entries, null, 2);
  triggerDownloadFile(data, `microstock_keywords_${getTodayDateString()}.json`, 'application/json');
  return data;
}

export function parseJSONToKeywords(jsonText: string): { success: boolean; data?: KeywordEntry[]; error?: string } {
  try {
    const parsed = JSON.parse(jsonText);
    const rawList = Array.isArray(parsed)
      ? parsed
      : (Array.isArray(parsed?.keywords) ? parsed.keywords : (Array.isArray(parsed?.data) ? parsed.data : null));

    if (!rawList || !Array.isArray(rawList)) {
      return { success: false, error: 'Format JSON tidak valid. Harus berupa array entri atau memiliki properti "keywords" / "data".' };
    }

    const validated: KeywordEntry[] = [];
    for (const item of rawList) {
      if (!item.keyword || typeof item.keyword !== 'string') continue;
      const platform = (['Adobe Stock', 'Shutterstock', 'Freepik'].includes(item.platform) ? item.platform : 'Adobe Stock') as KeywordEntry['platform'];
      const assetType = (['Foto nyata', 'Foto AI-generated', 'Ilustrasi AI-generated'].includes(item.assetType) ? item.assetType : 'Foto nyata') as KeywordEntry['assetType'];

      validated.push({
        id: item.id || `kw-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        platform,
        assetType,
        keyword: item.keyword.trim(),
        searchResultCount: typeof item.searchResultCount === 'number' ? Math.max(0, item.searchResultCount) : 0,
        checkDate: item.checkDate || getTodayDateString(),
        demandScore: typeof item.demandScore === 'number' && item.demandScore >= 1 && item.demandScore <= 5 ? item.demandScore : null,
        demandSource: typeof item.demandSource === 'string' ? item.demandSource : '',
        topAssetIds: Array.isArray(item.topAssetIds) ? item.topAssetIds.map(String).slice(0, 10) : [],
        notes: typeof item.notes === 'string' ? item.notes : '',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (validated.length === 0) {
      return { success: false, error: 'Tidak ditemukan data riset yang valid di dalam file JSON.' };
    }

    return { success: true, data: validated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Gagal mem-parsing berkas JSON: ${message}` };
  }
}
