import React, { useState, useEffect } from 'react';
import { BatchStats } from '../types';

interface BatchProgressPanelProps {
  stats: BatchStats;
}

export const BatchProgressPanel: React.FC<BatchProgressPanelProps> = ({ stats }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (stats.isActive) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [stats.isActive]);

  if (!stats.isActive && !stats.isComplete) return null;

  if (stats.isComplete) {
    const durationMs = (stats.endTime || Date.now()) - stats.startTime;
    const mins = Math.floor(durationMs / 60000);
    const secs = Math.floor((durationMs % 60000) / 1000);
    
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">批量分析完成</h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
          <div>📸 {stats.total} 张截图已分析</div>
          <div>⏱️ 总耗时: {mins} 分 {secs} 秒</div>
          <div className="col-span-2">🔴 Critical: {stats.criticalCount} · 🟠 Major: {stats.majorCount} · 🟡 Minor: {stats.minorCount}</div>
          {stats.suggestedReverifyCount > 0 && (
            <div className="col-span-2 text-amber-600 font-medium">
              ⚠️ 建议复查: {stats.suggestedReverifyCount} 张（issue 数量异常高或包含严重问题）
            </div>
          )}
        </div>
      </div>
    );
  }

  const elapsedMs = now - stats.startTime;
  const avgTimeMs = stats.completed > 0 ? elapsedMs / stats.completed : 0;
  const remainingMs = avgTimeMs * (stats.total - stats.completed);
  const remainingMins = Math.max(0, Math.floor(remainingMs / 60000));
  
  const progressPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium text-slate-700">批量分析进度</span>
        <span className="text-slate-500">预计剩余: ~{remainingMins} 分钟</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
        <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }}></div>
      </div>
      <div className="text-xs text-slate-500 text-center">
        {stats.completed} / {stats.total} 完成 · 平均 {Math.round(avgTimeMs / 1000)} 秒/张 · 已发现 {stats.totalIssues} 个 issues
      </div>
    </div>
  );
};
