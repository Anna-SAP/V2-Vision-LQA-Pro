import React, { useMemo } from 'react';
import { ScreenshotPair } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PieChart as PieIcon, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

interface GlobalSummaryProps {
  pairs: ScreenshotPair[];
  t: any;
}

export const GlobalSummary: React.FC<GlobalSummaryProps> = ({ pairs, t }) => {
  const stats = useMemo(() => {
    const analyzed = pairs.filter(p => p.status === 'completed' && p.report);
    const pending = pairs.length - analyzed.length;
    
    let critical = 0, major = 0, minor = 0;
    const categoryCounts: Record<string, number> = {};

    analyzed.forEach(p => {
      if (p.report && p.report.issues) {
        critical += p.report.summary.severeCount;
        major += p.report.summary.majorCount;
        minor += p.report.summary.minorCount;
        
        p.report.issues.forEach(issue => {
          categoryCounts[issue.issueCategory] = (categoryCounts[issue.issueCategory] || 0) + 1;
        });
      }
    });

    const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

    return { analyzedCount: analyzed.length, pending, critical, major, minor, categoryData };
  }, [pairs]);

  return (
    <div className="h-full bg-slate-50 p-4 overflow-y-auto">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
        <PieIcon className="w-5 h-5 mr-2 text-accent" />
        {t.globalStats}
      </h2>

      {/* High Level Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
           <div className="text-2xl font-bold text-slate-800">{stats.analyzedCount}</div>
           <div className="text-xs text-slate-500">Screenshots Analyzed</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
           <div className="text-2xl font-bold text-slate-400">{stats.pending}</div>
           <div className="text-xs text-slate-500">Pending</div>
        </div>
      </div>

      {/* Issues Breakdown */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Total Issues Found</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mr-2" /> Critical
            </div>
            <span className="font-bold text-red-700">{stats.critical}</span>
          </div>
          <div className="w-full bg-red-100 h-2 rounded-full overflow-hidden">
             <div className="bg-red-500 h-full" style={{ width: `${Math.min(100, (stats.critical / (stats.critical + stats.major + stats.minor || 1)) * 100)}%` }}></div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-orange-700">
              <AlertTriangle className="w-4 h-4 mr-2" /> Major
            </div>
            <span className="font-bold text-orange-700">{stats.major}</span>
          </div>
          <div className="w-full bg-orange-100 h-2 rounded-full overflow-hidden">
             <div className="bg-orange-500 h-full" style={{ width: `${Math.min(100, (stats.major / (stats.critical + stats.major + stats.minor || 1)) * 100)}%` }}></div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-yellow-700">
              <CheckCircle className="w-4 h-4 mr-2" /> Minor
            </div>
            <span className="font-bold text-yellow-700">{stats.minor}</span>
          </div>
        </div>
      </div>

      {/* Category Chart */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 h-64 flex flex-col">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Issues by Category</h3>
        <div className="flex-1">
          {stats.categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoryData} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ fontSize: '12px' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  {stats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-300 text-xs">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Export Action */}
      <button className="w-full mt-4 flex items-center justify-center space-x-2 p-3 border border-slate-300 rounded-lg text-slate-600 hover:bg-white transition-colors text-sm">
        <FileText className="w-4 h-4" />
        <span>{t.exportGlobal}</span>
      </button>
    </div>
  );
};