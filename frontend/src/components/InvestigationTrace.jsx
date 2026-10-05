import React, { useState } from 'react';
import { 
  Bot, Wrench, ShieldAlert, CheckCircle2, ChevronDown, 
  ChevronRight, Brain, AlertTriangle, ArrowRight, Eye, Code2, 
  FileText, ShieldCheck, Layers, Sparkles
} from 'lucide-react';

export default function InvestigationTrace({ traces, currentHypothesis }) {
  const [showDetailed, setShowDetailed] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState({});

  const toggleStep = (stepNumber) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepNumber]: !prev[stepNumber]
    }));
  };

  if (!traces || traces.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400">
        <Bot className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-medium text-slate-300">No investigation trace recorded yet.</p>
        <p className="text-xs text-slate-500 mt-1">Click "Run Agent Investigation" above to start the LangGraph cognitive loop.</p>
      </div>
    );
  }

  // Generate Executive Step-by-Step Summary from trace records
  const toolSteps = traces.filter(t => t.node_name === 'tool_execution' && t.tool_name);
  const reflectStep = traces.find(t => t.node_name === 'reflect' && t.reflection);
  const riskGateStep = traces.find(t => t.node_name === 'risk_gate');
  const maxRiskScore = traces.reduce((max, t) => (t.risk_score !== null && t.risk_score !== undefined && t.risk_score > max ? t.risk_score : max), 0);

  return (
    <div className="space-y-4">
      {/* 1. Executive Step-by-Step Summary (Default Clean View) */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Investigation Summary
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {traces.length} steps executed
          </span>
        </div>

        {/* Step-by-Step Summary Cards */}
        <div className="space-y-3 text-xs">
          {/* Summary Step 1: Data Gathering */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400 flex items-center">
                <Wrench className="w-3.5 h-3.5 mr-1.5 text-cyan-400" /> 1. Records & Tool Invocations
              </span>
              <span className="text-[10px] font-mono bg-cyan-950/60 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/40">
                {toolSteps.length} tools called
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Agent queried authorized tools:{' '}
              {toolSteps.length > 0 ? (
                toolSteps.map((ts, idx) => (
                  <span key={idx} className="font-mono font-semibold text-indigo-300 bg-slate-950 px-1.5 py-0.2 rounded mr-1 border border-slate-800">
                    {ts.tool_name}()
                  </span>
                ))
              ) : (
                <span className="italic text-slate-400">Context verified from ticket profile.</span>
              )}
            </p>
          </div>

          {/* Summary Step 2: Policy Verification */}
          {reflectStep && (
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 flex items-center">
                  <Eye className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> 2. Corporate Policy Reflection
                </span>
                <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/40">
                  Verified
                </span>
              </div>
              <p className="text-slate-200 leading-relaxed font-sans">
                {reflectStep.reflection}
              </p>
            </div>
          )}

          {/* Summary Step 3: Risk & Action Decision */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 flex items-center">
                <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> 3. Risk & Action Determination
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                maxRiskScore > 0.7 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                  : maxRiskScore > 0.3 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                Risk: {(maxRiskScore * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {riskGateStep?.thought || (maxRiskScore > 0.7 
                ? 'Action involves financial or replacement impact. Gated for Human Supervisor approval.' 
                : 'Inquiry verified as low-risk. Resolved autonomously.')}
            </p>
          </div>
        </div>

        {/* Toggle Detailed Steps Button */}
        <div className="pt-2 flex justify-center border-t border-slate-800/80">
          <button
            onClick={() => setShowDetailed(!showDetailed)}
            className="flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-700/80 transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showDetailed ? 'Hide Detailed Technical Steps' : 'Show Detailed Steps & Raw Payloads'}</span>
          </button>
        </div>
      </div>

      {/* 2. Collapsible Detailed Step Timeline */}
      {showDetailed && (
        <div className="relative pl-6 border-l-2 border-slate-800 space-y-4 animate-fadeIn">
          {traces.map((tr, idx) => {
            const isExpanded = expandedSteps[tr.step_number] !== false;

            return (
              <div key={tr.id || idx} className="relative group">
                {/* Step Marker */}
                <div className="absolute -left-[31px] top-3 w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center group-hover:border-indigo-500 transition">
                  <span className="text-[10px] font-mono font-bold text-slate-400">{tr.step_number}</span>
                </div>

                {/* Step Card */}
                <div className="glass-panel rounded-xl border border-slate-800/90 overflow-hidden shadow-sm hover:border-slate-700 transition">
                  {/* Step Header */}
                  <div 
                    onClick={() => toggleStep(tr.step_number)}
                    className="p-3 bg-slate-900/60 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        Step {tr.step_number}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase">
                        {tr.node_name}
                      </span>
                      {tr.tool_name && (
                        <span className="text-xs font-mono font-semibold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {tr.tool_name}()
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400 font-mono hidden sm:inline">{tr.timestamp?.split(' ')[1]}</span>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Step Content */}
                  {isExpanded && (
                    <div className="p-3.5 space-y-3 text-xs bg-slate-950/30">
                      {tr.thought && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-400">Agent Action & Decision:</span>
                          <p className="text-slate-200 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 leading-relaxed font-sans">
                            {tr.thought}
                          </p>
                        </div>
                      )}

                      {tr.reflection && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-400">Policy Reflection:</span>
                          <div className="text-emerald-200/90 bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-800/40 leading-relaxed">
                            {tr.reflection}
                          </div>
                        </div>
                      )}

                      {(tr.tool_input || tr.tool_output) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                          {tr.tool_input && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono uppercase text-slate-400">Input:</span>
                              <pre className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-36">
                                {JSON.stringify(tr.tool_input, null, 2)}
                              </pre>
                            </div>
                          )}
                          {tr.tool_output && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono uppercase text-slate-400">Observation:</span>
                              <pre className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-36">
                                {JSON.stringify(tr.tool_output, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
