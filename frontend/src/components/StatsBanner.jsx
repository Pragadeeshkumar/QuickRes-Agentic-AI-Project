import React from 'react';
import { Bot, CheckCircle, AlertTriangle, Wrench, Zap, TrendingUp } from 'lucide-react';

export default function StatsBanner({ stats }) {
  const data = stats || {
    total_tickets: 0,
    auto_resolved_count: 0,
    pending_approvals: 0,
    resolved_count: 0,
    total_tool_calls: 0,
    auto_resolution_rate: 0
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
      {/* Stat 1 */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800/80 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Total Support Tickets</span>
          <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Bot className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white tracking-tight">{data.total_tickets}</span>
          <span className="text-xs text-emerald-400 font-medium flex items-center">
            <TrendingUp className="w-3 h-3 mr-0.5" /> Bitext Dataset
          </span>
        </div>
      </div>

      {/* Stat 2 */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800/80 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Auto-Resolution Rate</span>
          <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-emerald-400 tracking-tight">
            {data.auto_resolution_rate || 0}%
          </span>
          <span className="text-xs text-slate-400">
            ({data.auto_resolved_count} autonomous)
          </span>
        </div>
      </div>

      {/* Stat 3 */}
      <div className={`glass-panel p-4 rounded-xl border transition-all ${
        data.pending_approvals > 0 ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800/80'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Pending Human Approvals</span>
          <span className={`p-2 rounded-lg ${
            data.pending_approvals > 0 ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-slate-800 text-slate-400'
          }`}>
            <AlertTriangle className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className={`text-2xl font-bold tracking-tight ${
            data.pending_approvals > 0 ? 'text-amber-400' : 'text-white'
          }`}>
            {data.pending_approvals}
          </span>
          <span className="text-xs text-slate-400">High Risk Gated</span>
        </div>
      </div>

      {/* Stat 4 */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800/80 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Tools & RAG Searches</span>
          <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Wrench className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-cyan-400 tracking-tight">{data.total_tool_calls}</span>
          <span className="text-xs text-slate-400">LangGraph nodes</span>
        </div>
      </div>
    </div>
  );
}
