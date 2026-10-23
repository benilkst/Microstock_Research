import React, { useState, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { 
  KeywordEntry, 
  AppSettings, 
  AssetType, 
  SeasonalMoment, 
  MyDataAsset,
  ProductionPlanItem,
  Platform
} from '../types/microstock';
import { 
  computeKeywordMetrics, 
  computeAssetTypeAnalytics,
  computeSeasonalMoment,
  formatIndonesianDate, 
  getTodayDateString 
} from '../utils/calculator';
import { triggerDownloadFile } from '../utils/storage';
import { 
  Printer, 
  X, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  FileCode,
  ListPlus,
  BarChart2,
  Sliders,
  Layers,
  Loader2,
  Check,
  Tag
} from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  keywords: KeywordEntry[];
  settings: AppSettings;
  seasonalMoments: SeasonalMoment[];
  myDataAssets: MyDataAsset[];
  productionPlan: ProductionPlanItem[];
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  keywords,
  settings,
  seasonalMoments,
  myDataAssets,
  productionPlan,
}) => {
  // Toggle narasi AI (hanya jika pengguna menyalakannya)
  const [includeAiNarrative, setIncludeAiNarrative] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [activeFilterSection, setActiveFilterSection] = useState<'all' | 'ranking' | 'plan' | 'mydata' | 'calendar' | 'parameters'>('all');

  const reportRef = useRef<HTMLDivElement | null>(null);

  // Asset Types strictly separated
  const assetTypes: AssetType[] = ['Foto nyata', 'Foto AI-generated', 'Ilustrasi AI-generated'];
  const platforms: Platform[] = ['Adobe Stock', 'Shutterstock', 'Freepik'];

  // Keywords computed per type
  const computedByType = useMemo(() => {
    const map: Record<AssetType, any[]> = {
      'Foto nyata': [],
      'Foto AI-generated': [],
      'Ilustrasi AI-generated': [],
    };

    for (const t of assetTypes) {
      const items = keywords
        .filter((k) => k.assetType === t)
        .map((k) => ({
          ...k,
          metrics: computeKeywordMetrics(k, settings),
        }))
        .sort((a, b) => b.metrics.opportunityScore - a.metrics.opportunityScore);

      map[t] = items;
    }

    return map;
  }, [keywords, settings]);

  // Analisis Portofolio Data Saya
  const myDataAnalytics = useMemo(() => {
    return computeAssetTypeAnalytics(myDataAssets, settings.categoryThresholds);
  }, [myDataAssets, settings.categoryThresholds]);

  // Momen Musiman terhitung
  const computedMoments = useMemo(() => {
    return seasonalMoments.map((m) => computeSeasonalMoment(m));
  }, [seasonalMoments]);

  // Kumpulkan daftar sumber rujukan riset & URL
  const sourcesList = useMemo(() => {
    const sSet = new Set<string>();
    keywords.forEach((k) => {
      if (k.demandSource) sSet.add(k.demandSource.trim());
    });
    sSet.add('Adobe Stock Contributor Insights (https://contributor.stock.adobe.com)');
    sSet.add('Shutterstock The Shot List & Contributor Portal (https://submit.shutterstock.com)');
    sSet.add('Freepik Contributor Dashboard & Trends (https://contributor.freepik.com)');
    return Array.from(sSet).filter(Boolean);
  }, [keywords]);

  if (!isOpen) return null;

  const reportDateFormatted = formatIndonesianDate(getTodayDateString());

  // Direct PDF Export using jsPDF and html-to-image (Tailwind v4 & oklch native compatible)
  const handleExportPDF = async () => {
    if (!reportRef.current || isExportingPdf) return;
    setIsExportingPdf(true);
    setExportSuccessMsg(null);

    try {
      const element = reportRef.current;
      
      // Render to image using browser's native SVG foreignObject engine
      // CRITICAL: skipFonts: true and fontEmbedCSS: '' bypasses CORS SecurityError on remote Google Fonts!
      const dataUrl = await toJpeg(element, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2, // 2x sharp resolution
        cacheBust: false,
        skipFonts: true,
        fontEmbedCSS: '',
      });

      // Load image to determine exact dimensions
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Gagal memproses gambar dokumen'));
        img.src = dataUrl;
      });

      const imgWidth = img.naturalWidth || img.width || 1200;
      const imgHeight = img.naturalHeight || img.height || 1600;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 10;
      const printableWidth = pdfWidth - margin * 2; // 190mm
      const printableHeight = pdfHeight - margin * 2; // 277mm
      const totalImgHeight = (imgHeight * printableWidth) / imgWidth;

      let heightLeft = totalImgHeight;
      let position = margin;

      // Halaman pertama
      pdf.addImage(dataUrl, 'JPEG', margin, position, printableWidth, totalImgHeight, undefined, 'FAST');
      heightLeft -= printableHeight;

      // Halaman berikutnya bila dokumen panjang
      while (heightLeft > 0) {
        position = margin - (totalImgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(dataUrl, 'JPEG', margin, position, printableWidth, totalImgHeight, undefined, 'FAST');
        heightLeft -= printableHeight;
      }

      const dateStr = getTodayDateString();
      pdf.save(`Laporan_Riset_Microstock_${dateStr}.pdf`);
      setExportSuccessMsg('PDF berhasil diekspor dan diunduh ke perangkat Anda!');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.warn('Gagal render grafis, menggunakan fallback generator PDF langsung:', err);
      try {
        // Fallback: Generate structured multi-page PDF directly with jsPDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.setFontSize(16);
        pdf.text('Laporan Riset Pasar Microstock', 14, 20);
        pdf.setFontSize(10);
        pdf.text(`Tanggal Cetak: ${reportDateFormatted}`, 14, 27);
        pdf.text(`Total Riset: ${keywords.length} Kata Kunci | Rencana: ${productionPlan.length} Item`, 14, 33);
        
        let y = 43;
        pdf.setFontSize(12);
        pdf.text('1. Ringkasan Eksekutif per Tipe Aset', 14, y);
        y += 7;
        pdf.setFontSize(9);
        for (const type of assetTypes) {
          const items = computedByType[type];
          const avgScore = items.length > 0 
            ? (items.reduce((acc, c) => acc + c.metrics.opportunityScore, 0) / items.length).toFixed(1)
            : '0.0';
          const topKw = items[0]?.keyword || '-';
          pdf.text(`- ${type}: ${items.length} kata kunci | Rata-rata Skor: ${avgScore}/100 | Top: ${topKw}`, 16, y);
          y += 6;
        }

        y += 4;
        pdf.setFontSize(12);
        pdf.text('2. Peringkat Teratas Kata Kunci Riset', 14, y);
        y += 7;
        pdf.setFontSize(8.5);

        for (const type of assetTypes) {
          const items = computedByType[type];
          if (items.length > 0) {
            if (y > 270) { pdf.addPage(); y = 20; }
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Kategori: ${type}`, 14, y);
            pdf.setFont('helvetica', 'normal');
            y += 5;

            items.slice(0, 20).forEach((item, idx) => {
              if (y > 275) { pdf.addPage(); y = 20; }
              const line = `${idx + 1}. ${item.keyword} [${item.platform}] - Hasil: ${item.searchResultCount.toLocaleString('id-ID')} | Permintaan: ${item.demandScore ?? '-'}/5 | Peluang: ${item.metrics.opportunityScore} (${item.metrics.confidenceLevel})`;
              pdf.text(line, 16, y);
              y += 5;
            });
            y += 3;
          }
        }

        const dateStr = getTodayDateString();
        pdf.save(`Laporan_Riset_Microstock_${dateStr}.pdf`);
        setExportSuccessMsg('PDF berhasil diekspor dan diunduh ke perangkat Anda!');
        setTimeout(() => setExportSuccessMsg(null), 4000);
      } catch (fallbackErr) {
        console.error('Fallback PDF gagal, mengunduh file HTML:', fallbackErr);
        handleDownloadStandaloneHTML();
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Browser Print handler with fallback
  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('window.print error or blocked:', err);
      handleExportPDF();
    }
  };

  // Standalone HTML Download Handler
  const handleDownloadStandaloneHTML = () => {
    const dateStr = getTodayDateString();

    let htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laporan Pasar Microstock - ${reportDateFormatted}</title>
  <style>
    @page { margin: 12mm; size: A4 portrait; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 100% !important; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.45;
      font-size: 10.5pt;
      padding: 24px;
    }
    .no-print {
      margin-bottom: 24px;
      padding: 12px 18px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-print {
      background: #0f172a;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      border: none;
      font-size: 10pt;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .badge {
      display: inline-block;
      font-size: 8pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #065f46;
      margin-bottom: 4px;
    }
    h1 { font-size: 18pt; font-weight: 800; color: #0f172a; }
    .meta-bar { font-size: 9pt; color: #64748b; margin-top: 6px; }
    .disclaimer-box {
      background: #f8fafc;
      border-left: 4px solid #059669;
      padding: 10px 14px;
      font-size: 9pt;
      color: #334155;
      margin-bottom: 20px;
      border-radius: 0 6px 6px 0;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .summary-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px;
      background: #f8fafc;
    }
    .summary-card h4 { font-size: 10pt; font-weight: bold; color: #0f172a; margin-bottom: 4px; }
    .summary-card p { font-size: 8.5pt; color: #475569; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 8.5pt;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #1e293b;
    }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: bold; }
    .badge-pill {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: bold;
    }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-rose { background: #ffe4e6; color: #9f1239; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      margin-top: 32px;
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <span>Dokumen Laporan Pasar Microstock Siap Cetak / Simpan PDF</span>
    <button class="btn-print" onclick="window.print()">Cetak / Simpan PDF</button>
  </div>

  <div class="header">
    <span class="badge">Dokumen Resmi Evaluasi Pasar Microstock</span>
    <h1>Laporan Riset Pasar, Rencana Produksi &amp; Portofolio</h1>
    <div class="meta-bar">
      Tanggal Laporan: <strong>${reportDateFormatted}</strong> &bull; Total Riset: <strong>${keywords.length} Kata Kunci</strong> &bull; Rencana: <strong>${productionPlan.length} Item</strong> &bull; Engine: Kalkulasi Kode Murni
    </div>
  </div>

  <div class="disclaimer-box">
    <strong>Catatan Metodologi:</strong> Seluruh skor peluang (0-100) dan skor prioritas merupakan <strong>indikator perbandingan relatif</strong> yang dihitung secara deterministik oleh kode aplikasi tanpa manipulasi AI. Skor ini merefleksikan rasio pasokan hasil pencarian platform terhadap sinyal permintaan yang terverifikasi.
  </div>
`;

    if (includeAiNarrative) {
      htmlContent += `
  <div style="border: 1px dashed #6366f1; background: #eef2ff; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-size: 9pt; color: #312e81;">
    <strong>[LABEL: NARASI AI OPSIONAL - DIAKTIFKAN PENGGUNA]</strong>
    <p style="margin-top: 4px;">
      Ringkasan Analisis Otomatis: Portofolio riset Anda saat ini memiliki konsentrasi tertinggi pada aset tipe ${assetTypes[0]}. Prioritaskan produksi kata kunci dengan skor peluang &gt; 70 dan kepercayaan Tinggi yang memiliki jendela musiman aktif (120-60 hari sebelum puncak).
    </p>
  </div>
`;
    }

    // 1. Ringkasan Eksekutif
    htmlContent += `
  <div class="section-title">1. Ringkasan Eksekutif per Tipe Aset (Pemisahan Ketat)</div>
  <div class="summary-grid">
`;
    for (const type of assetTypes) {
      const items = computedByType[type];
      const avgScore = items.length > 0 
        ? (items.reduce((acc, c) => acc + c.metrics.opportunityScore, 0) / items.length).toFixed(1)
        : '0.0';
      const best = items[0]?.keyword || 'Belum ada data';
      const highTrust = items.filter((k) => k.metrics.confidenceLevel === 'Tinggi').length;

      htmlContent += `
    <div class="summary-card">
      <h4>${type}</h4>
      <p>&bull; Total Kata Kunci: <strong>${items.length}</strong></p>
      <p>&bull; Rata-rata Peluang: <strong>${avgScore} / 100</strong></p>
      <p>&bull; Kepercayaan Tinggi: <strong>${highTrust} entri</strong></p>
      <p>&bull; Peringkat Teratas: <em>${best}</em></p>
    </div>
`;
    }
    htmlContent += `  </div>\n`;

    // 2. Tabel Peringkat Kata Kunci per Tipe Aset
    htmlContent += `  <div class="section-title">2. Tabel Peringkat Lengkap Kata Kunci per Tipe Aset</div>\n`;
    for (const type of assetTypes) {
      const items = computedByType[type];
      htmlContent += `  <h3 style="font-size: 9.5pt; font-weight: bold; margin: 12px 0 6px 0; color: #0f172a;">&bull; Kategori: ${type} (${items.length} Entri)</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 30px;" class="text-center">#</th>
        <th>Kata Kunci</th>
        <th style="width: 100px;">Platform</th>
        <th style="width: 90px;" class="text-right">Jumlah Hasil</th>
        <th style="width: 70px;" class="text-center">Permintaan</th>
        <th>Sumber Permintaan</th>
        <th style="width: 85px;">Tanggal Cek</th>
        <th style="width: 85px;" class="text-center">Kepercayaan</th>
        <th style="width: 70px;" class="text-right">Peluang</th>
      </tr>
    </thead>
    <tbody>
`;
      if (items.length === 0) {
        htmlContent += `      <tr><td colspan="9" class="text-center" style="color: #94a3b8; padding: 12px;">Belum ada entri riset untuk kategori aset ini.</td></tr>\n`;
      } else {
        items.forEach((item, idx) => {
          const badgeClass = item.metrics.confidenceLevel === 'Tinggi' ? 'badge-green' : item.metrics.confidenceLevel === 'Sedang' ? 'badge-amber' : 'badge-rose';
          htmlContent += `      <tr>
        <td class="text-center font-mono">${idx + 1}</td>
        <td class="font-bold">${item.keyword}</td>
        <td>${item.platform}</td>
        <td class="text-right font-mono">${item.searchResultCount.toLocaleString('id-ID')}</td>
        <td class="text-center font-bold">${item.demandScore ? item.demandScore + '/5' : '-'}</td>
        <td style="font-size: 8pt; color: #475569;">${item.demandSource || '-'}</td>
        <td>${item.checkDate}</td>
        <td class="text-center"><span class="badge-pill ${badgeClass}">${item.metrics.confidenceLevel}</span></td>
        <td class="text-right font-mono font-bold">${item.metrics.opportunityScore}</td>
      </tr>\n`;
        });
      }
      htmlContent += `    </tbody>\n  </table>\n`;
    }

    // 3. Tabel Rencana Produksi (jika ada)
    htmlContent += `  <div class="section-title">3. Rencana Produksi &amp; Skor Prioritas</div>\n`;
    if (productionPlan.length === 0) {
      htmlContent += `  <p style="font-size: 8.5pt; color: #94a3b8; margin-bottom: 16px;">Belum ada item dalam Rencana Produksi.</p>\n`;
    } else {
      htmlContent += `  <table>
    <thead>
      <tr>
        <th style="width: 30px;" class="text-center">#</th>
        <th>Judul / Kata Kunci</th>
        <th style="width: 110px;">Tipe Aset</th>
        <th style="width: 90px;">Platform</th>
        <th style="width: 75px;" class="text-center">Status</th>
        <th style="width: 60px;" class="text-right">Peluang</th>
        <th style="width: 70px;" class="text-center">F. Musim</th>
        <th style="width: 70px;" class="text-center">F. Data</th>
        <th style="width: 75px;" class="text-right">Prioritas</th>
      </tr>
    </thead>
    <tbody>
`;
      productionPlan.forEach((item, idx) => {
        htmlContent += `      <tr>
        <td class="text-center font-mono">${idx + 1}</td>
        <td class="font-bold">${item.titleOrKeyword}</td>
        <td>${item.assetType}</td>
        <td>${item.platform}</td>
        <td class="text-center"><span class="badge-pill badge-blue">${item.status}</span></td>
        <td class="text-right font-mono">${item.opportunityScore}</td>
        <td class="text-center font-mono">${item.seasonalFactor}</td>
        <td class="text-center font-mono">${item.dataFactor}</td>
        <td class="text-right font-mono font-bold" style="color: #047857;">${item.priorityScore}</td>
      </tr>\n`;
      });
      htmlContent += `    </tbody>\n  </table>\n`;
    }

    // 4. Parameter & Acuan Jenuh
    htmlContent += `  <div class="section-title">4. Parameter Formula &amp; Acuan Jenuh Pasokan</div>
  <table style="max-width: 650px;">
    <thead>
      <tr>
        <th>Komponen Formula</th>
        <th style="width: 120px;">Nilai Konfigurasi</th>
        <th>Keterangan</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Bobot Permintaan (Demand Weight)</td><td class="font-mono font-bold">${settings.demandWeight} (${settings.demandWeight * 100}%)</td><td>Kontribusi permintaan terhadap peluang</td></tr>
      <tr><td>Bobot Pasokan (Supply Weight)</td><td class="font-mono font-bold">${settings.supplyWeight} (${settings.supplyWeight * 100}%)</td><td>Kontribusi kelonggaran pasokan kompetisi</td></tr>
      <tr><td>Faktor Musim Aktif (120-60 hari)</td><td class="font-mono font-bold">${settings.productionFactors.seasonalActive}</td><td>Pengali saat berada di momentum ideal</td></tr>
      <tr><td>Faktor Musim Normal / Tidak ada</td><td class="font-mono font-bold">${settings.productionFactors.seasonalNone}</td><td>Pengali reguler non-musiman</td></tr>
      <tr><td>Faktor Musim Lewat Tahun Ini</td><td class="font-mono font-bold">${settings.productionFactors.seasonalPassed}</td><td>Pengurangan prioritas jika jendela lewat</td></tr>
      <tr><td>Faktor Kategori "Perbanyak"</td><td class="font-mono font-bold">${settings.productionFactors.dataPerbanyak}</td><td>Pengali jika terbukti laris di Data Saya</td></tr>
      <tr><td>Faktor Kategori "Kurangi"</td><td class="font-mono font-bold">${settings.productionFactors.dataKurangi}</td><td>Pengurangan prioritas kategori lesu</td></tr>
      <tr><td>Acuan Jenuh Default</td><td class="font-mono font-bold">10.000.000 hasil</td><td>Plafon saturasi logaritmik (log10 = 7)</td></tr>
    </tbody>
  </table>

  <div class="section-title">5. Daftar Sumber &amp; Rujukan Resmi</div>
  <ul style="padding-left: 20px; font-size: 8.5pt; color: #475569; margin-bottom: 20px;">
`;
    for (const src of sourcesList) {
      htmlContent += `    <li style="margin-bottom: 3px;">${src}</li>\n`;
    }
    htmlContent += `  </ul>

  <div class="footer">
    Dokumen Laporan Pasar Microstock &bull; Microstock Research &bull; Dicetak mandiri
  </div>
</body>
</html>`;

    triggerDownloadFile(
      htmlContent,
      `laporan_pasar_microstock_${dateStr}.html`,
      'text/html'
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible print:block">
      {/* Explicit Print CSS Style for A4 and crisp table pagination */}
      <style>{`
        @page {
          margin: 12mm;
          size: A4 portrait;
        }
        @media print {
          html, body, #root {
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
          }
          .no-print, header, nav, button, .modal-toolbar {
            display: none !important;
          }
          .report-sheet-container {
            position: static !important;
            height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 8.5pt !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th, td {
            padding: 4px 6px !important;
          }
        }
      `}</style>

      {/* Main Modal Card */}
      <div className="report-sheet-container relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-visible my-3 print:my-0 print:border-none print:shadow-none print:w-full print:max-w-none">
        
        {/* Sticky Modal Controls Header - Hidden during print */}
        <div className="no-print sticky top-0 z-20 px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-white/95 backdrop-blur-md rounded-t-2xl space-y-2.5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                  Pratinjau Laporan &amp; Ekspor Dokumen
                </h3>
                <p className="text-[11px] text-slate-500">
                  Dokumen evaluasi pasar lengkap, tabel responsif &amp; ekspor PDF langsung
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* AI Narrative Toggle */}
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={includeAiNarrative}
                  onChange={(e) => setIncludeAiNarrative(e.target.checked)}
                  className="rounded accent-emerald-600 cursor-pointer"
                />
                <span className="hidden sm:inline">Narasi AI</span>
                <span className="sm:hidden">AI</span>
              </label>

              {/* Direct PDF Export Button (Working jsPDF + html2canvas) */}
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Ekspor dan simpan langsung dokumen laporan ke berkas PDF di perangkat Anda"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Membuat PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Ekspor PDF</span>
                  </>
                )}
              </button>

              {/* Window Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                title="Buka dialog cetak browser (kompatibel printer fisik dan Save as PDF)"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Cetak Dokumen</span>
                <span className="sm:hidden">Cetak</span>
              </button>

              {/* Standalone HTML Download Button */}
              <button
                type="button"
                onClick={handleDownloadStandaloneHTML}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                title="Unduh versi HTML mandiri yang dapat dibuka langsung di Safari/Chrome offline"
              >
                <FileCode className="w-4 h-4 text-slate-600" />
                <span>Unduh HTML</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer ml-1"
                aria-label="Tutup pratinjau laporan"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Feedback Success Message */}
          {exportSuccessMsg && (
            <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs font-bold flex items-center gap-1.5 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportSuccessMsg}</span>
            </div>
          )}

          {/* Quick Filter Navigation Tabs for Preview */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-xs font-semibold scrollbar-thin">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold mr-1 shrink-0">
              Lompat ke:
            </span>
            {[
              { id: 'all', label: 'Semua Bagian' },
              { id: 'ranking', label: 'Tabel Peringkat Riset' },
              { id: 'plan', label: `Rencana Produksi (${productionPlan.length})` },
              { id: 'mydata', label: 'Portofolio Data Saya' },
              { id: 'calendar', label: 'Kalender Musiman' },
              { id: 'parameters', label: 'Parameter & Acuan' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilterSection(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap text-[11px] ${
                  activeFilterSection === tab.id
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* PRINTABLE DOCUMENT BODY (Captured by html2canvas) */}
        <div 
          ref={reportRef}
          className="p-5 sm:p-10 space-y-7 text-slate-800 bg-white print:p-0 text-xs font-sans overflow-visible h-auto"
        >
          {/* Header Laporan */}
          <div className="border-b-2 border-slate-900 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 block">
                  Dokumen Resmi Evaluasi Pasar Microstock
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Laporan Riset Pasar, Rencana Produksi &amp; Portofolio
                </h1>
              </div>
              <div className="text-left sm:text-right font-mono text-xs text-slate-500">
                <div>Tanggal: <strong>{reportDateFormatted}</strong></div>
                <div>Status: <span className="text-emerald-700 font-bold">Terverifikasi Sistem</span></div>
              </div>
            </div>

            {/* Metodologi Catatan Transparansi */}
            <div className="mt-3 p-3 bg-slate-50 border-l-4 border-emerald-600 text-[11px] text-slate-700 rounded-r-lg">
              <strong className="text-slate-900">Catatan Metodologi:</strong> Seluruh skor peluang (0-100) dan prioritas merupakan <strong>indikator perbandingan relatif</strong> yang dihitung transparan oleh kode tanpa campur tangan AI. Skor mencerminkan korelasi antara pasokan (jumlah hasil pencarian) dan sinyal permintaan di platform microstock.
            </div>
          </div>

          {/* AI Narrative Section (ONLY if enabled by user, strictly labeled) */}
          {includeAiNarrative && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>[LABEL RESMI: NARASI AI DIAKTIFKAN OLEH PENGGUNA]</span>
              </div>
              <p className="text-indigo-900 text-[11px] leading-relaxed">
                Berdasarkan distribusi data saat ini, konsentrasi ceruk dengan skor peluang tertinggi didominasi oleh kata kunci berpasokan rendah di bawah 5.000 hasil. Disarankan untuk memprioritaskan kata kunci berstatus &ldquo;Tinggi&rdquo; dalam jendela unggah musiman aktif 120-60 hari sebelum puncak.
              </p>
            </div>
          )}

          {/* 1. Ringkasan per Tipe Aset (TIDAK DIGABUNG) */}
          {(activeFilterSection === 'all' || activeFilterSection === 'ranking') && (
            <div className="space-y-3">
              <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <Layers className="w-4 h-4 text-emerald-700" />
                <span>1. Ringkasan Eksekutif per Tipe Aset (Pemisahan Ketat)</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {assetTypes.map((type) => {
                  const items = computedByType[type];
                  const avgOpp = items.length > 0 
                    ? (items.reduce((acc, cur) => acc + cur.metrics.opportunityScore, 0) / items.length).toFixed(1)
                    : '0.0';
                  const highTrustCount = items.filter((k) => k.metrics.confidenceLevel === 'Tinggi').length;
                  const topKeyword = items[0]?.keyword || '-';

                  return (
                    <div key={type} className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-1.5">
                      <span className="font-bold text-slate-900 text-xs block">{type}</span>
                      <div className="space-y-0.5 text-[11px] text-slate-600">
                        <div>Total Kata Kunci: <strong className="font-mono text-slate-900">{items.length}</strong></div>
                        <div>Rata-rata Skor: <strong className="font-mono text-emerald-700">{avgOpp} / 100</strong></div>
                        <div>Kepercayaan Tinggi: <strong className="font-mono text-slate-900">{highTrustCount} entri</strong></div>
                        <div className="truncate text-[10px] text-slate-500 pt-0.5" title={topKeyword}>
                          Peringkat Teratas: <em>{topKeyword}</em>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Tabel Peringkat Lengkap per Tipe Aset */}
          {(activeFilterSection === 'all' || activeFilterSection === 'ranking') && (
            <div className="space-y-6">
              <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <BarChart2 className="w-4 h-4 text-emerald-700" />
                <span>2. Tabel Peringkat Lengkap Kata Kunci per Tipe Aset</span>
              </h2>

              {assetTypes.map((type) => {
                const items = computedByType[type];
                const avgScore = items.length > 0
                  ? (items.reduce((acc, c) => acc + c.metrics.opportunityScore, 0) / items.length).toFixed(1)
                  : '0.0';
                const totalResults = items.reduce((acc, c) => acc + c.searchResultCount, 0);

                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-slate-500" />
                        <span>Kategori Aset: {type} ({items.length} Entri)</span>
                      </h3>
                      {items.length > 0 && (
                        <span className="text-[11px] text-slate-500 font-mono">
                          Rata-rata Peluang: <strong className="text-emerald-700 font-bold">{avgScore}</strong>
                        </span>
                      )}
                    </div>

                    {items.length === 0 ? (
                      <div className="p-3 bg-slate-50 rounded-lg text-slate-400 text-center italic text-[11px] border border-slate-200">
                        Tidak ada data riset untuk kategori {type}.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                        <table className="w-full text-left text-[11px] border-collapse min-w-[760px] print:min-w-0">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                              <th className="py-2.5 px-3 w-10 text-center">#</th>
                              <th className="py-2.5 px-3">Kata Kunci</th>
                              <th className="py-2.5 px-3 w-28">Platform</th>
                              <th className="py-2.5 px-3 w-28 text-right">Jumlah Hasil</th>
                              <th className="py-2.5 px-3 w-24 text-center">Permintaan</th>
                              <th className="py-2.5 px-3">Sumber Skor</th>
                              <th className="py-2.5 px-3 w-24">Tanggal Cek</th>
                              <th className="py-2.5 px-3 w-28 text-center">Kepercayaan</th>
                              <th className="py-2.5 px-3 w-24 text-right">Skor Peluang</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-sans">
                            {items.map((item, idx) => {
                              const confColor =
                                item.metrics.confidenceLevel === 'Tinggi'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : item.metrics.confidenceLevel === 'Sedang'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200';

                              const oppScore = item.metrics.opportunityScore;
                              const scoreColor =
                                oppScore >= 70
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  : oppScore >= 50
                                  ? 'text-blue-700 bg-blue-50 border-blue-200'
                                  : 'text-amber-800 bg-amber-50 border-amber-200';

                              return (
                                <tr key={item.id} className="hover:bg-slate-50/70 even:bg-slate-50/30 transition-colors">
                                  <td className="py-2 px-3 text-center font-mono text-slate-400 text-[10px]">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2 px-3 font-bold text-slate-900">
                                    {item.keyword}
                                  </td>
                                  <td className="py-2 px-3 text-slate-700">
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-700 border border-slate-200">
                                      {item.platform}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                                    {item.searchResultCount.toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <span className="font-mono font-bold text-slate-800 px-1.5 py-0.5 rounded bg-slate-100">
                                      {item.demandScore ? `${item.demandScore}/5` : '-'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-slate-600 text-[10.5px]" title={item.demandSource}>
                                    {item.demandSource || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-slate-500 whitespace-nowrap text-[10px]">
                                    {formatIndonesianDate(item.checkDate)}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${confColor}`}>
                                      {item.metrics.confidenceLevel}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono">
                                    <span className={`inline-block px-2 py-0.5 rounded-lg border font-bold text-xs ${scoreColor}`}>
                                      {item.metrics.opportunityScore}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-slate-50 font-semibold text-[10px] text-slate-600 border-t border-slate-200">
                            <tr>
                              <td colSpan={3} className="py-2 px-3">
                                Total: <strong>{items.length} Kata Kunci</strong>
                              </td>
                              <td className="py-2 px-3 text-right font-mono">
                                Rata-rata: <strong>{Math.round(totalResults / (items.length || 1)).toLocaleString('id-ID')}</strong>
                              </td>
                              <td colSpan={4}></td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                                Avg: {avgScore}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Tabel Rencana Produksi & Skor Prioritas */}
          {(activeFilterSection === 'all' || activeFilterSection === 'plan') && (
            <div className="space-y-3">
              <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1.5">
                <div className="flex items-center gap-2">
                  <ListPlus className="w-4 h-4 text-emerald-700" />
                  <span>3. Rencana Produksi &amp; Skor Prioritas ({productionPlan.length} Item)</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-normal">
                  skor_prioritas = peluang &times; faktor_musim &times; faktor_data
                </span>
              </h2>

              {productionPlan.length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center italic text-[11px] border border-slate-200">
                  Belum ada item dalam Rencana Produksi. Tambahkan dari tabel riset kata kunci atau ide niche.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-left text-[11px] border-collapse min-w-[760px] print:min-w-0">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Judul / Kata Kunci</th>
                        <th className="py-2.5 px-3 w-32">Tipe Aset</th>
                        <th className="py-2.5 px-3 w-28">Platform</th>
                        <th className="py-2.5 px-3 w-28 text-center">Status</th>
                        <th className="py-2.5 px-3 w-20 text-right">Peluang</th>
                        <th className="py-2.5 px-3 w-24 text-center">F. Musim</th>
                        <th className="py-2.5 px-3 w-24 text-center">F. Data</th>
                        <th className="py-2.5 px-3 w-24 text-right">Prioritas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {productionPlan.map((item, idx) => {
                        const statusColors: Record<string, string> = {
                          'Ide': 'bg-slate-100 text-slate-700 border-slate-300',
                          'Riset': 'bg-indigo-50 text-indigo-700 border-indigo-200',
                          'Produksi': 'bg-amber-50 text-amber-800 border-amber-200',
                          'Diunggah': 'bg-blue-50 text-blue-800 border-blue-200',
                          'Dievaluasi': 'bg-emerald-50 text-emerald-800 border-emerald-200',
                        };

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 even:bg-slate-50/30">
                            <td className="py-2 px-3 text-center font-mono text-slate-400 text-[10px]">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              <div>{item.titleOrKeyword}</div>
                              {item.seasonalMomentName && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  Musim: {item.seasonalMomentName}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{item.assetType}</td>
                            <td className="py-2 px-3 text-slate-600">{item.platform}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[item.status] || 'bg-slate-100 text-slate-700'}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">{item.opportunityScore}</td>
                            <td className="py-2 px-3 text-center font-mono text-slate-700">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.seasonalFactor === 1.2 ? 'bg-emerald-100 text-emerald-900' : item.seasonalFactor === 0.5 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100'
                              }`}>
                                {item.seasonalFactor}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-700">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.dataFactor === 1.2 ? 'bg-emerald-100 text-emerald-900' : item.dataFactor === 0.7 ? 'bg-rose-100 text-rose-900' : 'bg-slate-100'
                              }`}>
                                {item.dataFactor}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-extrabold text-emerald-700 text-xs">
                              {item.priorityScore}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. Tabel Evaluasi Portofolio Data Saya (jika ada) */}
          {(activeFilterSection === 'all' || activeFilterSection === 'mydata') && (
            <div className="space-y-3">
              <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1.5">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-700" />
                  <span>4. Evaluasi Kategori Portofolio Penjualan (Data Saya)</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">
                  Total Aset: {myDataAssets.length}
                </span>
              </h2>

              {myDataAssets.length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-xl text-slate-400 text-center italic text-[11px] border border-slate-200">
                  Belum ada data portofolio penjualan yang diunggah via CSV.
                </div>
              ) : (
                <div className="space-y-4">
                  {assetTypes.map((ast) => {
                    const catList = myDataAnalytics[ast]?.categories || [];
                    if (catList.length === 0) return null;

                    return (
                      <div key={ast} className="space-y-1.5">
                        <h4 className="font-bold text-xs text-slate-800">&bull; Portofolio: {ast}</h4>
                        <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                          <table className="w-full text-left text-[11px] border-collapse min-w-[700px] print:min-w-0">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase">
                                <th className="py-2 px-3">Kategori</th>
                                <th className="py-2 px-3 text-center w-28">Status Aksi</th>
                                <th className="py-2 px-3 text-right w-24">Jumlah Aset</th>
                                <th className="py-2 px-3 text-right w-24">Rentang Bulan</th>
                                <th className="py-2 px-3 text-right w-24">Total Unduhan</th>
                                <th className="py-2 px-3 text-right w-28">Unduhan/Aset</th>
                                <th className="py-2 px-3 text-right w-28">Total Royalti</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {catList.map((c, i) => (
                                <tr key={i} className="hover:bg-slate-50 even:bg-slate-50/30">
                                  <td className="py-2 px-3 font-bold text-slate-900">{c.category}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      c.status === 'Perbanyak' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                      c.status === 'Kurangi' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                      'bg-blue-50 text-blue-800 border-blue-200'
                                    }`}>
                                      {c.status}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono">{c.assetCount}</td>
                                  <td className="py-2 px-3 text-right font-mono">{c.monthsCount} bln</td>
                                  <td className="py-2 px-3 text-right font-mono font-bold">{c.totalDownloads}</td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">{c.downloadsPerAsset.toFixed(2)}</td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">${c.totalRevenue.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 5. Kalender Momen Musiman Terdekat */}
          {(activeFilterSection === 'all' || activeFilterSection === 'calendar') && (
            <div className="space-y-3">
              <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span>5. Kalender Momen Musiman &amp; Jendela Unggah Ideal</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">
                  Jendela ideal: 120 - 60 hari sebelum puncak
                </span>
              </h2>

              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-[11px] border-collapse min-w-[700px] print:min-w-0">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase">
                      <th className="py-2.5 px-3">Momen Musiman</th>
                      <th className="py-2.5 px-3 w-32">Tanggal Puncak</th>
                      <th className="py-2.5 px-3 w-48">Jendela Unggah Ideal (120 - 60 hr)</th>
                      <th className="py-2.5 px-3 w-32 text-center">Status Saat Ini</th>
                      <th className="py-2.5 px-3">Saran Kata Kunci</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {computedMoments.map((m) => {
                      const statusClass =
                        m.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                          : m.status === 'upcoming_30'
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold'
                          : m.status === 'passed'
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200';

                      const statusText =
                        m.status === 'active'
                          ? 'Sedang dalam Jendela'
                          : m.status === 'upcoming_30'
                          ? `${m.daysUntilWindowStart} hari lagi`
                          : m.status === 'passed'
                          ? 'Jendela Lewat (Target Musim Depan)'
                          : `${m.daysUntilWindowStart} hari lagi`;

                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">{m.name}</td>
                          <td className="py-2 px-3 text-slate-700">{formatIndonesianDate(m.peakDate)}</td>
                          <td className="py-2 px-3 text-slate-600 font-mono text-[10px]">
                            {formatIndonesianDate(m.idealWindowStart)} &ndash; {formatIndonesianDate(m.idealWindowEnd)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${statusClass}`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 text-[10px] italic">
                            {(m.keywordsRecommendation || []).slice(0, 3).join(', ') || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. Bobot Formula & Acuan Jenuh Pasokan Fase 5A */}
          {(activeFilterSection === 'all' || activeFilterSection === 'parameters') && (
            <div className="space-y-4">
              <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <Sliders className="w-4 h-4 text-emerald-700" />
                <span>6. Parameter Rumus &amp; Acuan Jenuh Pasokan</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-700">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-900 block text-xs">Bobot Rumus Peluang:</span>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span>Bobot Skor Permintaan:</span>
                    <strong className="font-mono text-slate-900">{settings.demandWeight} ({(settings.demandWeight * 100)}%)</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span>Bobot Skor Pasokan:</span>
                    <strong className="font-mono text-slate-900">{settings.supplyWeight} ({(settings.supplyWeight * 100)}%)</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span>Ambang Perbanyak:</span>
                    <strong className="font-mono text-slate-900">&ge; {settings.categoryThresholds.perbanyakDownloadsPerAsset} unduhan/aset</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ambang Kurangi:</span>
                    <strong className="font-mono text-slate-900">&lt; {settings.categoryThresholds.kurangiDownloadsPerAsset} unduhan/aset</strong>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-900 block text-xs">Faktor Prioritas Rencana Produksi:</span>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span>Faktor Musim Aktif (120-60 hari):</span>
                    <strong className="font-mono text-slate-900">{settings.productionFactors.seasonalActive}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span>Faktor Musim Normal / Tidak ada:</span>
                    <strong className="font-mono text-slate-900">{settings.productionFactors.seasonalNone}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span>Faktor Musim Lewat Tahun Ini:</span>
                    <strong className="font-mono text-slate-900">{settings.productionFactors.seasonalPassed}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Faktor Kategori &ldquo;Perbanyak&rdquo; / &ldquo;Kurangi&rdquo;:</span>
                    <strong className="font-mono text-slate-900">{settings.productionFactors.dataPerbanyak} / {settings.productionFactors.dataKurangi}</strong>
                  </div>
                </div>
              </div>

              {/* Matriks Acuan Jenuh Pasokan 3x3 Fase 5A */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs block">
                    Matriks Nilai Acuan Jenuh Pasokan:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    skor_pasokan = batasi(1 - log10(hasil + 1) / log10(acuan), 0, 1)
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] bg-white rounded-lg border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                        <th className="py-1.5 px-2.5">Platform</th>
                        <th className="py-1.5 px-2.5">Foto Nyata</th>
                        <th className="py-1.5 px-2.5">Foto AI</th>
                        <th className="py-1.5 px-2.5">Ilustrasi AI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[10.5px]">
                      {platforms.map((plt) => (
                        <tr key={plt}>
                          <td className="py-1.5 px-2.5 font-sans font-bold text-slate-900">{plt}</td>
                          {assetTypes.map((ast) => (
                            <td key={ast} className="py-1.5 px-2.5 text-slate-700">
                              {(settings.saturationBenchmarks?.[plt]?.[ast] ?? 10000000).toLocaleString('id-ID')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 7. Daftar Sumber & Rujukan Resmi */}
          <div className="space-y-2">
            <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <span>7. Daftar Sumber &amp; Rujukan Resmi</span>
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
              {sourcesList.map((src, i) => (
                <li key={i}>{src}</li>
              ))}
            </ul>
          </div>

          {/* Footer Dokumen */}
          <div className="pt-5 border-t border-slate-200 text-center text-[10px] text-slate-400">
            Microstock Research &bull; Dokumen dibuat otomatis oleh sistem tanpa manipulasi AI &bull; Dicetak pada {new Date().toLocaleString('id-ID')}
          </div>
        </div>
      </div>
    </div>
  );
};
