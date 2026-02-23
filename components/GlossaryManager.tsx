import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FileSpreadsheet, Upload, History, Trash2, Check, AlertCircle, FileText, Loader2, Layers, Plus, X, Database, BookDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PRESET_GLOSSARIES } from '../services/terminologyManifest';

export interface GlossaryManagerRef {
  loadPreset: (lang: 'fr-FR' | 'de-DE') => Promise<void>;
}

interface GlossaryManagerProps {
  currentGlossary: string;
  onUpdate: (text: string) => void;
  onLangDetected?: (lang: 'de-DE' | 'fr-FR' | null) => void;
  t: any;
}

interface GlossaryHistoryItem {
  name: string;
  date: string;
  count: number;
  content: string;
}

interface LoadedFile {
  id: string;
  name: string;
  count: number;
  terms: string[]; // Array of "Source = Target"
}

export const GlossaryManager = forwardRef<GlossaryManagerRef, GlossaryManagerProps>(({ currentGlossary, onUpdate, onLangDetected, t }, ref) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('import'); // Default to import
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [uploadMode, setUploadMode] = useState<'replace' | 'append'>('append'); // Default to append usually safer
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);

  const [history, setHistory] = useState<GlossaryHistoryItem[]>([]);
  const [totalTerms, setTotalTerms] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vision_lqa_glossary_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load glossary history", e);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'import') {
        recompileGlossary(loadedFiles);
    }
  }, [loadedFiles]);

  const saveToHistory = (name: string, content: string, count: number) => {
    const newItem: GlossaryHistoryItem = {
      name,
      date: new Date().toLocaleString(),
      count,
      content
    };
    const newHistory = [newItem, ...history].slice(0, 3);
    setHistory(newHistory);
    localStorage.setItem('vision_lqa_glossary_history', JSON.stringify(newHistory));
  };

  const detectLanguageFromFile = (filename: string): 'de-DE' | 'fr-FR' | null => {
      const lower = filename.toLowerCase();
      if (lower.includes('de') || lower.includes('ger') || lower.includes('deutsch')) return 'de-DE';
      if (lower.includes('fr') || lower.includes('fre') || lower.includes('french')) return 'fr-FR';
      return null;
  };

  const recompileGlossary = (files: LoadedFile[]) => {
    if (files.length === 0) {
        setTotalTerms(0);
        onUpdate("");
        if (onLangDetected) onLangDetected(null);
        return;
    }

    const termMap = new Map<string, string>();
    const fileLangs = new Set<'de-DE' | 'fr-FR'>();
    let termCounter = 1; // Global counter for unique IDs across all files

    files.forEach(file => {
        const detected = detectLanguageFromFile(file.name);
        if (detected) fileLangs.add(detected);

        file.terms.forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const sourceKey = parts[0].trim().toLowerCase();
                // Generate Unique ID e.g. TERM-001
                const termId = `TERM-${String(termCounter++).padStart(3, '0')}`;
                // Tag each term with ID and source file for traceability and grounding
                // Format: [ID:TERM-001] Source = Target [source: filename]
                termMap.set(sourceKey, `[ID:${termId}] ${line} [source: ${file.name}]`);
            }
        });
    });

    if (onLangDetected) {
        if (fileLangs.has('de-DE') && !fileLangs.has('fr-FR')) onLangDetected('de-DE');
        else if (fileLangs.has('fr-FR') && !fileLangs.has('de-DE')) onLangDetected('fr-FR');
        else onLangDetected(null);
    }

    const uniqueTerms = Array.from(termMap.values());
    const mergedContent = uniqueTerms.join('\n');
    
    setTotalTerms(uniqueTerms.length);
    onUpdate(mergedContent);
  };

  const handleResetContext = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (window.confirm("Are you sure you want to remove all loaded glossary files?")) {
          setLoadedFiles([]);
          onUpdate("");
      }
  };

  const processFileContent = async (file: File): Promise<string[]> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) throw new Error("Empty file");

    const keys = Object.keys(jsonData[0]);
    let sourceKey = keys.find(k => /source|en|english/i.test(k));
    let targetKey = keys.find(k => /target|de|fr|german|french|trans/i.test(k));

    if (!sourceKey) sourceKey = keys[0];
    if (!targetKey && keys.length > 1) targetKey = keys[1];

    if (!sourceKey || !targetKey) throw new Error(t.glossary.errorFormat);

    return jsonData.map(row => {
      const src = row[sourceKey!] ? String(row[sourceKey!]).trim() : '';
      const tgt = row[targetKey!] ? String(row[targetKey!]).trim() : '';
      return src && tgt ? `${src} = ${tgt}` : null;
    }).filter(Boolean) as string[];
  };

  const handleFileUpload = async (file: File) => {
    setIsParsing(true);
    setError(null);

    try {
      const terms = await processFileContent(file);
      const content = terms.join('\n');

      const newFileObj: LoadedFile = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          count: terms.length,
          terms: terms
      };

      if (uploadMode === 'replace') {
          setLoadedFiles([newFileObj]);
      } else {
          setLoadedFiles(prev => [...prev, newFileObj]);
      }

      saveToHistory(file.name, content, terms.length);

    } catch (err: any) {
      setError(err.message || "Failed to parse file");
    } finally {
      setIsParsing(false);
    }
  };

  const removeFile = (idToRemove: string) => {
      setLoadedFiles(prev => prev.filter(f => f.id !== idToRemove));
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.size > 50 * 1024 * 1024) {
        setError("File size exceeds 50MB");
        return;
      }
      handleFileUpload(file);
    }
  };

  // Exposed method to load presets via Ref
  const fetchDefaultGlossary = async (lang: 'fr-FR' | 'de-DE') => {
    setIsParsing(true);
    setError(null);
    
    try {
        const presets = PRESET_GLOSSARIES[lang];
        if (!presets || presets.length === 0) {
            throw new Error(`No presets found for ${lang}`);
        }

        const newFiles: LoadedFile[] = [];
        
        // Cache busting timestamp
        const cacheBuster = `?t=${Date.now()}`;
        
        // Use Vite's BASE_URL to correctly resolve public assets in all environments
        // This fixes the issue where absolute paths failed in preview/sub-path deployments
        const metaEnv = (import.meta as any).env || {};
        const rawBaseUrl = metaEnv.BASE_URL || '/';
        const baseUrl = rawBaseUrl.endsWith('/') 
            ? rawBaseUrl 
            : rawBaseUrl + '/';

        // Fetch all preset files in parallel
        await Promise.all(presets.map(async (preset) => {
            // Construct the full path: BASE_URL + Relative Path + Cache Buster
            // e.g., /my-app/terminologies/fr/file.xlsx?t=123
            const fullPath = `${baseUrl}${preset.path}${cacheBuster}`;
            
            const response = await fetch(fullPath);
            
            if (!response.ok) {
                console.error(`Fetch Failed: ${fullPath} returned ${response.status}`);
                throw new Error(`Failed to fetch ${preset.name} (Status: ${response.status}). Ensure file exists in /public/${preset.path}`);
            }
            
            const blob = await response.blob();
            // Convert Blob to File to reuse existing processing logic
            const file = new File([blob], preset.name, { type: blob.type });
            const terms = await processFileContent(file);

            newFiles.push({
                id: Math.random().toString(36).substr(2, 9),
                name: preset.name,
                count: terms.length,
                terms: terms
            });
        }));
        
        // Wait a bit for UI smoothness
        await new Promise(r => setTimeout(r, 400));

        // Always replace when loading a full preset set (usually initial load)
        // or append if user explicitly chose append mode.
        if (loadedFiles.length === 0 || uploadMode === 'replace') {
            setLoadedFiles(newFiles);
        } else {
            setLoadedFiles(prev => [...prev, ...newFiles]);
        }

    } catch (e: any) {
        console.error("Preset load error:", e);
        setError(`${e.message}`);
    } finally {
        setIsParsing(false);
    }
  };

  useImperativeHandle(ref, () => ({
    loadPreset: fetchDefaultGlossary
  }));

  // Helper to check if a specific language is already loaded
  const isLangLoaded = (lang: 'de' | 'fr') => {
      return loadedFiles.some(f => detectLanguageFromFile(f.name) === (lang === 'de' ? 'de-DE' : 'fr-FR'));
  };

  return (
    <div className="flex flex-col bg-slate-50 border-t border-slate-100 h-[340px]">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white shrink-0">
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center space-x-2 border-b-2 transition-colors ${activeTab === 'import' ? 'border-accent text-accent bg-slate-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{t.glossary.tabImport}</span>
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center space-x-2 border-b-2 transition-colors ${activeTab === 'manual' ? 'border-accent text-accent bg-slate-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{t.glossary.tabManual}</span>
        </button>
      </div>

      <div className="flex-1 p-0 relative overflow-hidden flex flex-col">
        {activeTab === 'manual' && (
          <textarea 
            className="w-full h-full p-4 text-xs border-0 resize-none focus:ring-0 bg-slate-50 text-slate-700 leading-relaxed font-mono"
            placeholder="e.g. Site = Standort..."
            value={currentGlossary}
            onChange={(e) => onUpdate(e.target.value)}
          />
        )}

        {activeTab === 'import' && (
          <div className="flex flex-col h-full">
            
            {/* Header / Mode Switcher */}
            <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
               <div className="flex bg-slate-100 rounded-lg p-0.5">
                  <button 
                     onClick={() => setUploadMode('append')}
                     className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${uploadMode === 'append' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                     {t.glossary.modeAppend}
                  </button>
                  <button 
                     onClick={() => setUploadMode('replace')}
                     className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${uploadMode === 'replace' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                     {t.glossary.modeReplace}
                  </button>
               </div>
               
               {totalTerms > 0 && (
                 <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {totalTerms} Terms
                    </span>
                 </div>
               )}
            </div>
            
            {/* Preset Buttons Header */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex space-x-2 shrink-0 justify-center">
                 <button 
                     onClick={() => fetchDefaultGlossary('de-DE')}
                     disabled={isLangLoaded('de') || isParsing}
                     className={`text-[10px] px-3 py-1.5 rounded-full border transition-all flex items-center space-x-1
                         ${isLangLoaded('de') 
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 cursor-default' 
                            : 'bg-white text-slate-600 border-slate-300 hover:border-accent hover:text-accent shadow-sm'}`}
                 >
                     <span>{isLangLoaded('de') ? <Check className="w-3 h-3" /> : '🇩🇪'}</span>
                     <span>{isLangLoaded('de') ? t.glossary.presetLoaded : t.glossary.defaultDe}</span>
                 </button>
                 <button 
                     onClick={() => fetchDefaultGlossary('fr-FR')}
                     disabled={isLangLoaded('fr') || isParsing}
                     className={`text-[10px] px-3 py-1.5 rounded-full border transition-all flex items-center space-x-1
                         ${isLangLoaded('fr') 
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 cursor-default' 
                            : 'bg-white text-slate-600 border-slate-300 hover:border-accent hover:text-accent shadow-sm'}`}
                 >
                     <span>{isLangLoaded('fr') ? <Check className="w-3 h-3" /> : '🇫🇷'}</span>
                     <span>{isLangLoaded('fr') ? t.glossary.presetLoaded : t.glossary.defaultFr}</span>
                 </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 bg-slate-50/50">
                
                {/* File List */}
                {loadedFiles.length > 0 ? (
                    <div className="space-y-2">
                        {loadedFiles.map(file => (
                            <div key={file.id} className="bg-white border border-slate-200 rounded-lg p-2.5 flex justify-between items-center group shadow-sm hover:border-slate-300 transition-colors">
                                <div className="flex items-center overflow-hidden min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center mr-3 shrink-0">
                                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div className="truncate">
                                        <div className="text-xs font-semibold text-slate-700 truncate" title={file.name}>{file.name}</div>
                                        <div className="text-[10px] text-slate-400 font-medium">
                                            {t.glossary.termCount.replace('{count}', file.count)}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => removeFile(file.id)}
                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                    title={t.glossary.removeFile}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
                        <Database className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-xs">{t.glossary.emptyState}</p>
                    </div>
                )}
            </div>

            {/* Bottom: Upload / Add More */}
            <div className="p-3 bg-white border-t border-slate-200 shrink-0 z-10 relative">
                {error && (
                    <div className="mb-2 p-2 bg-red-50 text-red-600 text-[10px] rounded flex items-start border border-red-100">
                        <AlertCircle className="w-3 h-3 mr-1.5 mt-0.5 shrink-0" />
                        {error}
                    </div>
                )}
                
                {!isParsing ? (
                    <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleFileDrop}
                        className={`border-2 border-dashed rounded-lg transition-all cursor-pointer relative group flex items-center justify-center
                            ${loadedFiles.length > 0 ? 'h-10' : 'h-24'}
                            ${isDragging ? 'border-accent bg-blue-50' : 'border-slate-300 hover:border-accent hover:bg-slate-50 bg-slate-50/50'}
                        `}
                    >
                        <input 
                            type="file" 
                            accept=".xlsx,.xls,.csv" 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]);
                            }}
                        />
                        
                        {loadedFiles.length > 0 ? (
                            <div className="flex items-center text-slate-500 group-hover:text-accent">
                                <Plus className="w-4 h-4 mr-2" />
                                <span className="text-xs font-medium">{t.glossary.dragDropCompact}</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <Upload className="w-5 h-5 mb-1 text-slate-400 group-hover:text-accent" />
                                <span className="text-xs font-medium text-slate-500 group-hover:text-accent">{t.glossary.dragDrop}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-10 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
                        <Loader2 className="w-4 h-4 animate-spin text-accent mr-2" />
                        <span className="text-xs text-slate-600 font-medium">{t.glossary.loadingPreset}</span>
                    </div>
                )}

                {/* Footer Action: Clear All (Only if files exist) */}
                {loadedFiles.length > 0 && (
                    <div className="mt-2 flex justify-end">
                        <button 
                            type="button"
                            onClick={(e) => handleResetContext(e)}
                            className="text-[10px] text-slate-400 hover:text-red-500 flex items-center transition-colors cursor-pointer"
                        >
                            <Trash2 className="w-3 h-3 mr-1" />
                            {t.glossary.resetAll}
                        </button>
                    </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

GlossaryManager.displayName = "GlossaryManager";