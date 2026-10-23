/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  KeywordEntry, 
  AppSettings, 
  SeasonalMoment,
  AssetType,
  Platform,
  MyDataAsset,
  ResearchCategoryMatch,
  WeightHistoryItem,
  ProductionPlanItem
} from './types/microstock';
import { 
  loadKeywordsFromStorage, 
  saveKeywordsToStorage, 
  loadSettingsFromStorage, 
  saveSettingsToStorage, 
  loadSeasonalMomentsFromStorage, 
  saveSeasonalMomentsToStorage,
  loadMyDataAssetsFromStorage,
  saveMyDataAssetsToStorage,
  clearMyDataAssetsFromStorage,
  loadCategoryMatchesFromStorage,
  saveCategoryMatchesToStorage,
  loadProductionPlanFromStorage,
  saveProductionPlanToStorage,
  DEFAULT_SAMPLE_KEYWORDS,
  DEFAULT_SEASONAL_MOMENTS,
  DEFAULT_SAMPLE_MY_DATA,
  DEFAULT_CATEGORY_MATCHES,
  DEFAULT_SAMPLE_PRODUCTION_PLAN,
  DEFAULT_SETTINGS,
  exportFullAppJSON,
  parseFullAppJSON,
  triggerDownloadFile
} from './utils/storage';
import { computeSeasonalMoment } from './utils/calculator';
import { Navbar, ActiveTab } from './components/Navbar';
import { FormulaExplainer } from './components/FormulaExplainer';
import { ExecutiveSummaryView } from './components/ExecutiveSummaryView';
import { DashboardView } from './components/DashboardView';
import { ProductionPlanView } from './components/ProductionPlanView';
import { MyDataView } from './components/MyDataView';
import { SeasonalCalendarView } from './components/SeasonalCalendarView';
import { HistoryTrendView } from './components/HistoryTrendView';
import { NicheIdeasView } from './components/NicheIdeasView';
import { ScreenshotReaderView } from './components/ScreenshotReaderView';
import { KeywordFormModal } from './components/KeywordFormModal';
import { SettingsModal } from './components/SettingsModal';
import { ReportModal } from './components/ReportModal';
import { RecheckQueueModal } from './components/RecheckQueueModal';
import { GuideModal } from './components/GuideModal';
import { QuickStartCard } from './components/QuickStartCard';

export default function App() {
  // 1. Data States loaded safely with try/catch
  const [keywords, setKeywords] = useState<KeywordEntry[]>(() => loadKeywordsFromStorage());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettingsFromStorage());
  const [seasonalMoments, setSeasonalMoments] = useState<SeasonalMoment[]>(() => loadSeasonalMomentsFromStorage());
  const [myDataAssets, setMyDataAssets] = useState<MyDataAsset[]>(() => loadMyDataAssetsFromStorage());
  const [categoryMatches, setCategoryMatches] = useState<ResearchCategoryMatch[]>(() => loadCategoryMatchesFromStorage());
  const [productionPlan, setProductionPlan] = useState<ProductionPlanItem[]>(() => loadProductionPlanFromStorage());

  // 2. Navigation & UI States - Default to 'overview' (Ringkasan - Halaman Utama Fase 4)
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isRecheckQueueOpen, setIsRecheckQueueOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KeywordEntry | null>(null);
  const [prefillKeyword, setPrefillKeyword] = useState<string>('');
  const [prefillData, setPrefillData] = useState<Partial<KeywordEntry> | null>(null);
  const [selectedKeywordForHistory, setSelectedKeywordForHistory] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 3. Panduan (User Guide) State
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideTargetSectionId, setGuideTargetSectionId] = useState<string | null>(null);

  const handleOpenGuide = (sectionId?: string) => {
    setGuideTargetSectionId(sectionId || null);
    setIsGuideOpen(true);
  };

  // Sync to localStorage whenever keywords change
  const handleUpdateKeywords = (updated: KeywordEntry[]) => {
    setKeywords(updated);
    saveKeywordsToStorage(updated);
  };

  // Single keyword update for recheck queue
  const handleUpdateSingleKeyword = (updatedKeyword: KeywordEntry) => {
    const next = keywords.map((k) => (k.id === updatedKeyword.id ? updatedKeyword : k));
    handleUpdateKeywords(next);
  };

  // Sync to localStorage whenever seasonal moments change
  const handleUpdateMoments = (updated: SeasonalMoment[]) => {
    setSeasonalMoments(updated);
    saveSeasonalMomentsToStorage(updated);
  };

  // Sync settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettingsToStorage(newSettings);
  };

  // Sync Data Saya Assets
  const handleUpdateMyDataAssets = (updated: MyDataAsset[]) => {
    setMyDataAssets(updated);
    saveMyDataAssetsToStorage(updated);
  };

  // Sync Category Matches
  const handleUpdateCategoryMatches = (updated: ResearchCategoryMatch[]) => {
    setCategoryMatches(updated);
    saveCategoryMatchesToStorage(updated);
  };

  // Sync Rencana Produksi (Fase 4)
  const handleUpdateProductionPlan = (updated: ProductionPlanItem[]) => {
    setProductionPlan(updated);
    saveProductionPlanToStorage(updated);
  };

  // Add Item to Production Plan
  const handleAddToProductionPlan = (itemData: {
    titleOrKeyword: string;
    assetType: AssetType;
    platform?: Platform;
    opportunityScore?: number;
    sourceType?: 'riset' | 'ide_niche' | 'manual';
    sourceKeywordId?: string;
    categoryName?: string;
    seasonalMomentName?: string;
    notes?: string;
  }) => {
    const sFactor = settings.productionFactors?.seasonalNone || 1.0;
    const dFactor = settings.productionFactors?.dataPertahankan || 1.0;
    const opp = typeof itemData.opportunityScore === 'number' ? itemData.opportunityScore : 75;
    const priority = Math.round(opp * sFactor * dFactor * 10) / 10;
    const now = new Date().toISOString();

    const newItem: ProductionPlanItem = {
      id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      titleOrKeyword: itemData.titleOrKeyword,
      assetType: itemData.assetType,
      platform: itemData.platform || 'Adobe Stock',
      status: 'Ide',
      opportunityScore: opp,
      seasonalFactor: sFactor,
      dataFactor: dFactor,
      priorityScore: priority,
      sourceType: itemData.sourceType || 'riset',
      sourceKeywordId: itemData.sourceKeywordId,
      categoryName: itemData.categoryName,
      seasonalMomentName: itemData.seasonalMomentName,
      notes: itemData.notes,
      createdAt: now,
      updatedAt: now,
    };

    handleUpdateProductionPlan([newItem, ...productionPlan]);
  };

  // Clear Data Saya
  const handleClearMyData = () => {
    setMyDataAssets([]);
    setCategoryMatches([]);
    clearMyDataAssetsFromStorage();
  };

  // Apply Calibrated Weight from Spearman Table
  const handleApplyCalibratedWeight = (
    demandWeight: number,
    supplyWeight: number,
    rho?: number,
    sampleSize?: number
  ) => {
    const historyItem: WeightHistoryItem = {
      id: `calib-${Date.now()}`,
      date: new Date().toISOString(),
      demandWeight,
      supplyWeight,
      spearmanRho: rho,
      sampleSize,
      appliedFromCalibration: true,
      notes: `Diterapkan dari kalibrasi korelasi Spearman (\u03C1 = ${rho !== undefined ? rho : 'N/A'}, n = ${sampleSize || 0})`,
    };

    const nextSettings: AppSettings = {
      ...settings,
      demandWeight,
      supplyWeight,
      weightHistory: [historyItem, ...(settings.weightHistory || [])],
    };

    handleSaveSettings(nextSettings);
  };

  // Apply Group Weight (Fase 5A)
  const handleApplyGroupWeight = (
    platform: Platform,
    assetType: AssetType,
    demandWeight: number,
    supplyWeight: number,
    rho?: number,
    sampleSize?: number
  ) => {
    const key = `${platform}_${assetType}`;
    const nextGroupWeights = {
      ...(settings.groupWeights || {}),
      [key]: {
        demandWeight,
        supplyWeight,
        calibratedAt: new Date().toISOString(),
        spearmanRho: rho,
        sampleSize,
      },
    };
    handleSaveSettings({
      ...settings,
      groupWeights: nextGroupWeights,
    });
  };

  // Export Full App JSON (schema_version 4)
  const handleExportFullJSON = () => {
    const jsonStr = exportFullAppJSON(
      keywords,
      myDataAssets,
      categoryMatches,
      seasonalMoments,
      productionPlan,
      settings
    );
    triggerDownloadFile(
      jsonStr,
      `microstock_backup_full_v4_${new Date().toISOString().substring(0, 10)}.json`,
      'application/json'
    );
  };

  // Import Full App JSON (Merge or Overwrite)
  const handleImportFullJSON = (
    data: {
      keywords?: KeywordEntry[];
      myDataAssets?: MyDataAsset[];
      categoryMatches?: ResearchCategoryMatch[];
      seasonalMoments?: SeasonalMoment[];
      productionPlan?: ProductionPlanItem[];
      settings?: AppSettings;
    },
    mode: 'merge' | 'overwrite'
  ) => {
    if (mode === 'overwrite') {
      if (Array.isArray(data.keywords)) {
        handleUpdateKeywords(data.keywords);
      }
      if (Array.isArray(data.myDataAssets)) {
        handleUpdateMyDataAssets(data.myDataAssets);
      }
      if (Array.isArray(data.categoryMatches)) {
        handleUpdateCategoryMatches(data.categoryMatches);
      }
      if (Array.isArray(data.seasonalMoments)) {
        handleUpdateMoments(data.seasonalMoments);
      }
      if (Array.isArray(data.productionPlan)) {
        handleUpdateProductionPlan(data.productionPlan);
      }
      if (data.settings) {
        handleSaveSettings(data.settings);
      }
    } else {
      // Mode Gabung (Merge)
      if (Array.isArray(data.keywords) && data.keywords.length > 0) {
        const existingIds = new Set(keywords.map((k) => k.id));
        const newOnes = data.keywords.filter((k) => !existingIds.has(k.id));
        const merged = keywords.map((k) => {
          const match = data.keywords!.find((dk) => dk.id === k.id);
          return match ? { ...k, ...match } : k;
        });
        handleUpdateKeywords([...merged, ...newOnes]);
      }

      if (Array.isArray(data.productionPlan) && data.productionPlan.length > 0) {
        const existingPlanIds = new Set(productionPlan.map((p) => p.id));
        const newPlans = data.productionPlan.filter((p) => !existingPlanIds.has(p.id));
        const mergedPlan = productionPlan.map((p) => {
          const match = data.productionPlan!.find((dp) => dp.id === p.id);
          return match ? { ...p, ...match } : p;
        });
        handleUpdateProductionPlan([...mergedPlan, ...newPlans]);
      }

      if (Array.isArray(data.myDataAssets) && data.myDataAssets.length > 0) {
        const existingAssetIds = new Set(myDataAssets.map((a) => a.id));
        const newAssets = data.myDataAssets.filter((a) => !existingAssetIds.has(a.id));
        handleUpdateMyDataAssets([...myDataAssets, ...newAssets]);
      }

      if (Array.isArray(data.seasonalMoments) && data.seasonalMoments.length > 0) {
        const existingMomentIds = new Set(seasonalMoments.map((m) => m.id));
        const newMoments = data.seasonalMoments.filter((m) => !existingMomentIds.has(m.id));
        handleUpdateMoments([...seasonalMoments, ...newMoments]);
      }

      if (data.settings) {
        handleSaveSettings({
          ...settings,
          ...data.settings,
        });
      }
    }
  };

  // Add / Edit Keyword Save
  const handleSaveKeyword = (
    entryData: Omit<KeywordEntry, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ) => {
    const now = new Date().toISOString();
    if (editId) {
      const next = keywords.map((k) =>
        k.id === editId ? { ...k, ...entryData, updatedAt: now } : k
      );
      handleUpdateKeywords(next);
    } else {
      const newEntry: KeywordEntry = {
        ...entryData,
        id: `kw-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        sumber_data: entryData.sumber_data || 'manual',
        createdAt: now,
        updatedAt: now,
      };
      handleUpdateKeywords([newEntry, ...keywords]);
    }
    setIsAddModalOpen(false);
    setEditingEntry(null);
    setPrefillKeyword('');
    setPrefillData(null);
  };

  // Delete Keyword
  const handleDeleteKeyword = (id: string) => {
    const next = keywords.filter((k) => k.id !== id);
    handleUpdateKeywords(next);
  };

  // Open Add modal with prefill keyword or full prefill object
  const handleOpenAddModal = (prefill?: string, prefillObj?: Partial<KeywordEntry>) => {
    setEditingEntry(null);
    setPrefillKeyword(prefill || '');
    setPrefillData(prefillObj || null);
    setIsAddModalOpen(true);
  };

  // Open Edit modal
  const handleEditEntry = (entry: KeywordEntry) => {
    setEditingEntry(entry);
    setPrefillKeyword('');
    setPrefillData(null);
    setIsAddModalOpen(true);
  };

  // Jump to History tab for a specific keyword
  const handleViewHistory = (keyword: string) => {
    setSelectedKeywordForHistory(keyword);
    setActiveTab('history');
  };

  // Seasonal Moment: update peak date
  const handleUpdatePeakDate = (momentId: string, newPeakDate: string) => {
    const next = seasonalMoments.map((m) =>
      m.id === momentId ? { ...m, peakDate: newPeakDate } : m
    );
    handleUpdateMoments(next);
  };

  // Seasonal Moment: add custom
  const handleAddCustomMoment = (momentData: Omit<SeasonalMoment, 'id'>) => {
    const newMoment: SeasonalMoment = {
      ...momentData,
      id: `custom-moment-${Date.now()}`,
    };
    handleUpdateMoments([...seasonalMoments, newMoment]);
  };

  // Seasonal Moment: delete custom
  const handleDeleteMoment = (momentId: string) => {
    const next = seasonalMoments.filter((m) => m.id !== momentId);
    handleUpdateMoments(next);
  };

  // Seasonal Moment: click keyword suggestion to research
  const handleResearchSeasonalKeyword = (kw: string) => {
    handleOpenAddModal(kw);
  };

  // Fase 2: Send from Niche Ideas to Phase 1 Form
  const handleSendNicheToForm = (data: {
    keyword: string;
    assetType: AssetType;
    demandScore: number | null;
    demandSource: string;
    notes: string;
  }) => {
    handleOpenAddModal(data.keyword, {
      keyword: data.keyword,
      assetType: data.assetType,
      demandScore: data.demandScore,
      demandSource: data.demandSource,
      notes: data.notes,
      isAiSuggested: true,
      isConfirmedByUser: false,
      sumber_data: 'manual',
    });
  };

  // Fase 2: Send from Screenshot Reader to Phase 1 Form
  const handleSendScreenshotToForm = (data: {
    platform: Platform;
    assetType: AssetType;
    keyword: string;
    searchResultCount: number;
    notes: string;
  }) => {
    handleOpenAddModal(data.keyword, {
      platform: data.platform,
      assetType: data.assetType,
      keyword: data.keyword,
      searchResultCount: data.searchResultCount,
      notes: data.notes,
      isAiSuggested: true,
      isConfirmedByUser: false,
      sumber_data: 'screenshot',
    });
  };

  // Reset sample data
  const handleResetSampleData = () => {
    handleUpdateKeywords(DEFAULT_SAMPLE_KEYWORDS);
    handleUpdateMoments(DEFAULT_SEASONAL_MOMENTS);
    handleUpdateMyDataAssets(DEFAULT_SAMPLE_MY_DATA);
    handleUpdateCategoryMatches(DEFAULT_CATEGORY_MATCHES);
    handleUpdateProductionPlan(DEFAULT_SAMPLE_PRODUCTION_PLAN);
    handleSaveSettings(DEFAULT_SETTINGS);
  };

  // Clear all data
  const handleClearAllData = () => {
    handleUpdateKeywords([]);
  };

  // Import entries (merge or replace)
  const handleImportEntries = (imported: KeywordEntry[], mode: 'merge' | 'replace') => {
    if (mode === 'replace') {
      handleUpdateKeywords(imported);
    } else {
      const existingIds = new Set(keywords.map((k) => k.id));
      const freshItems = imported.filter((item) => !existingIds.has(item.id));
      handleUpdateKeywords([...freshItems, ...keywords]);
    }
  };

  // Active seasonal moments count
  const activeMomentCount = useMemo(() => {
    return seasonalMoments
      .map((m) => computeSeasonalMoment(m))
      .filter((m) => m.status === 'active').length;
  }, [seasonalMoments]);

  // Fase 5A: Stale keywords count (>14 days)
  const staleRecheckCount = useMemo(() => {
    return keywords.filter((k) => {
      const diff = Math.floor((new Date().getTime() - new Date(k.checkDate).getTime()) / (1000 * 60 * 60 * 24));
      return diff > 14;
    }).length;
  }, [keywords]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-12">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAddModal={() => handleOpenAddModal()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenRecheckQueue={() => setIsRecheckQueueOpen(true)}
        onOpenGuide={() => handleOpenGuide()}
        staleRecheckCount={staleRecheckCount}
      />

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 space-y-6">
        {/* Kartu Mulai Cepat (dismissable, tersimpan di localStorage) */}
        <QuickStartCard
          onOpenGuide={handleOpenGuide}
          onOpenAddModal={() => handleOpenAddModal()}
        />

        {/* Transparent Formula Explainer & Interactive Simulation Panel */}
        <FormulaExplainer settings={settings} onOpenGuide={handleOpenGuide} />

        {/* 1. DASHBOARD RINGKASAN (Halaman Utama Fase 4 Poin A) */}
        {activeTab === 'overview' && (
          <ExecutiveSummaryView
            keywords={keywords}
            settings={settings}
            seasonalMoments={seasonalMoments}
            myDataAssets={myDataAssets}
            onSelectTab={setActiveTab}
            onOpenAddModal={handleOpenAddModal}
            onAddToProductionPlan={handleAddToProductionPlan}
            onOpenRecheckQueue={() => setIsRecheckQueueOpen(true)}
            onEditKeyword={handleEditEntry}
            onOpenGuide={handleOpenGuide}
          />
        )}

        {/* 2. TAB RISET & PERINGKAT LENGKAP DENGAN PAGINASI (Fase 1-4) */}
        {activeTab === 'dashboard' && (
          <DashboardView
            keywords={keywords}
            settings={settings}
            onOpenAddModal={handleOpenAddModal}
            onEditEntry={handleEditEntry}
            onDeleteEntry={handleDeleteKeyword}
            onViewHistory={handleViewHistory}
            onSelectMomentTab={() => setActiveTab('calendar')}
            activeMomentCount={activeMomentCount}
            onAddToProductionPlan={handleAddToProductionPlan}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onOpenRecheckQueue={() => setIsRecheckQueueOpen(true)}
            onOpenGuide={handleOpenGuide}
          />
        )}

        {/* 3. TAB RENCANA PRODUKSI (Fase 4 Poin B) */}
        {activeTab === 'plan' && (
          <ProductionPlanView
            planItems={productionPlan}
            settings={settings}
            seasonalMoments={seasonalMoments}
            myDataAssets={myDataAssets}
            keywords={keywords}
            onUpdatePlanItems={handleUpdateProductionPlan}
            onSelectTab={setActiveTab}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenGuide={handleOpenGuide}
          />
        )}

        {/* 4. TAB DATA SAYA (Fase 3) */}
        {activeTab === 'mydata' && (
          <MyDataView
            myDataAssets={myDataAssets}
            categoryMatches={categoryMatches}
            keywords={keywords}
            settings={settings}
            onUpdateAssets={handleUpdateMyDataAssets}
            onUpdateMatches={handleUpdateCategoryMatches}
            onApplyWeight={handleApplyCalibratedWeight}
            onApplyGroupWeight={handleApplyGroupWeight}
            onClearMyData={handleClearMyData}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenGuide={handleOpenGuide}
          />
        )}

        {/* 5. TAB IDE NICHE (Fase 2) */}
        {activeTab === 'niche' && (
          <NicheIdeasView
            seasonalMoments={seasonalMoments}
            onSendToResearchForm={handleSendNicheToForm}
            onAddToProductionPlan={handleAddToProductionPlan}
          />
        )}

        {/* 6. TAB BACA SCREENSHOT (Fase 2) */}
        {activeTab === 'screenshot' && (
          <ScreenshotReaderView
            onSendToResearchForm={handleSendScreenshotToForm}
          />
        )}

        {/* 7. TAB KALENDER MUSIMAN (Fase 1-3) */}
        {activeTab === 'calendar' && (
          <SeasonalCalendarView
            moments={seasonalMoments}
            onUpdateMomentPeakDate={handleUpdatePeakDate}
            onAddCustomMoment={handleAddCustomMoment}
            onDeleteMoment={handleDeleteMoment}
            onResearchKeyword={handleResearchSeasonalKeyword}
          />
        )}

        {/* 8. TAB RIWAYAT & GRAFIK (Fase 1) */}
        {activeTab === 'history' && (
          <HistoryTrendView
            keywords={keywords}
            settings={settings}
            selectedKeywordFilter={selectedKeywordForHistory}
            onOpenAddModal={handleOpenAddModal}
            onDeleteEntry={handleDeleteKeyword}
            onImportEntries={handleImportEntries}
          />
        )}
      </main>

      {/* Form Modal for Inputting / Editing Keywords */}
      <KeywordFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingEntry(null);
          setPrefillKeyword('');
          setPrefillData(null);
        }}
        onSave={handleSaveKeyword}
        editingEntry={editingEntry}
        settings={settings}
        prefillKeyword={prefillKeyword}
        prefillData={prefillData}
        onOpenGuide={handleOpenGuide}
      />

      {/* Settings & Weights Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onResetSampleData={handleResetSampleData}
        onClearAllData={handleClearAllData}
        onExportFullJSON={handleExportFullJSON}
        onImportFullJSON={handleImportFullJSON}
        onOpenGuide={handleOpenGuide}
      />

      {/* Report Modal - Halaman Siap Cetak / PDF (Fase 4 Poin C) */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        keywords={keywords}
        settings={settings}
        seasonalMoments={seasonalMoments}
        myDataAssets={myDataAssets}
        productionPlan={productionPlan}
      />

      {/* Recheck Queue Modal - Mode Cek Berurutan & Antrean (Fase 5A Poin 3) */}
      <RecheckQueueModal
        isOpen={isRecheckQueueOpen}
        onClose={() => setIsRecheckQueueOpen(false)}
        keywords={keywords}
        productionPlan={productionPlan}
        onUpdateKeyword={handleUpdateSingleKeyword}
      />

      {/* Panduan Pengguna (User Guide) Modal */}
      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => {
          setIsGuideOpen(false);
          setGuideTargetSectionId(null);
        }}
        targetSectionId={guideTargetSectionId}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsGuideOpen(false);
        }}
        onOpenSettings={() => {
          setIsGuideOpen(false);
          setIsSettingsOpen(true);
        }}
        onOpenAddModal={() => {
          setIsGuideOpen(false);
          handleOpenAddModal();
        }}
        onOpenReportModal={() => {
          setIsGuideOpen(false);
          setIsReportModalOpen(true);
        }}
      />
    </div>
  );
}
