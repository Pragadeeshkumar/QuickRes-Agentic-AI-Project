import React, { useState } from 'react';
import { 
  Sparkles, ShieldAlert, Brain, Eye, Wrench, MessageSquare, 
  CheckCircle, Play, User, RefreshCw, Send, AlertCircle
} from 'lucide-react';
import TicketList from './TicketList';
import InvestigationTrace from './InvestigationTrace';
import ApprovalPanel from './ApprovalPanel';
import EvidencePanel from './EvidencePanel';

export default function ResolverDashboard({
  tickets,
  selectedTicket,
  onSelectTicket,
  onRunInvestigation,
  isInvestigating,
  onApproveAction,
  onRejectAction,
  onEditAndApproveAction,
  onSupervisorReply,
  onRunAllTickets,
  isRunningAll
}) {
  const [detailTab, setDetailTab] = useState('trace'); // 'trace' | 'approval' | 'evidence' | 'messages'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [supervisorMsg, setSupervisorMsg] = useState('');

  const handleSupervisorReply = (e) => {
    e.preventDefault();
    if (!supervisorMsg || !selectedTicket) return;
    onSupervisorReply(selectedTicket.id, supervisorMsg);
    setSupervisorMsg('');
  };

  const pendingApprovalsCount = selectedTicket && selectedTicket.gated_actions
    ? selectedTicket.gated_actions.filter(a => a.status === 'PENDING').length
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Ticket Queue */}
      <div className="lg:col-span-4">
        <TicketList
          tickets={tickets}
          selectedTicket={selectedTicket}
          onSelectTicket={onSelectTicket}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          riskFilter={riskFilter}
          setRiskFilter={setRiskFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onRunAllTickets={onRunAllTickets}
          isRunningAll={isRunningAll}
        />
      </div>

      {/* Right Column: Detailed Investigation Workspace */}
      <div className="lg:col-span-8">
        {selectedTicket ? (
          <div className="glass-panel rounded-2xl border border-slate-800 flex flex-col h-[calc(100vh-190px)] min-h-[600px] overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/50 px-2 py-0.5 rounded">
                    {selectedTicket.id}
                  </span>
                  <h2 className="text-sm font-bold text-white truncate max-w-md">
                    {selectedTicket.subject}
                  </h2>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                  <span className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-200">{selectedTicket.customer_name}</span>
                    {selectedTicket.customer_tier && (
                      <span className="text-[10px] font-bold text-amber-400">({selectedTicket.customer_tier})</span>
                    )}
                  </span>
                  <span>•</span>
                  <span>Category: <strong className="text-slate-200">{selectedTicket.category}</strong></span>
                  <span>•</span>
                  <span className="font-mono text-slate-500">{selectedTicket.created_at}</span>
                </div>
              </div>

              {/* Action: Trigger AI Investigation */}
              <button
                onClick={() => onRunInvestigation(selectedTicket.id)}
                disabled={isInvestigating}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50 whitespace-nowrap"
              >
                <Sparkles className={`w-4 h-4 ${isInvestigating ? 'animate-spin' : ''}`} />
                <span>{isInvestigating ? 'Agent Investigating...' : 'Run Agent Investigation'}</span>
              </button>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center space-x-1 px-4 py-2 bg-slate-950/60 border-b border-slate-800 text-xs overflow-x-auto">
              <button
                onClick={() => setDetailTab('trace')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-semibold transition ${
                  detailTab === 'trace'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Brain className="w-3.5 h-3.5 text-cyan-400" />
                <span>Investigation Trace</span>
                {selectedTicket.traces && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900/80 text-cyan-300">
                    {selectedTicket.traces.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setDetailTab('approval')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-semibold transition relative ${
                  detailTab === 'approval'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Gated Approvals</span>
                {pendingApprovalsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-1.5 right-1.5"></span>
                )}
              </button>

              <button
                onClick={() => setDetailTab('evidence')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-semibold transition ${
                  detailTab === 'evidence'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                <span>CRM & Evidence</span>
              </button>

              <button
                onClick={() => setDetailTab('messages')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-semibold transition ${
                  detailTab === 'messages'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                <span>Customer Thread</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-5 overflow-y-auto bg-slate-950/20">
              {detailTab === 'trace' && (
                <InvestigationTrace
                  traces={selectedTicket.traces || []}
                  currentHypothesis={selectedTicket.resolution_summary}
                />
              )}

              {detailTab === 'approval' && (
                <ApprovalPanel
                  ticket={selectedTicket}
                  gatedActions={selectedTicket.gated_actions || []}
                  onApprove={onApproveAction}
                  onReject={onRejectAction}
                  onEditAndApprove={onEditAndApproveAction}
                />
              )}

              {detailTab === 'evidence' && (
                <EvidencePanel
                  ticket={selectedTicket}
                  context={selectedTicket.context}
                />
              )}

              {detailTab === 'messages' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {selectedTicket.messages && selectedTicket.messages.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                          m.sender === 'customer'
                            ? 'bg-slate-900/90 border-slate-800 text-slate-200'
                            : m.sender === 'agent_ai'
                              ? 'bg-cyan-950/20 border-cyan-500/30 text-cyan-100'
                              : 'bg-indigo-950/30 border-indigo-500/30 text-indigo-100'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold mb-1 text-[11px] opacity-75">
                          <span>Sender: {m.sender === 'customer' ? selectedTicket.customer_name : m.sender === 'agent_ai' ? 'QuickRes AI Agent' : 'Support Supervisor'}</span>
                          <span className="font-mono text-slate-500">{m.created_at}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Form */}
                  <form onSubmit={handleSupervisorReply} className="pt-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={supervisorMsg}
                        onChange={(e) => setSupervisorMsg(e.target.value)}
                        placeholder="Write direct message to customer thread as supervisor..."
                        className="flex-1 p-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!supervisorMsg}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition disabled:opacity-50 flex items-center space-x-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Post</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl border border-slate-800 p-12 text-center text-slate-500 h-[calc(100vh-190px)] min-h-[600px] flex flex-col items-center justify-center">
            <Brain className="w-12 h-12 text-slate-600 mb-3 opacity-40" />
            <h3 className="text-base font-bold text-slate-300">Select a Ticket from Queue</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Click any support ticket on the left to inspect its autonomous investigation trace, evaluate RAG evidence, and approve high-risk actions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
