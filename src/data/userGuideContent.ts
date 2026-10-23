export interface GuideShortcut {
  label: string;
  action: 'overview' | 'dashboard' | 'plan' | 'mydata' | 'niche' | 'screenshot' | 'calendar' | 'history' | 'add_modal' | 'settings' | 'settings_formula' | 'settings_benchmarks' | 'settings_thresholds' | 'report';
  icon?: string;
}

export interface GuideSection {
  id: string;
  number: string;
  title: string;
  summary?: string;
  content: string;
  tags: string[];
  shortcuts?: GuideShortcut[];
}

export const USER_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'sec-1-mulai-cepat',
    number: '1',
    title: 'Mulai Cepat',
    summary: 'Lima langkah praktis untuk riset niche microstock pertamamu.',
    tags: ['mulai', 'panduan cepat', 'langkah awal', 'pemula'],
    shortcuts: [
      { label: 'Buka Riset & Peringkat', action: 'dashboard' },
      { label: 'Tambah Riset Baru', action: 'add_modal' },
      { label: 'Buka Kalender Musiman', action: 'calendar' },
      { label: 'Buka Rencana Produksi', action: 'plan' },
      { label: 'Buka Pengaturan & Backup', action: 'settings' },
    ],
    content: `Lima langkah untuk riset pertamamu:

1. Buka tab Riset & Peringkat lalu ketuk Tambah Riset.
2. Pilih platform dan tipe aset, lalu isi kata kunci. Buka situs platform, ketik kata kunci yang sama, lalu catat jumlah hasil pencarian yang tampil.
3. Isi skor permintaan 1 sampai 5 dan tulis sumbernya (misalnya tautan laporan tren atau hasil Ide Niche).
4. Simpan. Lihat skor peluang dan label kepercayaan di Peringkat.
5. Cek Kalender untuk momen musiman, masukkan kata kunci terbaik ke Rencana Produksi, dan lakukan backup JSON di Pengaturan.`,
  },
  {
    id: 'sec-2-tentang-aplikasi',
    number: '2',
    title: 'Tentang Aplikasi Ini',
    summary: 'Fungsi, prinsip kerja tanpa AI untuk perhitungan, dan batasan aplikasi.',
    tags: ['tentang', 'prinsip', 'fungsi', 'batasan'],
    content: `### Fungsi
Aplikasi membantu memilih niche aset microstock dengan membandingkan permintaan dengan pasokan, mengatur rencana produksi sesuai musim, dan mengevaluasi apakah riset kamu terbukti benar setelah aset terjual.

### Prinsip kerja
- Semua angka berasal dari input kamu dan dihitung oleh kode aplikasi, bukan oleh AI.
- AI hanya dipakai untuk dua hal: mengusulkan ide niche (dengan sumber) dan membaca screenshot. Hasilnya selalu kamu konfirmasi atau koreksi sebelum dihitung.
- Tipe aset (foto nyata, foto AI, ilustrasi AI) tidak pernah digabung dalam satu peringkat.

### Batas yang perlu kamu ketahui
- Skor adalah indikator relatif untuk membandingkan kata kunci satu sama lain, bukan prediksi penjualan.
- Aplikasi tidak mengambil data dari platform secara otomatis. Jumlah hasil dan data lain kamu masukkan sendiri.
- Aplikasi tidak menilai kualitas aset, kemungkinan lolos review, biaya produksi, atau kekuatan pesaing di halaman teratas.
- Data tersimpan hanya di browser perangkatmu. Tanpa backup, data bisa hilang.`,
  },
  {
    id: 'sec-3-konsep-dasar',
    number: '3',
    title: 'Konsep Dasar',
    summary: 'Definisi permintaan, pasokan, peluang, skor kepercayaan, dan pemisahan tipe aset.',
    tags: ['konsep', 'permintaan', 'pasokan', 'peluang', 'kepercayaan', 'snapshot', 'tipe aset'],
    shortcuts: [
      { label: 'Simulasi Formula Interaktif', action: 'dashboard' },
    ],
    content: `### Permintaan
Seberapa besar pembeli mencari topik tersebut. Kamu menilainya dengan skala 1 sampai 5 berdasarkan sinyal yang bisa ditelusuri, misalnya laporan tren platform, Google Trends, Pinterest Trends, atau kalender musiman.

### Pasokan
Seberapa banyak aset yang sudah tersedia untuk kata kunci itu. Aplikasi memakai jumlah hasil pencarian di platform sebagai ukurannya. Semakin sedikit hasil, semakin longgar pasarnya.

### Peluang
Gabungan permintaan yang tinggi dengan pasokan yang rendah, dihitung dengan rumus pada bagian 5. Nilainya 0 sampai 100.

### Kepercayaan
Seberapa kuat dasar data di balik sebuah skor: Tinggi, Sedang, atau Rendah. Skor dengan kepercayaan rendah sebaiknya dicek ulang sebelum dipakai.

### Snapshot
Jumlah hasil adalah potret pada satu tanggal. Angkanya berubah seiring waktu, karena itu tanggal cek selalu disimpan.

### Mengapa tipe aset dipisah
Pasokan dan pesaing foto nyata, foto AI, dan ilustrasi AI berbeda. Membandingkan jumlah hasilnya langsung akan menyesatkan, sehingga peringkat dan perhitungan dipisah per tipe.`,
  },
  {
    id: 'sec-4-cara-memakai',
    number: '4',
    title: 'Cara Memakai Tiap Menu',
    summary: 'Panduan lengkap cara kerja setiap menu: Riset, Form, Ide Niche, Screenshot, Kalender, Riwayat, Data Saya, Rencana, Evaluasi, Laporan, dan Pengaturan.',
    tags: ['menu', 'fitur', 'cara pakai', 'ringkasan', 'peringkat', 'form', 'ide niche', 'screenshot', 'kalender', 'data saya', 'rencana', 'laporan', 'pengaturan'],
    shortcuts: [
      { label: 'Buka Ringkasan', action: 'overview' },
      { label: 'Buka Riset & Peringkat', action: 'dashboard' },
      { label: 'Buka Rencana Produksi', action: 'plan' },
      { label: 'Buka Data Saya', action: 'mydata' },
      { label: 'Buka Ide Niche', action: 'niche' },
      { label: 'Buka Baca Screenshot', action: 'screenshot' },
      { label: 'Buka Kalender Musiman', action: 'calendar' },
      { label: 'Buka Riwayat & Tren', action: 'history' },
      { label: 'Buka Pengaturan', action: 'settings' },
    ],
    content: `### 4.1 Peringkat dan Ringkasan
Menampilkan kata kunci yang sudah kamu riset, diurutkan berdasarkan skor peluang, dengan pilihan tipe aset. Setiap kartu menampilkan jumlah hasil, skor permintaan beserta sumbernya, label kepercayaan, dan tanggal cek. Gunakan filter platform dan kepercayaan untuk menyaring. Ringkasan menampilkan lima kata kunci teratas per tipe aset, momen musiman yang aktif, status kategori penjualanmu, dan peringatan yang perlu ditindak.

### 4.2 Menambah dan Mengedit Riset
Isi tiap kolom sebagai berikut:

- **Platform:** tempat kamu mengecek jumlah hasil (Adobe Stock, Shutterstock, atau Freepik).
- **Tipe aset:** foto nyata, foto AI, atau ilustrasi AI. Pilih sesuai jenis aset yang akan kamu produksi.
- **Kata kunci:** tulis seperti yang akan diketik pembeli, biasanya dalam bahasa Inggris untuk pasar global. Gunakan frasa spesifik, misalnya subjek ditambah konteks dan gaya, bukan satu kata umum.
- **Jumlah hasil:** angka total hasil yang ditampilkan platform untuk kata kunci tersebut. Gunakan pengaturan pencarian dan filter yang sama setiap kali agar angka antar waktu bisa dibandingkan. Jika platform menyediakan filter untuk konten AI, pakai filter itu secara konsisten. Jika tidak, catat di kolom Catatan bahwa hasilnya mencakup campuran.
- **Skor permintaan (1 sampai 5):** nilai sinyal permintaan. Skala yang disarankan: 1 = tidak ada sinyal; 2 = sinyal lemah; 3 = sinyal sedang atau musiman kecil; 4 = sinyal kuat dari satu sumber kredibel atau beberapa sumber sedang; 5 = sinyal kuat dari beberapa sumber independen. Pakai skala yang sama setiap kali.
- **Sumber skor permintaan:** wajib diisi jika skor diisi. Tulis nama dan tautan sumbernya. Tanpa sumber, kepercayaan turun.
- **ID aset teratas (opsional):** nomor aset di halaman pertama, sebagai catatan perbandingan.
- **Tanggal cek:** terisi otomatis dengan hari ini. Ubah hanya jika kamu mengecek di tanggal lain.
- **Catatan:** konteks tambahan, misalnya filter yang dipakai.

Saat mengedit, perubahan jumlah hasil sebaiknya dilakukan lewat cek ulang agar riwayat lama tetap tersimpan.

### 4.3 Ide Niche
Gunakan untuk mencari kandidat niche baru.

1. Pilih tipe aset. Tema dan momen musiman bersifat opsional. Atur jumlah kandidat.
2. Ketuk Cari Ide Niche. Proses hanya berjalan saat tombol ditekan dan memakai kuota harian gratis.
3. Baca tiap kartu: kata kunci, alasan, sinyal tren, sudut kreatif (ruang kosong untuk teks, konteks, gaya), dan sumber rujukan.
4. Buka tautan sumber untuk memastikan klaim tren benar-benar ada di sana. Label "bersumber" hanya berarti ada rujukan, bukan bahwa klaimnya pasti benar.
5. Ketuk Kirim ke Form Riset untuk memindahkan ide ke formulir. Isian dari AI berlabel "belum dikonfirmasi" dan kepercayaan maksimalnya Sedang sampai kamu mengonfirmasi atau mengubahnya.

Hasil pencarian disimpan 24 jam untuk input yang sama. Jika momen musiman yang dipilih sudah melewati jendela unggah tahun ini, aplikasi menampilkan banner dan menyarankan target musim berikutnya.

### 4.4 Baca Screenshot
Gunakan untuk mengekstrak informasi dari halaman hasil pencarian platform.

1. Ambil screenshot halaman pertama hasil pencarian, dengan jumlah hasil ikut terlihat.
2. Hanya unggah halaman publik. Jangan unggah data penjualan atau akun.
3. Unggah gambar dan tunggu hasil bacaan.
4. Periksa formulir hasilnya. Kolom yang tidak terlihat sengaja dikosongkan, bukan ditebak. Koreksi apa pun yang salah baca.
5. Ketuk Konfirmasi untuk menyimpan, lalu lanjutkan ke formulir riset.

Hasil bacaan AI bisa salah. Angka jumlah hasil selalu cocokkan dengan layar aslimu sebelum dikonfirmasi.

### 4.5 Kalender
Berisi momen musiman (misalnya Ramadan, Lebaran, Natal, Tahun Baru, Back to School, Black Friday). Kamu mengisi tanggal puncak tiap momen. Aplikasi menghitung jendela unggah ideal, yaitu 120 sampai 60 hari sebelum puncak. Tanggal momen berbasis kalender hijriah bergeser tiap tahun, jadi isi dan verifikasi tanggalnya sendiri. Momen yang sedang berada di jendela atau masuk jendela dalam 30 hari ditandai di Ringkasan. Momen yang jendelanya sudah lewat ditandai "target musim berikutnya".

### 4.6 Riwayat
Menyimpan setiap snapshot jumlah hasil per kata kunci dan menampilkannya sebagai grafik garis. Jumlah hasil yang naik berarti pasokan bertambah dan peluang cenderung mengecil. Gunakan grafik ini untuk melihat apakah sebuah niche mulai jenuh. Riwayat tidak dihapus saat kamu melakukan cek ulang.

### 4.7 Data Saya (CSV Penjualan)
Memasukkan data penjualanmu untuk melihat kategori mana yang terbukti laku. Data diproses di browser dan tidak dikirim ke mana pun.

1. Siapkan CSV maksimal 5 MB. Minimal ada kolom tanggal dan jumlah unduhan. Kolom ID aset, judul, kategori atau kata kunci, dan pendapatan bersifat pelengkap. Format ekspor berbeda tiap platform; jika perlu, rapikan dulu di spreadsheet.
2. Unggah file, lalu petakan kolom CSV ke bidang yang tersedia di layar pemetaan.
3. Pilih tipe aset secara manual jika CSV tidak punya kolomnya.
4. Cek pratinjau lima baris dan daftar baris yang ditolak beserta alasannya (tanggal tidak valid, unduhan bukan angka, dan sebagainya). Duplikat persis dibuang otomatis.
5. Simpan. Aplikasi menghitung unduhan, pendapatan, jumlah aset aktif, unduhan per aset, dan tren bulanan per tipe aset.

Status tiap kategori:
- **Perbanyak:** performa kuat dibanding kategori lain.
- **Pertahankan:** performa sedang.
- **Kurangi:** performa lemah.
- **Data belum cukup:** kurang dari 5 aset atau kurang dari 2 bulan data (ambang bisa diubah di Pengaturan).

### 4.8 Rencana Produksi
Daftar niche yang akan atau sedang kamu kerjakan.

- Buat item dari entri riset atau ide niche dengan tombol Masukkan ke Rencana.
- Status: Ide, Riset, Produksi, Diunggah, Dievaluasi. Kamu memindahkannya secara manual.
- Setiap item bisa dikaitkan dengan momen dari Kalender.
- **Skor prioritas** = peluang × faktor musim × faktor data. Skor ini dipakai untuk mengurutkan, bukan skala 0 sampai 100.

| Faktor | Nilai | Kondisi |
|---|---|---|
| Musim | 1,2 | Hari ini berada di jendela unggah momen terkait |
| Musim | 1,0 | Jendela belum dibuka atau tidak ada momen terkait |
| Musim | 0,5 | Jendela tahun ini sudah lewat |
| Data | 1,2 | Kategori berstatus Perbanyak |
| Data | 1,0 | Pertahankan atau data belum cukup |
| Data | 0,7 | Kategori berstatus Kurangi |

Contoh: peluang 71,8 dengan faktor musim 1,2 dan faktor data 1,0 menghasilkan prioritas 86,2. Peluang yang sama dengan momen yang sudah lewat (0,5) menghasilkan 35,9.

Saat status diubah ke Diunggah, tanggalnya dicatat. Setelah 60 hari, item muncul di daftar Siap Dievaluasi.

### 4.9 Evaluasi dan Kalibrasi
Bagian ini menjawab pertanyaan: apakah skor riset saya benar-benar memprediksi penjualan?

- **Evaluasi riset:** membandingkan skor peluang saat riset dengan unduhan per aset 60 hari setelah unggah. Hanya aset yang diunggah setelah tanggal cek yang dihitung.
- **Kalibrasi bobot:** setelah minimal 10 pasangan entri riset dan kategori penjualan, aplikasi menghitung korelasi Spearman dan menyarankan bobot permintaan dan pasokan. Saran hanya berlaku jika kamu menekan Terapkan. Bobot lama tersimpan.
- Sampel kecil menghasilkan hasil yang berisik. Perlakukan sebagai petunjuk arah, bukan kepastian.

### 4.10 Laporan
Tombol Buat Laporan menyusun ringkasan per tipe aset, tabel peringkat, bobot yang dipakai, daftar sumber, dan catatan bahwa skor adalah indikator relatif. Gunakan Unduh Laporan (HTML) lalu buka file itu di Safari. Untuk membuat PDF di iPhone, pilih Bagikan, lalu Cetak, kemudian cubit (pinch out) pratinjau untuk mendapatkan PDF yang bisa disimpan. Ekspor CSV tersedia untuk tabel peringkat dan Rencana Produksi.

### 4.11 Pengaturan
- **Bobot skor:** bobot permintaan dan pasokan (default 0,5 dan 0,5, berjumlah 1).
- **Acuan jenuh:** jumlah hasil yang dianggap sangat jenuh per platform dan tipe aset (default 10.000.000). Menu Ukur Acuan membantu menyesuaikannya.
- **Ambang status** kategori penjualan dan **faktor** prioritas.
- **Tes Rumus:** pemeriksaan otomatis bahwa perhitungan masih benar.
- **Backup dan Impor:** lihat bagian 7.`,
  },
  {
    id: 'sec-5-cara-membaca-skor',
    number: '5',
    title: 'Cara Membaca Skor',
    summary: 'Rumus matematis peluang, skor pasokan logaritmik, contoh kalkulasi, penafsiran, dan evaluasi kepercayaan.',
    tags: ['rumus', 'skor', 'peluang', 'pasokan', 'permintaan', 'kepercayaan', 'acuan jenuh'],
    shortcuts: [
      { label: 'Buka Tes Rumus di Pengaturan', action: 'settings_formula' },
      { label: 'Buka Pengaturan Acuan Jenuh', action: 'settings_benchmarks' },
    ],
    content: `### Rumus
\`\`\`
skor_pasokan = batasi(1 - log10(jumlah_hasil + 1) / log10(acuan_jenuh), 0, 1)
skor_permintaan = skor_permintaan_1_5 / 5
peluang = 100 × (bobot_permintaan × skor_permintaan + bobot_pasokan × skor_pasokan)
\`\`\`
Dengan bobot default 0,5 dan 0,5 serta acuan jenuh 10.000.000.

### Contoh perhitungan
Kata kunci dengan 8.918 hasil dan permintaan 5 dari 5:
- skor_pasokan = 1 − log10(8.919) ÷ 7 = 0,436
- skor_permintaan = 5 ÷ 5 = 1
- peluang = 100 × (0,5 × 1 + 0,5 × 0,436) = 71,8

Kata kunci dengan 420 hasil dan permintaan 4 dari 5: skor_pasokan 0,625 dan peluang 71,3.

### Cara menafsirkan
- Skor 70 ke atas dikelompokkan sebagai peluang tinggi pada dashboard.
- Selisih kecil (misalnya 71,8 dan 70,8) tidak bermakna. Anggap setara.
- Skala logaritmik membuat selisih antara 100 dan 1.000 hasil lebih berpengaruh daripada selisih antara 1.000.000 dan 1.100.000.
- Skor sangat bergantung pada skor permintaan yang kamu isi. Periksa sumbernya sebelum memercayai peringkat.

### Skor kepercayaan
- **Tinggi:** permintaan, sumber, dan jumlah hasil terisi, dan tanggal cek paling lama 14 hari.
- **Sedang:** salah satu syarat tidak terpenuhi, atau isian berasal dari AI yang belum dikonfirmasi.
- **Rendah:** lebih dari satu syarat tidak terpenuhi.

### Kapan skor bisa menyesatkan
- Jumlah hasil dari filter atau pencarian yang berbeda-beda.
- Kata kunci sangat spesifik yang memang tidak dicari siapa pun, sehingga pasokannya rendah karena permintaannya nol. Skor permintaan harus jujur mencerminkannya.
- Data yang sudah lama tidak dicek.`,
  },
  {
    id: 'sec-6-alur-kerja',
    number: '6',
    title: 'Alur Kerja yang Disarankan',
    summary: 'Panduan alur riset niche baru, rutinitas mingguan cek ulang, rutinitas bulanan CSV, dan uji ke depan 60 hari.',
    tags: ['alur kerja', 'rutinitas', 'mingguan', 'bulanan', 'antrean cek', '60 hari'],
    shortcuts: [
      { label: 'Buka Ide Niche', action: 'niche' },
      { label: 'Buka Rencana Produksi', action: 'plan' },
      { label: 'Buka Data Saya', action: 'mydata' },
    ],
    content: `### Riset niche baru
1. Jalankan Ide Niche atau pilih momen dari Kalender.
2. Kirim kandidat menarik ke Form Riset.
3. Cek jumlah hasil di platform, isi skor permintaan, dan simpan sumbernya.
4. Jika perlu, unggah screenshot untuk melihat dominasi kontributor dan celah di halaman pertama.
5. Masukkan niche berskor tinggi ke Rencana Produksi.

### Rutinitas mingguan
1. Selesaikan antrean cek ulang untuk entri yang lebih dari 14 hari.
2. Tinjau momen musiman yang jendelanya terbuka.
3. Perbarui status Rencana Produksi.

### Rutinitas bulanan
1. Unggah CSV penjualan terbaru di Data Saya.
2. Tinjau status kategori dan Siap Dievaluasi.
3. Lakukan backup JSON.

### Uji ke depan (60 hari)
Riset 15 sampai 20 niche, produksi aset dari niche berskor tinggi dan beberapa dari niche berskor rendah sebagai pembanding, lalu unggah dan tunggu 60 hari. Bandingkan hasilnya di Evaluasi. Jika skor tinggi tidak lebih unggul, tinjau sumber permintaan dan bobot, bukan hanya rumusnya.`,
  },
  {
    id: 'sec-7-data-backup-privasi',
    number: '7',
    title: 'Data, Backup, dan Privasi',
    summary: 'Penyimpanan lokal browser, prosedur ekspor/impor JSON, dan perlindungan privasi data penjualan.',
    tags: ['backup', 'impor', 'ekspor', 'json', 'privasi', 'keamanan', 'localstorage'],
    shortcuts: [
      { label: 'Buka Pengaturan & Backup JSON', action: 'settings' },
    ],
    content: `- Semua data tersimpan di browser perangkat ini. Menghapus data situs, berganti perangkat, atau berganti alamat aplikasi dapat menghilangkan data.
- **Backup:** ekspor JSON dari Pengaturan secara berkala, minimal tiap 14 hari, dan simpan filenya di tempat aman di luar browser.
- **Impor:** gunakan file JSON atau tempel isi JSON. Aplikasi menampilkan ringkasan dan menawarkan Gabung atau Timpa semua sebelum menyimpan.
- **Privasi AI:** Ide Niche dan Baca Screenshot memakai Gemini. Pada free tier, data yang dikirim dapat dipakai Google untuk meningkatkan produknya. Jangan kirim data penjualan atau data pribadi. Insight AI, jika dipakai, hanya mengirim angka ringkasan dan menampilkan isi kiriman sebelum dikirim.
- File CSV penjualan diproses di perangkatmu dan tidak diunggah.`,
  },
  {
    id: 'sec-8-pemecahan-masalah',
    number: '8',
    title: 'Pemecahan Masalah',
    summary: 'Tabel solusi lengkap untuk 11 kendala umum dalam penggunaan aplikasi.',
    tags: ['troubleshooting', 'masalah', 'solusi', 'error', 'bantuan'],
    shortcuts: [
      { label: 'Buka Pengaturan & Tes Rumus', action: 'settings_formula' },
    ],
    content: `| Masalah | Penyebab dan solusi |
|---|---|
| Skor entri lama berubah | Periksa bobot dan acuan jenuh di Pengaturan, lalu jalankan Tes Rumus. Jika Tes Rumus lulus, periksa apakah jumlah hasil atau skor permintaan entri berubah. |
| Badge Perlu cek ulang tidak muncul | Pastikan tanggal cek entri lebih dari 14 hari. Ubah tanggal di form Edit untuk menguji. |
| Impor JSON gagal | Gunakan opsi Tempel JSON. Pastikan file berasal dari ekspor aplikasi ini dan versinya dikenali. |
| Ide Niche gagal atau kosong | Mungkin kuota harian atau batas laju tercapai. Coba lagi nanti. Hasil input yang sama disimpan 24 jam. |
| Hasil bacaan screenshot salah | Koreksi di formulir sebelum konfirmasi. Gunakan screenshot yang utuh, tajam, dan memuat jumlah hasil. |
| Baris CSV ditolak | Baca alasannya di daftar penolakan. Penyebab umum: tanggal tidak valid atau kosong, unduhan bukan angka. |
| Status kategori Data belum cukup | Jumlah aset atau bulan data di bawah ambang. Tambahkan data atau ubah ambang di Pengaturan. |
| Kalibrasi menolak berjalan | Perlu minimal 10 pasangan entri riset dan kategori penjualan per grup. |
| Faktor musim tetap 1,0 | Hubungkan item Rencana dengan momen di Kalender dan pastikan tanggal puncak momen terisi. |
| Laporan terpotong saat dicetak | Gunakan Unduh Laporan (HTML), buka di Safari, lalu cetak dari sana. |
| Data hilang | Impor backup JSON terakhir. Karena itu backup berkala penting. |`,
  },
  {
    id: 'sec-9-glosarium',
    number: '9',
    title: 'Glosarium',
    summary: 'Daftar istilah penting dalam microstock research: Acuan jenuh, Backtest, Grounding, dll.',
    tags: ['glosarium', 'istilah', 'kamus', 'definisi'],
    content: `- **Acuan jenuh:** jumlah hasil yang dianggap sangat padat sehingga skor pasokan menjadi 0.
- **Backtest/Evaluasi:** membandingkan skor riset dengan hasil penjualan sebenarnya.
- **Grounding:** AI mencari di web dan menyertakan sumber rujukan.
- **Indikator relatif:** angka yang berguna untuk membandingkan, bukan nilai mutlak.
- **Kalibrasi:** menyesuaikan bobot skor berdasarkan data penjualan sendiri.
- **Niche:** segmen topik spesifik, biasanya gabungan subjek, konteks, dan gaya.
- **Pasokan:** jumlah aset yang sudah tersedia untuk kata kunci tertentu.
- **Snapshot:** angka pada satu tanggal tertentu.
- **Spearman:** ukuran apakah dua peringkat bergerak searah, tidak peduli besar selisihnya.
- **Tipe aset:** foto nyata, foto AI, atau ilustrasi AI.`,
  },
  {
    id: 'sec-10-catatan-platform',
    number: '10',
    title: 'Catatan Platform dan Kepatuhan',
    summary: 'Etika riset tanpa scraping dan aturan kontributor Adobe Stock, Shutterstock, Freepik.',
    tags: ['kepatuhan', 'kebijakan', 'platform', 'adobe stock', 'shutterstock', 'freepik', 'legalitas'],
    content: `- Aplikasi tidak melakukan scraping dan tidak memakai API platform. Semua data dari platform kamu masukkan sendiri.
- Aturan kontributor, termasuk pelabelan konten buatan AI, kebutuhan model release dan property release, serta kriteria review, berbeda tiap platform dan bisa berubah. Baca panduan kontributor terbaru platform sebelum produksi massal. Misalnya, Adobe Stock mewajibkan konten buatan AI diberi label sebagai dibuat dengan alat generatif AI.
- Skor yang tinggi bukan jaminan aset diterima atau terjual. Kualitas teknis, orisinalitas, dan kata kunci yang baik tetap menentukan.`,
  },
];
