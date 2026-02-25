import React, { useState, useRef, useCallback, Suspense, useEffect } from 'react';
import { UploadArea } from './components/UploadArea';
import { PairList } from './components/PairList';
import { CompareView } from './components/CompareView';
import { GlossaryManager, GlossaryManagerRef } from './components/GlossaryManager';
import { ScreenshotPair, LlmRequestPayload, BulkProcessingState, ScreenshotReport, AppLanguage } from './types';
import { callTranslationQaLLM } from './services/llmService';
import { generateReportHtml, generateExportFilename } from './services/reportGenerator';
import { Layers, Activity, BookOpen, PanelLeftOpen, PanelLeftClose, PlayCircle, Globe, Loader2, RotateCcw, Trash2, GripVertical, BookDown } from 'lucide-react';
import { LLM_DISPLAY_NAME, APP_VERSION, UI_TEXT } from './constants';
import JSZip from 'jszip';

// Code Splitting: Lazy load heavy components
const ReportPanel = React.lazy(() => import('./components/ReportPanel').then(module => ({ default: module.ReportPanel })));
const GlobalSummary = React.lazy(() => import('./components/GlobalSummary').then(module => ({ default: module.GlobalSummary })));
const BulkRunModal = React.lazy(() => import('./components/BulkRunModal').then(module => ({ default: module.BulkRunModal })));

const App: React.FC = () => {
  // Language State
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('vision_lqa_lang');
    return (saved === 'en' || saved === 'zh') ? saved : 'zh';
  });

  const [pairs, setPairs] = useState<ScreenshotPair[]>([]);
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [hoveredIssueId, setHoveredIssueId] = useState<string | null>(null);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [glossaryText, setGlossaryText] = useState<string>('');
  const [glossaryDetectedLang, setGlossaryDetectedLang] = useState<'de-DE' | 'fr-FR' | null>(null);
  
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeRightPanel, setActiveRightPanel] = useState<'report' | 'global'>('report');
  
  // Right Panel Resizing State
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    const saved = localStorage.getItem('vision_lqa_right_width');
    return saved ? parseInt(saved, 10) : 400;
  });
  const [isResizingRight, setIsResizingRight] = useState(false);

  // Bulk Run State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkState, setBulkState] = useState<BulkProcessingState>({
    isProcessing: false,
    total: 0,
    completed: 0,
    success: 0,
    failed: 0,
    errors: [],
    isComplete: false
  });
  
  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const glossaryManagerRef = useRef<GlossaryManagerRef>(null);

  const t = UI_TEXT[appLanguage];
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Resizing Logic ---
  const startResizingRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  }, []);

  const stopResizingRight = useCallback(() => {
    setIsResizingRight(false);
    localStorage.setItem('vision_lqa_right_width', String(rightPanelWidth));
  }, [rightPanelWidth]);

  const resizeRight = useCallback((e: MouseEvent) => {
    if (isResizingRight) {
      // Calculate new width: Viewport Width - Mouse X Position
      const newWidth = window.innerWidth - e.clientX;
      // Constraints: Min 300px, Max 800px (or 60% of screen)
      const clampedWidth = Math.max(300, Math.min(newWidth, window.innerWidth * 0.6));
      setRightPanelWidth(clampedWidth);
    }
  }, [isResizingRight]);

  useEffect(() => {
    if (isResizingRight) {
      window.addEventListener('mousemove', resizeRight);
      window.addEventListener('mouseup', stopResizingRight);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging
    } else {
      window.removeEventListener('mousemove', resizeRight);
      window.removeEventListener('mouseup', stopResizingRight);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', resizeRight);
      window.removeEventListener('mouseup', stopResizingRight);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingRight, resizeRight, stopResizingRight]);

  // Onboarding Check
  useEffect(() => {
    const hasInitialized = localStorage.getItem('vision_lqa_initialized');
    if (!hasInitialized && !glossaryText) {
       setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingAction = async (lang: 'fr-FR' | 'de-DE') => {
      if (glossaryManagerRef.current) {
          setShowOnboarding(false);
          await glossaryManagerRef.current.loadPreset(lang);
          localStorage.setItem('vision_lqa_initialized', 'true');
      }
  };

  const skipOnboarding = () => {
      setShowOnboarding(false);
      localStorage.setItem('vision_lqa_initialized', 'true');
  };

  // Handle Language Change
  const toggleLanguage = () => {
    const newLang = appLanguage === 'zh' ? 'en' : 'zh';
    setAppLanguage(newLang);
    localStorage.setItem('vision_lqa_lang', newLang);
  };

  // Start Over Logic (Explicitly clears everything)
  const handleStartOver = () => {
    if (pairs.length > 0) {
        if (!window.confirm("Are you sure you want to start over? This will clear ALL current screenshots and reports.")) {
            return;
        }
    }
    setPairs([]);
    setSelectedPairId(null);
    setBulkState({
        isProcessing: false,
        total: 0,
        completed: 0,
        success: 0,
        failed: 0,
        errors: [],
        isComplete: false
    });
    // Note: We deliberately do NOT clear glossaryText here to allow persistence if user just made a mistake with Screenshots.
    // Use the "Clear" button in GlossaryManager for that.
  };

  // New: Clear only screenshots list
  const handleClearScreenshots = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (pairs.length > 0) {
          if (window.confirm("Clear all screenshots? Your glossary/context will be preserved.")) {
              setPairs([]);
              setSelectedPairId(null);
          }
      }
  };

  // Demo Data Loading
  const loadDemoData = useCallback(() => {
    const demoId = "demo-pair-01";
    const demoImage = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=1200&auto=format&fit=crop";

    // Demo report needs to match new schema
    const demoReport: ScreenshotReport = {
      screenshotId: demoId,
      overall: {
        qualityLevel: 'Poor',
        scores: { accuracy: 4, terminology: 3, layout: 2, grammar: 5, formatting: 4, localizationTone: 4 },
        sceneDescription: appLanguage === 'zh' 
          ? "图中展示了一只猫咪看着日落的精美画面。右侧是德语设置界面。" 
          : "The image shows a beautiful cat looking at the sunset. On the right is the German settings interface.",
        mainProblemsSummary: appLanguage === 'zh' 
          ? "主要问题在于文本重叠和术语不一致。" 
          : "Main issues are text overlap and inconsistent terminology."
      },
      issues: [
        {
          id: "ISSUE-01",
          location: "Header",
          issueCategory: "Layout",
          severity: "Major",
          sourceText: "Settings",
          targetText: "Einstellungen für Benutzer",
          description: appLanguage === 'zh' ? "文本过长导致换行。" : "Text is too long causing line wrap.",
          suggestionsTarget: ["Einstellungen"]
        }
      ],
      summary: {
        severeCount: 0,
        majorCount: 1,
        minorCount: 0,
        optimizationAdvice: appLanguage === 'zh' ? "建议缩短德语翻译。" : "Suggest shortening German translations.",
        termAdvice: ""
      }
    };

    setPairs([
      {
        id: demoId,
        fileName: "RingCentral_Cat_Demo",
        enImageUrl: demoImage,
        deImageUrl: demoImage,
        targetLanguage: 'de-DE',
        status: 'completed',
        report: demoReport
      }
    ]);
    setSelectedPairId(demoId);
    setGlossaryText("Site = Standort\nExtension = Nebenstelle");
    setActiveRightPanel('report');
  }, [appLanguage]);

  const handlePairsCreated = (newPairs: ScreenshotPair[]) => {
    // Check for language mismatch
    if (newPairs.length > 0 && glossaryDetectedLang) {
        const zipLang = newPairs[0].targetLanguage;
        if (glossaryDetectedLang !== zipLang) {
            const msg = t.langMismatchMsg
               .replace('{zipLang}', zipLang)
               .replace('{glossaryLang}', glossaryDetectedLang);
            
            // Ask user if they want to proceed despite mismatch
            if (!window.confirm(msg)) {
                return; // Abort loading these pairs
            }
        }
    }

    setPairs(prev => [...prev, ...newPairs]);
    if (newPairs.length > 0 && !selectedPairId) {
      setSelectedPairId(newPairs[0].id);
      setActiveRightPanel('report');
    }
  };

  const updatePairStatus = (id: string, updates: Partial<ScreenshotPair>) => {
    setPairs(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleGenerateReport = async () => {
    if (!selectedPairId) return;

    updatePairStatus(selectedPairId, { status: 'analyzing', errorMessage: undefined });

    const pair = pairs.find(p => p.id === selectedPairId);
    if (!pair) return;

    try {
      const payload: LlmRequestPayload = {
        screenshotId: pair.id,
        enImageBase64: pair.enImageUrl, 
        deImageBase64: pair.deImageUrl,
        targetLanguage: pair.targetLanguage,
        glossaryText,
        reportLanguage: appLanguage // Pass current language
      };

      const response = await callTranslationQaLLM(payload);
      
      updatePairStatus(selectedPairId, { status: 'completed', report: response.report });
      
    } catch (error: any) {
      console.error("Analysis failed", error);
      const msg = error instanceof Error ? error.message : "Unknown error occurred";
      updatePairStatus(selectedPairId, { status: 'failed', errorMessage: msg });
    }
  };

  // --- Bulk Operation Logic ---

  const handleOpenBulkModal = () => {
    setIsBulkModalOpen(true);
    if (!bulkState.isProcessing && !bulkState.isComplete) {
       setBulkState({
         isProcessing: false,
         total: 0,
         completed: 0,
         success: 0,
         failed: 0,
         errors: [],
         isComplete: false
       });
    }
  };

  const handleCancelBulk = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setBulkState(prev => ({ ...prev, isProcessing: false, isComplete: true }));
  };

  const startBulkAnalysis = async () => {
    const pendingItems = pairs.filter(p => p.status === 'pending' || p.status === 'failed');
    
    if (pendingItems.length === 0) return;
    if (pendingItems.length > 100) {
      alert("Please process max 100 screenshots at a time.");
      return;
    }

    setBulkState({
      isProcessing: true,
      total: pendingItems.length,
      completed: 0,
      success: 0,
      failed: 0,
      errors: [],
      isComplete: false
    });

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const processItem = async (pair: ScreenshotPair, retries = 2): Promise<boolean> => {
      if (signal.aborted) return false;
      updatePairStatus(pair.id, { status: 'analyzing', errorMessage: undefined });

      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Request timed out (30s)")), 30000)
        );

        const payload: LlmRequestPayload = {
          screenshotId: pair.id,
          enImageBase64: pair.enImageUrl,
          deImageBase64: pair.deImageUrl,
          targetLanguage: pair.targetLanguage,
          glossaryText,
          reportLanguage: appLanguage // Pass current language
        };

        const response: any = await Promise.race([
           callTranslationQaLLM(payload),
           timeoutPromise
        ]);

        updatePairStatus(pair.id, { status: 'completed', report: response.report });
        return true;

      } catch (error: any) {
        if (retries > 0 && !signal.aborted) {
          return processItem(pair, retries - 1);
        }
        
        const msg = error instanceof Error ? error.message : "Unknown error";
        updatePairStatus(pair.id, { status: 'failed', errorMessage: msg });
        
        setBulkState(prev => ({
          ...prev,
          errors: [...prev.errors, { id: pair.id, fileName: pair.fileName, error: msg }]
        }));
        return false;
      }
    };

    const concurrency = 5;
    const queue = [...pendingItems];
    const workers = Array(concurrency).fill(null).map(async () => {
      while(queue.length > 0 && !signal.aborted) {
        const item = queue.shift();
        if (item) {
          const success = await processItem(item);
          setBulkState(prev => ({
            ...prev,
            completed: prev.completed + 1,
            success: success ? prev.success + 1 : prev.success,
            failed: success ? prev.failed : prev.failed + 1
          }));
        }
      }
    });

    await Promise.all(workers);
    setBulkState(prev => ({ ...prev, isProcessing: false, isComplete: true }));
    abortControllerRef.current = null;
  };

  const generateSummaryCsv = () => {
    const criticalItems = pairs.filter(p => 
      p.report && 
      p.report.overall && 
      (p.report.overall.qualityLevel === 'Critical' || p.report.overall.qualityLevel === 'Poor')
    );

    if (criticalItems.length === 0) {
      alert("No 'Critical' or 'Poor' items found to export.");
      return;
    }

    const headers = ["Screenshot ID", "File Name", "Quality Level", "Total Issues", "Major Issues", "Critical Issues", "Main Problems"];
    const rows = criticalItems.map(p => {
      const r = p.report!;
      return [
        r.screenshotId,
        `"${p.fileName.replace(/"/g, '""')}"`,
        r.overall.qualityLevel,
        r.issues.length,
        r.summary.majorCount,
        r.summary.severeCount,
        `"${r.overall.mainProblemsSummary.replace(/"/g, '""')}"`
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LQA_Defect_Summary_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateBulkZip = async () => {
    const completedPairs = pairs.filter(p => p.status === 'completed' && p.report && p.report.overall);
    if (completedPairs.length === 0) {
      alert("No completed reports to download.");
      return;
    }

    const zip = new JSZip();
    for (const pair of completedPairs) {
        // Use the shared generator function
        const html = generateReportHtml(pair.report!, pair.fileName, pair.targetLanguage);
        
        // Use standard filename logic
        const filename = generateExportFilename(pair.report!, pair.fileName, pair.targetLanguage);
        
        zip.file(filename, html);
        zip.file(`${filename.replace('.html', '.json')}`, JSON.stringify(pair.report, null, 2));
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    const distinctLangs = new Set(completedPairs.map(p => p.targetLanguage));
    const langCode = distinctLangs.size === 1 ? [...distinctLangs][0] : 'Mixed';
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `VisionLQA_${langCode}_${dateStr}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedPair = pairs.find(p => p.id === selectedPairId) || null;
  const pendingCount = pairs.filter(p => p.status === 'pending' || p.status === 'failed').length;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900">
      
      <Suspense fallback={null}>
         {isBulkModalOpen && (
           <BulkRunModal 
             isOpen={isBulkModalOpen}
             state={bulkState}
             pendingCount={pendingCount}
             onClose={() => setIsBulkModalOpen(false)}
             onCancel={handleCancelBulk}
             onStart={startBulkAnalysis}
             onDownloadCsv={generateSummaryCsv}
             onDownloadZip={generateBulkZip}
             t={t}
           />
         )}
      </Suspense>

      {/* Navbar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0 z-20 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-accent p-1.5 rounded text-white">
            <Layers className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800 hidden md:block">{t.title}</h1>
          <h1 className="text-lg font-bold tracking-tight text-slate-800 md:hidden">Vision LQA</h1>
          
          <div className="h-5 w-px bg-slate-200 mx-1"></div>
          
          <button 
             onClick={handleStartOver}
             className="flex items-center space-x-1.5 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 px-2 py-1.5 rounded text-xs font-medium transition-colors border border-slate-200"
             title={t.startOver}
           >
             <RotateCcw className="w-3.5 h-3.5" />
             <span>{t.startOver}</span>
           </button>
        </div>

        <div className="flex items-center space-x-4">
           
           <div className="hidden md:flex flex-col items-end mr-2">
             <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-700 tracking-tight">{LLM_DISPLAY_NAME}</span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded border border-slate-200">{APP_VERSION}</span>
             </div>
             <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-medium text-emerald-600">Active</span>
             </div>
           </div>

           <div className="h-6 w-px bg-slate-200"></div>

           {/* Language Switcher */}
           <button 
             onClick={toggleLanguage}
             className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-xs font-bold transition-colors"
           >
             <Globe className="w-3.5 h-3.5" />
             <span>{appLanguage === 'zh' ? '中文' : 'EN'}</span>
           </button>
           
           <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

           <button 
             onClick={handleOpenBulkModal}
             className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors shadow-sm"
             title={t.runBulk}
           >
             <PlayCircle className="w-4 h-4" />
             <span>{t.runBulk} ({pendingCount})</span>
           </button>

           <div className="h-6 w-px bg-slate-200"></div>
           
           <button onClick={loadDemoData} className="text-xs font-medium text-accent hover:underline">
             {t.loadDemo}
           </button>
           
           <button 
            onClick={() => setActiveRightPanel('global')}
            className={`flex items-center space-x-1 text-sm font-medium px-3 py-1.5 rounded transition-colors ${activeRightPanel === 'global' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
           >
             <Activity className="w-4 h-4" />
             <span>{t.globalStats}</span>
           </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        
        <aside className={`${isSidebarOpen ? 'w-80' : 'w-0'} flex flex-col bg-white border-r border-slate-200 transition-all duration-300 relative shrink-0`}>
          
          {/* Onboarding Banner */}
          {showOnboarding && (
              <div className="bg-indigo-50 border-b border-indigo-100 p-4">
                  <div className="flex items-start mb-2">
                      <BookDown className="w-4 h-4 text-indigo-600 mr-2 mt-0.5" />
                      <div>
                          <h4 className="text-sm font-bold text-indigo-900">{t.glossary.onboardingTitle}</h4>
                          <p className="text-xs text-indigo-700 leading-snug mt-1">{t.glossary.onboardingDesc}</p>
                      </div>
                  </div>
                  <div className="flex space-x-2 mt-3 pl-6">
                      <button 
                         onClick={() => handleOnboardingAction('de-DE')}
                         className="flex-1 bg-white border border-indigo-200 text-indigo-800 text-xs font-bold py-1.5 px-2 rounded shadow-sm hover:bg-indigo-600 hover:text-white transition-colors"
                      >
                         🇩🇪 Load DE
                      </button>
                      <button 
                         onClick={() => handleOnboardingAction('fr-FR')}
                         className="flex-1 bg-white border-indigo-200 text-indigo-800 text-xs font-bold py-1.5 px-2 rounded shadow-sm hover:bg-indigo-600 hover:text-white transition-colors"
                      >
                         🇫🇷 Load FR
                      </button>
                  </div>
                  <button 
                     onClick={skipOnboarding}
                     className="w-full text-center text-[10px] text-indigo-400 mt-2 hover:text-indigo-600"
                  >
                     Skip for now
                  </button>
              </div>
          )}

          <div className="p-4 border-b border-slate-100">
            <UploadArea onPairsCreated={handlePairsCreated} t={t} />
          </div>
          
          <div className="p-0 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center text-xs font-bold text-slate-500 p-4 pb-2">
               <BookOpen className="w-3 h-3 mr-1" />
               {t.projectContext}
            </div>
            
            <GlossaryManager 
              ref={glossaryManagerRef}
              currentGlossary={glossaryText}
              onUpdate={setGlossaryText}
              onLangDetected={setGlossaryDetectedLang}
              t={t}
            />
          </div>

          <div className="p-2 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3 flex justify-between items-center relative z-10">
            <span>{t.screenshotsList} ({pairs.length})</span>
            {pairs.length > 0 && (
                <button 
                    type="button"
                    onClick={(e) => handleClearScreenshots(e)}
                    className="text-[10px] text-red-500 hover:bg-red-50 px-2 py-0.5 rounded flex items-center border border-red-200 transition-colors cursor-pointer"
                    title={t.clearList}
                >
                    <Trash2 className="w-3 h-3 mr-1" />
                    {t.glossary.clear}
                </button>
            )}
          </div>
          
          <PairList 
            pairs={pairs} 
            selectedId={selectedPairId} 
            onSelect={(id) => {
              setSelectedPairId(id);
              setActiveRightPanel('report');
            }} 
          />
        </aside>

        <button 
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="absolute bottom-4 left-4 z-50 p-2 bg-white border border-slate-300 rounded-full shadow-md text-slate-600 hover:bg-slate-50"
          style={{ left: isSidebarOpen ? '19rem' : '1rem' }}
        >
          {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        <section className="flex-1 relative bg-slate-200 overflow-hidden flex flex-col min-w-0">
          <CompareView 
            pair={selectedPair} 
            t={t} 
            hoveredIssueId={hoveredIssueId}
            activeIssueId={activeIssueId}
            onIssueHover={setHoveredIssueId}
            onIssueClick={setActiveIssueId}
          />
        </section>

        {/* Resizer Handle */}
        <div
          className={`w-1 hover:w-1.5 cursor-col-resize z-30 transition-all delay-75 flex items-center justify-center group ${isResizingRight ? 'bg-accent w-1.5' : 'bg-slate-200 hover:bg-blue-300'}`}
          onMouseDown={startResizingRight}
        >
            <div className={`h-8 w-0.5 rounded-full transition-colors ${isResizingRight ? 'bg-white' : 'bg-slate-400 group-hover:bg-white'}`}></div>
        </div>

        <aside 
            className="flex flex-col bg-white shrink-0 shadow-xl z-10 relative"
            style={{ width: `${rightPanelWidth}px` }}
        >
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">Loading module...</p>
            </div>
          }>
            {activeRightPanel === 'global' ? (
              <GlobalSummary pairs={pairs} t={t} />
            ) : (
              <ReportPanel 
                pair={selectedPair} 
                onGenerate={handleGenerateReport}
                isGenerating={selectedPair?.status === 'analyzing'}
                glossary={glossaryText}
                t={t}
                hoveredIssueId={hoveredIssueId}
                activeIssueId={activeIssueId}
                onIssueHover={setHoveredIssueId}
                onIssueClick={setActiveIssueId}
              />
            )}
          </Suspense>
        </aside>

      </main>
    </div>
  );
};

export default App;