import React from 'react';
import { Shield, User, Trash2, RefreshCw, Cpu, Sparkles } from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onClearTickets, 
  onResetData, 
  onRunAllTickets,
  isClearing, 
  isResetting,
  isRunningAll
}) {
  const [llmStatus, setLlmStatus] = React.useState({
    provider: 'groq',
    model: 'openai/gpt-oss-120b',
    groq_keys_count: 0
  });

  React.useEffect(() => {
    fetch('http://127.0.0.1:8000/api/agent/status')
      .then(res => res.json())
      .then(data => setLlmStatus(data))
      .catch(() => {});
  }, []);

  const badgeText = React.useMemo(() => {
    if (llmStatus.provider === 'groq') {
      const keysInfo = llmStatus.groq_keys_count > 1 ? ` (${llmStatus.groq_keys_count} Keys Failover)` : '';
      return `Groq ${llmStatus.model || 'gpt-oss-120b'}${keysInfo}`;
    }
    if (llmStatus.provider === 'openai') {
      return `OpenAI ${llmStatus.model}`;
    }
    return `Gemini 2.5 Active`;
  }, [llmStatus]);

  return (
    <header className="border-b border-slate-800 bg-[#0f172a]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <div className="w-full h-full bg-[#0f172a] rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  QuickRes
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Agentic AI
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Autonomous Ticket Resolution & Verification System</p>
            </div>
          </div>

          {/* Navigation Tabs (Only Resolver Dashboard & Customer Portal) */}
          <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('resolver')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'resolver'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Resolver Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('customer')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'customer'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Customer Portal</span>
            </button>
          </nav>

          {/* Action Buttons & Status */}
          <div className="flex items-center space-x-2">
            <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono text-emerald-400">{badgeText}</span>
            </div>

            {onRunAllTickets && (
              <button
                onClick={onRunAllTickets}
                disabled={isRunningAll}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-md shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50"
                title="Run autonomous AI agent across all pending tickets"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isRunningAll ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isRunningAll ? 'Processing All...' : 'Run All Tickets'}</span>
              </button>
            )}

            <button
              onClick={onClearTickets}
              disabled={isClearing}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 transition disabled:opacity-50"
              title="Clear all tickets, messages, and traces from the database"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isClearing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Clear Tickets</span>
            </button>

            <button
              onClick={onResetData}
              disabled={isResetting}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
              title="Re-seed sample demo tickets from Bitext dataset"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">Load Sample Tickets</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
