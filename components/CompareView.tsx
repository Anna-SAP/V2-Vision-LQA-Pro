import React, { useState, useRef, useEffect } from 'react';
import { ScreenshotPair } from '../types';
import { ZoomIn, ZoomOut, Maximize, ArrowDown, GalleryHorizontal, GalleryVertical, ArrowUpDown } from 'lucide-react';

interface CompareViewProps {
  pair: ScreenshotPair | null;
  t: any;
  hoveredIssueId: string | null;
  activeIssueId: string | null;
  onIssueHover: (id: string | null) => void;
  onIssueClick: (id: string | null) => void;
}

type LayoutMode = 'horizontal' | 'vertical';

export const CompareView: React.FC<CompareViewProps> = ({ 
  pair, 
  t,
  hoveredIssueId,
  activeIssueId,
  onIssueHover,
  onIssueClick
}) => {
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
          <div className="flex items-start gap-3 flex-shrink-0 transition-all duration-300 ease-out">
            {/* Vertical Label - Sticky so it stays visible on tall images */}
            <div 
                className="bg-slate-700 text-white py-3 px-1.5 rounded shadow-sm text-xs font-bold tracking-wide flex items-center border border-slate-600 shrink-0 sticky top-8 z-10"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
                <span className="opacity-75 mb-1.5 font-normal uppercase">{t.source}</span>
                <span>en-US</span>
            </div>

            <div className="flex-col relative" style={{ width: `${currentImageWidth}px` }}>
                {/* Filename Badge - Moved above the image */}
                <div className="absolute bottom-full mb-2 left-0 z-10 max-w-full">
                    <div className="bg-white/90 backdrop-blur text-slate-700 px-2 py-1 rounded shadow-sm text-[11px] font-medium border border-slate-300/80 truncate" title={pair.fileName}>
                        {pair.fileName}
                    </div>
                </div>

                <div className="relative bg-white shadow-xl rounded-lg overflow-hidden group border border-slate-300">
                  <img src={pair.enImageUrl} alt="en-US" className="w-full h-auto block" />
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-slate-400 pointer-events-none transition-colors"></div>
                </div>
            </div>
          </div>

          {/* Visual Separator for Vertical Mode */}
          {isVertical && (
              <div className="text-slate-400 animate-bounce py-4">
                  <ArrowDown className="w-6 h-6" />
              </div>
          )}

          {/* Target Language Card */}
          <div className="flex items-start gap-3 flex-shrink-0 transition-all duration-300 ease-out">
            {/* Vertical Label - Sticky */}
            <div 
                className="bg-purple-600 text-white py-3 px-1.5 rounded shadow-sm text-xs font-bold tracking-wide flex items-center border border-purple-500 shrink-0 sticky top-8 z-10"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
                <span className="opacity-75 mb-1.5 font-normal uppercase">{t.target}</span>
                <span>{targetLabel}</span>
            </div>

            <div className="flex-col relative" style={{ width: `${currentImageWidth}px` }}>
                {/* Filename Badge - Moved above the image */}
                <div className="absolute bottom-full mb-2 left-0 z-10 max-w-full">
                    <div className="bg-white/90 backdrop-blur text-slate-700 px-2 py-1 rounded shadow-sm text-[11px] font-medium border border-slate-300/80 truncate" title={pair.fileName}>
                        {pair.fileName}
                    </div>
                </div>

                <div className="relative bg-white shadow-xl rounded-lg overflow-hidden group border border-slate-300">
                  <img src={pair.deImageUrl} alt={targetLabel} className="w-full h-auto block" />
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-purple-500 pointer-events-none transition-colors"></div>
                  
                  {/* Issues Overlay */}
                  {pair.report?.issues?.map(issue => {
                    if (!issue.boundingBox) return null;
                    
                    const isHovered = hoveredIssueId === issue.id;
                    const isActive = activeIssueId === issue.id;
                    const isHighlighted = isHovered || isActive;
                    
                    // Dimming logic: if ANY issue is highlighted, dim the others
                    const anyHighlighted = hoveredIssueId !== null || activeIssueId !== null;
                    const shouldDim = anyHighlighted && !isHighlighted;
                    
                    return (
                      <div 
                        key={issue.id}
                        onClick={() => onIssueClick(isActive ? null : issue.id)}
                        onMouseEnter={() => onIssueHover(issue.id)}
                        onMouseLeave={() => onIssueHover(null)}
                        className={`absolute border-2 cursor-pointer transition-all duration-300 ease-in-out z-20
                          ${issue.severity === 'Critical' ? 'border-red-500' : 'border-orange-400'}
                          ${isHighlighted ? (issue.severity === 'Critical' ? 'bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-orange-400/30 shadow-[0_0_15px_rgba(249,115,22,0.5)]') : (issue.severity === 'Critical' ? 'bg-red-500/10' : 'bg-orange-400/10')}
                          ${shouldDim ? 'opacity-20 grayscale' : 'opacity-100'}
                          ${isHighlighted ? 'animate-pulse' : ''}
                        `}
                        style={{
                          left: `${issue.boundingBox.x * 100}%`,
                          top: `${issue.boundingBox.y * 100}%`,
                          width: `${issue.boundingBox.width * 100}%`,
                          height: `${issue.boundingBox.height * 100}%`
                        }}
                        title={issue.description}
                      >
                        <span className={`absolute -top-6 left-0 text-[11px] text-white px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-30 font-mono transition-transform duration-200
                          ${issue.severity === 'Critical' ? 'bg-red-600' : 'bg-orange-500'}
                          ${isHighlighted ? 'scale-110 -translate-y-1' : 'scale-100'}
                        `}>
                          {issue.id}
                        </span>
                      </div>
                    );
                  })}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};