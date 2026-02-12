import React, { useState, useRef, useEffect } from 'react';
import { ScreenshotPair } from '../types';
import { ZoomIn, ZoomOut, Maximize, ArrowDown, GalleryHorizontal, GalleryVertical, ArrowUpDown } from 'lucide-react';

interface CompareViewProps {
  pair: ScreenshotPair | null;
  t: any;
}

type LayoutMode = 'horizontal' | 'vertical';

export const CompareView: React.FC<CompareViewProps> = ({ pair, t }) => {
  // Initialize from LocalStorage or responsive default
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    const saved = localStorage.getItem('vision_lqa_layout');
    if (saved === 'horizontal' || saved === 'vertical') return saved;
    // Default to vertical on smaller screens, horizontal on larger
    return window.innerWidth < 1024 ? 'vertical' : 'horizontal';
  });

  const [zoom, setZoom] = useState(1);
  const [gapSize, setGapSize] = useState<number>(() => {
    const saved = localStorage.getItem('vision_lqa_gap');
    return saved ? parseInt(saved, 10) : 32; // Default to 32px (gap-8)
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  
  const handleLayoutChange = (mode: LayoutMode) => {
    setLayoutMode(mode);
    localStorage.setItem('vision_lqa_layout', mode);
  };

  const handleGapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setGapSize(val);
    localStorage.setItem('vision_lqa_gap', String(val));
  };

  const isVertical = layoutMode === 'vertical';

  if (!pair) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
        <Maximize className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">Select a screenshot pair to compare</p>
      </div>
    );
  }

  const targetLabel = pair.targetLanguage; 

  // Base width configuration
  const baseWidth = 650;
  const currentImageWidth = baseWidth * zoom;

  return (
    <div className="h-full flex flex-col bg-slate-200 relative overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-14 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center justify-center px-6 shrink-0 z-20 shadow-sm relative">
        
        {/* Controls Container */}
        <div className="flex items-center space-x-4">
            
            {/* Layout Toggle */}
            <div className="bg-slate-100 border border-slate-200 rounded-lg p-1 flex items-center space-x-1">
                <button
                    onClick={() => handleLayoutChange('horizontal')}
                    className={`p-1.5 rounded-md transition-all flex items-center justify-center ${!isVertical ? 'bg-white text-accent shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
                    title={t.layout.horizontal}
                >
                    <GalleryHorizontal className="w-4 h-4" />
                </button>
                <button
                    onClick={() => handleLayoutChange('vertical')}
                    className={`p-1.5 rounded-md transition-all flex items-center justify-center ${isVertical ? 'bg-white text-accent shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
                    title={t.layout.vertical}
                >
                    <GalleryVertical className="w-4 h-4" />
                </button>
            </div>

            <div className="w-px h-5 bg-slate-300/50"></div>

            {/* Gap Slider Control */}
            <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5" title="Adjust spacing">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <input 
                    type="range" 
                    min="0" 
                    max="200" 
                    step="8"
                    value={gapSize} 
                    onChange={handleGapChange}
                    className="w-20 h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-slate-600 hover:accent-accent focus:outline-none"
                />
            </div>

            <div className="w-px h-5 bg-slate-300/50"></div>

            {/* Zoom Controls */}
            <div className="bg-slate-100 border border-slate-200 rounded-full px-1 py-1 flex items-center space-x-1">
            <button 
                onClick={handleZoomOut} 
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-full text-slate-600 transition-all disabled:opacity-50"
                title="Zoom Out"
                disabled={zoom <= 0.5}
            >
                <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono w-12 text-center font-bold text-slate-700 select-none">
                {(zoom * 100).toFixed(0)}%
            </span>
            <button 
                onClick={handleZoomIn} 
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-full text-slate-600 transition-all disabled:opacity-50"
                title="Zoom In"
                disabled={zoom >= 3}
            >
                <ZoomIn className="w-4 h-4" />
            </button>
            </div>
        </div>
      </div>

      {/* Viewing Area */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-slate-200 relative custom-scrollbar">
        
        {/* 
            Layout Container 
            - isVertical ? flex-col : flex-row
            - transitions for smooth re-ordering
            - Gap controlled by state style
        */}
        <div 
            style={{ gap: `${gapSize}px` }}
            className={`
                flex p-8 min-w-fit mx-auto transition-all duration-300 ease-in-out
                ${isVertical ? 'flex-col items-center pb-20' : 'flex-row justify-center items-start'}
            `}
        >
          
          {/* Source Image Card */}
          <div 
            className="flex-col flex-shrink-0 transition-all duration-300 ease-out relative" 
            style={{ width: `${currentImageWidth}px` }}
          >
             {/* Floating Badge: Source */}
            <div className="absolute -top-3 left-4 z-10 flex items-center gap-2 max-w-[calc(100%-2rem)]">
                <div className="bg-slate-700 text-white px-3 py-1 rounded shadow-lg text-xs font-bold tracking-wide flex items-center border border-slate-600 shrink-0">
                    <span className="opacity-75 mr-1.5 font-normal uppercase">{t.source}</span>
                    <span>en-US</span>
                </div>
                {/* Filename Badge */}
                <div className="bg-white/90 backdrop-blur text-slate-700 px-2 py-1 rounded shadow-sm text-[11px] font-medium border border-slate-300/80 truncate min-w-0" title={pair.fileName}>
                    {pair.fileName}
                </div>
            </div>

            <div className="relative bg-white shadow-xl rounded-lg overflow-hidden group border border-slate-300">
              <img src={pair.enImageUrl} alt="en-US" className="w-full h-auto block" />
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-slate-400 pointer-events-none transition-colors"></div>
            </div>
          </div>

          {/* Visual Separator for Vertical Mode */}
          {isVertical && (
              <div className="text-slate-400 animate-bounce">
                  <ArrowDown className="w-6 h-6" />
              </div>
          )}

          {/* Target Language Card */}
          <div 
            className="flex-col flex-shrink-0 transition-all duration-300 ease-out relative" 
            style={{ width: `${currentImageWidth}px` }}
          >
            {/* Floating Badge: Target - Dynamically moves with the image */}
            <div className="absolute -top-3 left-4 z-10 flex items-center gap-2 max-w-[calc(100%-2rem)]">
                <div className="bg-purple-600 text-white px-3 py-1 rounded shadow-lg text-xs font-bold tracking-wide flex items-center border border-purple-500 shrink-0">
                    <span className="opacity-75 mr-1.5 font-normal uppercase">{t.target}</span>
                    <span>{targetLabel}</span>
                </div>
                {/* Filename Badge */}
                <div className="bg-white/90 backdrop-blur text-slate-700 px-2 py-1 rounded shadow-sm text-[11px] font-medium border border-slate-300/80 truncate min-w-0" title={pair.fileName}>
                    {pair.fileName}
                </div>
            </div>

            <div className="relative bg-white shadow-xl rounded-lg overflow-hidden group border border-slate-300">
              <img src={pair.deImageUrl} alt={targetLabel} className="w-full h-auto block" />
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-purple-500 pointer-events-none transition-colors"></div>
              
              {/* Issues Overlay */}
              {pair.report?.issues?.map(issue => (
                issue.boundingBox && (
                  <div 
                    key={issue.id}
                    className={`absolute border-2 ${issue.severity === 'Critical' ? 'border-red-500 bg-red-500/10' : 'border-orange-400 bg-orange-400/10'}`}
                    style={{
                      left: `${issue.boundingBox.x * 100}%`,
                      top: `${issue.boundingBox.y * 100}%`,
                      width: `${issue.boundingBox.width * 100}%`,
                      height: `${issue.boundingBox.height * 100}%`
                    }}
                    title={issue.description}
                  >
                    <span className="absolute -top-5 left-0 text-[10px] bg-red-600 text-white px-1 rounded shadow-sm whitespace-nowrap z-10 font-mono">
                      {issue.id}
                    </span>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};