import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ArrowUp, 
  ExternalLink, 
  HelpCircle,
  Sparkles,
  Layers,
  Settings,
  Calendar,
  BarChart2,
  ListPlus,
  FileText,
  TrendingUp,
  Check,
  Bookmark
} from 'lucide-react';
import { USER_GUIDE_SECTIONS, GuideSection, GuideShortcut } from '../data/userGuideContent';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSectionId?: string | null;
  onNavigateTab?: (tab: any) => void;
  onOpenSettings?: (tab?: string) => void;
  onOpenAddModal?: () => void;
  onOpenReportModal?: () => void;
}

// Helper to escape regex special characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Text Highlighter
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded shadow-2xs">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

// Inline Markdown Parser
function MarkdownInline({ text, query }: { text: string; query: string }) {
  // Regex to match **bold**, *italic*, and `code`
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={idx} className="font-bold text-slate-900">
              <HighlightedText text={part.slice(2, -2)} query={query} />
            </strong>
          );
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <em key={idx} className="italic text-slate-800">
              <HighlightedText text={part.slice(1, -1)} query={query} />
            </em>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={idx} className="font-mono text-[11px] bg-slate-100 text-emerald-800 px-1 py-0.5 rounded border border-slate-200">
              <HighlightedText text={part.slice(1, -1)} query={query} />
            </code>
          );
        }
        return <HighlightedText key={idx} text={part} query={query} />;
      })}
    </>
  );
}

// Simple Markdown Block Renderer (headers, tables, lists, pre blocks)
function MarkdownContent({ content, query }: { content: string; query: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code Block (``` ... ```)
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={`code-${i}`} className="my-3 rounded-xl overflow-hidden border border-slate-800 shadow-md">
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center justify-between">
            <span>Blok Rumus &amp; Perhitungan</span>
            <span className="text-slate-500 font-sans normal-case">Presisi Kode</span>
          </div>
          <pre className="p-4 bg-slate-950 text-emerald-300 font-mono text-xs sm:text-sm overflow-x-auto leading-relaxed">
            <code>
              <HighlightedText text={codeLines.join('\n')} query={query} />
            </code>
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // 2. Table Block (| ... |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        // line 1 is separator |---|---|
        const bodyRows = tableLines.slice(2).map((r) =>
          r
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        elements.push(
          <div key={`table-${i}`} className="my-4 border border-slate-200 rounded-xl overflow-x-auto shadow-2xs bg-white">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-100/90 text-slate-800 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  {headerCells.map((hc, idx) => (
                    <th key={idx} className="py-2.5 px-3.5 whitespace-nowrap">
                      <MarkdownInline text={hc} query={query} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-3.5 leading-relaxed">
                        <MarkdownInline text={cell} query={query} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 3. Subheader 3 (### )
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-sm sm:text-base font-bold text-slate-900 mt-5 mb-2 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-emerald-600 rounded-full inline-block" />
          <HighlightedText text={line.slice(4)} query={query} />
        </h4>
      );
      i++;
      continue;
    }

    // 4. Numbered List (1. )
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2.5 my-1.5 text-xs sm:text-sm text-slate-700 leading-relaxed pl-1">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
            {numberedMatch[1]}
          </span>
          <div className="flex-1">
            <MarkdownInline text={numberedMatch[2]} query={query} />
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 5. Bullet List (- )
    if (line.trim().startsWith('- ')) {
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2.5 my-1.5 text-xs sm:text-sm text-slate-700 leading-relaxed pl-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-2" />
          <div className="flex-1">
            <MarkdownInline text={line.trim().slice(2)} query={query} />
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 6. Regular Paragraph
    if (line.trim()) {
      elements.push(
        <p key={`p-${i}`} className="my-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <MarkdownInline text={line} query={query} />
        </p>
      );
    }

    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}

export const GuideModal: React.FC<GuideModalProps> = ({
  isOpen,
  onClose,
  targetSectionId,
  onNavigateTab,
  onOpenSettings,
  onOpenAddModal,
  onOpenReportModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isTocOpen, setIsTocOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    USER_GUIDE_SECTIONS.forEach((s) => {
      init[s.id] = false;
    });
    // Default open section 1
    init['sec-1-mulai-cepat'] = true;
    return init;
  });

  const [showScrollTop, setShowScrollTop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // When targetSectionId changes or opens
  useEffect(() => {
    if (isOpen && targetSectionId) {
      // Find matching section
      const match = USER_GUIDE_SECTIONS.find((s) => s.id === targetSectionId);
      if (match) {
        setExpandedSections((prev) => ({ ...prev, [match.id]: true }));
        setTimeout(() => {
          const el = sectionRefs.current[match.id];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 200);
      }
    }
  }, [isOpen, targetSectionId]);

  // Handle Search Input: auto-expand matching sections & compute total count
  const { matchCount, matchingSectionIds } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { matchCount: 0, matchingSectionIds: new Set<string>() };
    }
    const q = searchQuery.toLowerCase().trim();
    let total = 0;
    const matchingIds = new Set<string>();

    USER_GUIDE_SECTIONS.forEach((sec) => {
      const fullText = `${sec.title} ${sec.summary || ''} ${sec.content} ${sec.tags.join(' ')}`.toLowerCase();
      const occurrences = (fullText.match(new RegExp(escapeRegExp(q), 'gi')) || []).length;
      if (occurrences > 0) {
        total += occurrences;
        matchingIds.add(sec.id);
      }
    });

    return { matchCount: total, matchingSectionIds: matchingIds };
  }, [searchQuery]);

  // Auto-expand sections that match query
  useEffect(() => {
    if (searchQuery.trim() && matchingSectionIds.size > 0) {
      setExpandedSections((prev) => {
        const next = { ...prev };
        matchingSectionIds.forEach((id) => {
          next[id] = true;
        });
        return next;
      });
    }
  }, [searchQuery, matchingSectionIds]);

  // Handle scroll to show/hide "Ke atas"
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(e.currentTarget.scrollTop > 350);
  };

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    USER_GUIDE_SECTIONS.forEach((s) => {
      next[s.id] = true;
    });
    setExpandedSections(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    USER_GUIDE_SECTIONS.forEach((s) => {
      next[s.id] = false;
    });
    setExpandedSections(next);
  };

  const jumpToSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      const el = sectionRefs.current[id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Shortcut action dispatcher
  const handleShortcutClick = (shortcut: GuideShortcut) => {
    onClose();
    if (shortcut.action === 'add_modal') {
      if (onOpenAddModal) onOpenAddModal();
    } else if (shortcut.action === 'report') {
      if (onOpenReportModal) onOpenReportModal();
    } else if (shortcut.action.startsWith('settings')) {
      if (onOpenSettings) {
        if (shortcut.action === 'settings_formula') {
          onOpenSettings('weights');
        } else if (shortcut.action === 'settings_benchmarks') {
          onOpenSettings('benchmarks');
        } else if (shortcut.action === 'settings_thresholds') {
          onOpenSettings('thresholds');
        } else {
          onOpenSettings();
        }
      }
    } else if (onNavigateTab) {
      onNavigateTab(shortcut.action);
    }
  };

  // Keyboard close with ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full sm:h-[94vh] sm:max-w-4xl bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative"
      >
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  Panduan Pengguna Microstock Research
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Referensi lengkap rumus, alur kerja, konsep dasar, dan pemecahan masalah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Tutup Panduan (Esc)"
              aria-label="Tutup Panduan"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Search & Global Controls Bar */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari teks di seluruh panduan (contoh: rumus, pasokan, acuan jenuh, CSV, backup)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl pl-9 pr-9 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2">
              {searchQuery.trim() ? (
                <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md text-[11px]">
                  {matchCount > 0 ? `${matchCount} kecocokan ditemukan` : 'Tidak ada kecocokan ditemukan'}
                </span>
              ) : (
                <span className="text-slate-500 text-[11px]">
                  10 Bagian Panduan Lengkap &middot; Akses Cepat
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTocOpen(!isTocOpen)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Daftar Isi</span>
                {isTocOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={expandAll}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
              >
                Buka Semua
              </button>
              <span className="text-slate-300">&bull;</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Tutup Semua
              </button>
            </div>
          </div>

          {/* Collapsible Table of Contents */}
          {isTocOpen && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 animate-fade-in shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Daftar Isi (Ketuk untuk Lompat ke Bagian):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {USER_GUIDE_SECTIONS.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => jumpToSection(sec.id)}
                    className="flex items-center gap-2 text-left p-1.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-900 text-slate-700 transition-colors cursor-pointer group"
                  >
                    <span className="w-5 h-5 rounded-md bg-slate-100 group-hover:bg-emerald-200 group-hover:text-emerald-900 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {sec.number}
                    </span>
                    <span className="truncate font-semibold">{sec.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area (Accordion Sections) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {USER_GUIDE_SECTIONS.map((sec) => {
            const isExpanded = !!expandedSections[sec.id];
            const isMatch = matchingSectionIds.has(sec.id);

            return (
              <div
                key={sec.id}
                ref={(el) => {
                  sectionRefs.current[sec.id] = el;
                }}
                className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                  isMatch
                    ? 'border-emerald-300 ring-2 ring-emerald-500/20 bg-white'
                    : isExpanded
                    ? 'border-slate-300 bg-white shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                }`}
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(sec.id)}
                  className="w-full p-4 sm:p-5 flex items-start justify-between text-left transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      {sec.number}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                        <HighlightedText text={`${sec.number}. ${sec.title}`} query={searchQuery} />
                      </h3>
                      {sec.summary && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          <HighlightedText text={sec.summary} query={searchQuery} />
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hidden sm:inline">
                      {isExpanded ? 'Tutup' : 'Buka'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 pt-1 border-t border-slate-100 animate-fade-in space-y-4">
                    {/* Markdown Renderer */}
                    <MarkdownContent content={sec.content} query={searchQuery} />

                    {/* Quick Action Shortcuts inside this section */}
                    {sec.shortcuts && sec.shortcuts.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                          Pintasan Langsung ke Aplikasi:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {sec.shortcuts.map((sc, scIdx) => (
                            <button
                              key={scIdx}
                              type="button"
                              onClick={() => handleShortcutClick(sc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
                            >
                              <span>{sc.label}</span>
                              <ExternalLink className="w-3 h-3 text-emerald-400" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating Scroll to Top Button */}
        {showScrollTop && (
          <button
            type="button"
            onClick={scrollToTop}
            className="absolute bottom-16 right-6 p-2.5 bg-slate-900/90 text-white hover:bg-slate-900 rounded-full shadow-lg border border-slate-700 transition-all cursor-pointer animate-fade-in z-30"
            title="Ke atas"
          >
            <ArrowUp className="w-4 h-4 text-emerald-400" />
          </button>
        )}

        {/* Footer */}
        <footer className="sticky bottom-0 z-20 bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Panduan v1.0</span>
            <span>&bull;</span>
            <span className="hidden sm:inline">Microstock Research (Berjalan Lokal di Browser)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
          >
            Tutup Panduan
          </button>
        </footer>
      </div>
    </div>
  );
};
