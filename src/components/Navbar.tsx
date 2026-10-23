import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  TrendingUp, 
  Settings, 
  Plus, 
  Sparkles, 
  Camera, 
  Menu, 
  X,
  BarChart2,
  ListPlus,
  FileText,
  Layers,
  Home,
  RotateCw,
  BookOpen
} from 'lucide-react';

export type ActiveTab = 'overview' | 'dashboard' | 'plan' | 'mydata' | 'niche' | 'screenshot' | 'calendar' | 'history';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onOpenReportModal?: () => void;
  onOpenRecheckQueue?: () => void;
  staleRecheckCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddModal,
  onOpenSettings,
  onOpenGuide,
  onOpenReportModal,
  onOpenRecheckQueue,
  staleRecheckCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileTab = (tab: ActiveTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop / Tablet Header */}
      <header 
        className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => onSelectTab('overview')}
                className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xs tracking-tighter cursor-pointer hover:bg-slate-800 transition-colors"
                title="Menuju Ringkasan Halaman Utama"
              >
                MR
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                    Microstock Research
                  </h1>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Ringkasan &middot; Riset Pasar &middot; Rencana Produksi &middot; Data Saya &middot; Laporan Cetak
                </p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => onSelectTab('overview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Home className="w-4 h-4 text-emerald-600" />
                Ringkasan
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4 text-slate-600" />
                Riset &amp; Peringkat
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('plan')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'plan'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListPlus className="w-4 h-4 text-indigo-600" />
                Rencana Produksi
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('mydata')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'mydata'
                    ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                Data Saya
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('niche')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'niche'
                    ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                Ide Niche
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('screenshot')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'screenshot'
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-4 h-4" />
                Screenshot
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'calendar'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4 text-emerald-600" />
                Kalender
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Riwayat
              </button>
            </nav>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2">
              {onOpenRecheckQueue && staleRecheckCount > 0 && (
                <button
                  type="button"
                  onClick={onOpenRecheckQueue}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                  title="Antrean Cek Ulang Entri Riset (> 14 hari)"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-700" />
                  <span className="hidden sm:inline">Antrean Cek</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-mono">
                    {staleRecheckCount}
                  </span>
                </button>
              )}

              {onOpenReportModal && (
                <button
                  type="button"
                  onClick={onOpenReportModal}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  title="Buat Laporan Siap Cetak / PDF"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">Buat Laporan</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenGuide}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Buka Panduan Pengguna Lengkap"
              >
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <span className="hidden sm:inline">Panduan</span>
              </button>

              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Pengaturan Bobot & Penyimpanan"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Sticky for Smartphone HP) */}
      <nav 
        className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1.5 flex items-center justify-around shadow-lg min-h-[48px] mobile-bottom-nav"
        style={{ paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          type="button"
          onClick={() => handleMobileTab('overview')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'overview' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-4 h-4 mb-0.5" />
          <span>Ringkasan</span>
        </button>

        <button
          type="button"
          onClick={() => handleMobileTab('plan')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'plan' ? 'text-indigo-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListPlus className="w-4 h-4 mb-0.5" />
          <span>Rencana</span>
        </button>

        {/* Center Floating Plus Button */}
        <button
          type="button"
          onClick={onOpenAddModal}
          className="flex items-center justify-center w-11 h-11 -mt-4 rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition-transform active:scale-95 cursor-pointer shrink-0"
          title="Tambah Riset Baru"
          aria-label="Tambah Riset Baru"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => handleMobileTab('mydata')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'mydata' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4 mb-0.5" />
          <span>Data Saya</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            ['dashboard', 'niche', 'screenshot', 'calendar', 'history'].includes(activeTab) ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>

      {/* Mobile Drawer for More Tabs */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center xl:hidden">
          <div className="w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900 text-sm">
                Navigasi Lengkap
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <button
                type="button"
                onClick={() => handleMobileTab('overview')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  activeTab === 'overview' ? 'bg-slate-900 text-white font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Home className="w-4 h-4" />
                <div>
                  <span className="block font-semibold">Ringkasan (Dashboard Utama)</span>
                  <span className="text-[11px] opacity-80">5 kata kunci teratas, musim &amp; peringatan</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleMobileTab('dashboard')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  activeTab === 'dashboard' ? 'bg-slate-900 text-white font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Layers className="w-4 h-4" />
                <div>
                  <span className="block font-semibold">Tabel Riset &amp; Peringkat</span>
                  <span className="text-[11px] opacity-80">Semua entri riset dengan paginasi</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleMobileTab('plan')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  activeTab === 'plan' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <ListPlus className="w-4 h-4" />
                <div>
                  <span className="block font-semibold">Rencana Produksi</span>
                  <span className="text-[11px] opacity-80">Alur kerja &amp; skor prioritas</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleMobileTab('niche')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  activeTab === 'niche' ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <div>
                  <span className="block font-semibold">Ide Niche (Bersumber)</span>
                  <span className="text-[11px] text-slate-500">Saran AI bersumber Google Grounding</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleMobileTab('screenshot')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  activeTab === 'screenshot' ? 'bg-slate-900 text-white font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Camera className="w-4 h-4" />
                <div>
                  <span className="block font-semibold">Baca Screenshot</span>
                  <span className="text-[11px] opacity-80">Ekstraksi halaman hasil pencarian</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleMobileTab('calendar')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  activeTab === 'calendar' ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="block font-semibold">Kalender Musiman</span>
                  <span className="text-[11px] text-slate-500">Jendela unggah 120-60 hari</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleMobileTab('history')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  activeTab === 'history' ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="block font-semibold">Riwayat &amp; Grafik</span>
                  <span className="text-[11px] text-slate-500">Tren pertumbuhan pasokan</span>
                </div>
              </button>

              {onOpenReportModal && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenReportModal();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 text-left transition-colors cursor-pointer font-bold"
                >
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <div>
                    <span className="block font-semibold">Buat Laporan Siap Cetak/PDF</span>
                    <span className="text-[11px] text-emerald-700 font-normal">Halaman cetak resmi siap unduh/cetak</span>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenGuide();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 text-left transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <div>
                  <span className="block font-semibold">Panduan Pengguna</span>
                  <span className="text-[11px] text-emerald-700 font-normal">Panduan lengkap, konsep, rumus &amp; cara pakai</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border bg-slate-50 border-slate-200 text-slate-700 text-left transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-600" />
                <div>
                  <span className="block font-semibold">Pengaturan Bobot &amp; Ambang</span>
                  <span className="text-[11px] text-slate-500">Atur bobot, faktor prioritas &amp; backup</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
