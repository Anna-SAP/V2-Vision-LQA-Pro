import React from 'react';
import { ScreenshotPair } from '../types';
import { FileImage, CheckCircle2, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { determineStrictQuality } from '../services/reportGenerator';

interface PairListProps {
  pairs: ScreenshotPair[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const PairList: React.FC<PairListProps> = ({ pairs, selectedId, onSelect }) => {
  const getStatusIcon = (status: ScreenshotPair['status']) => {
    switch (status) {
      case 'analyzing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <div className="w-4 h-4 rounded-full border border-slate-300" />;
    }
  };

  const getQualityBadge = (pair: ScreenshotPair) => {
    if (pair.status !== 'completed' || !pair.report || !pair.report.overall) return null;
    
    // Use the shared strict logic to ensure list view matches detail view
    const level = determineStrictQuality(pair.report);
    
    const colorMap: Record<string, string> = {
      Critical: 'bg-red-100 text-red-800 border-red-200',
      Poor: 'bg-orange-100 text-orange-800 border-orange-200',
      Average: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      Good: 'bg-blue-100 text-blue-800 border-blue-200',
      Perfect: 'bg-green-100 text-green-800 border-green-200',
      Excellent: 'bg-green-100 text-green-800 border-green-200', // Handle Excellent same as Perfect
    };

    const badgeClass = colorMap[level] || 'bg-slate-100 text-slate-800 border-slate-200';

    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badgeClass} font-semibold ml-2`}>
        {level}
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {pairs.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          <FileImage className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No screenshots loaded</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {pairs.map((pair) => (
            <li 
              key={pair.id}
              onClick={() => onSelect(pair.id)}
              className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors border-l-4 ${selectedId === pair.id ? 'bg-blue-50 border-accent' : 'border-transparent'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(pair.status)}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${selectedId === pair.id ? 'text-accent' : 'text-slate-700'}`}>
                      {pair.fileName}
                    </p>
                    <div className="flex items-center mt-1 space-x-2">
                       <span className="text-xs text-slate-400">ID: {pair.id}</span>
                       {getQualityBadge(pair)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mini Stats if analyzed */}
              {pair.report && pair.report.overall && pair.report.summary && (
                <div className="mt-2 flex space-x-2 text-[10px] text-slate-500">
                  <span className="flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1"></span>
                    {pair.report.summary.severeCount} Crit
                  </span>
                  <span className="flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1"></span>
                    {pair.report.summary.majorCount} Maj
                  </span>
                  <span className="flex items-center">
                    Acc: {pair.report.overall.scores.accuracy}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};