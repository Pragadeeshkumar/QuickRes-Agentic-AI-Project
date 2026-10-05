import React from 'react';
import { 
  AlertCircle, CheckCircle, Clock, ShieldAlert, 
  HelpCircle, Sparkles, User, ArrowRight, Filter, Search
} from 'lucide-react';

export default function TicketList({ 
  tickets, 
  selectedTicket, 
  onSelectTicket, 
  statusFilter, 
  setStatusFilter,
  riskFilter,
  setRiskFilter,
  searchQuery,
  setSearchQuery,
  onRunAllTickets,
  isRunningAll
}) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'AWAITING_HUMAN_APPROVAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <ShieldAlert className="w-3 h-3 mr-1" /> Awaiting Review
          </span>
        );
      case 'AUTO_RESOLVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3 mr-1" /> Auto-Resolved
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <CheckCircle className="w-3 h-3 mr-1" /> Resolved (Human)
          </span>
        );
      case 'AWAITING_CUSTOMER_INFO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <HelpCircle className="w-3 h-3 mr-1" /> Awaiting Info
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 animate-pulse">
            <Sparkles className="w-3 h-3 mr-1" /> Investigating...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3 h-3 mr-1" /> New
          </span>
        );
    }
  };

  const getRiskBadge = (risk, status) => {
    if (status === 'NEW' || risk === 'UNASSESSED' || risk === 'PENDING' || !risk) {
      return (
        <span className="text-[10px] font-medium text-slate-400 bg-slate-800/80 border border-slate-700/60 px-1.5 py-0.5 rounded inline-flex items-center">
          <Clock className="w-2.5 h-2.5 mr-1 text-slate-500" /> Pending AI
        </span>
      );
    }
    switch (risk) {
      case 'HIGH':
      case 'CRITICAL':
        return <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">Risk: High</span>;
      case 'MEDIUM':
        return <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">Risk: Med</span>;
      case 'LOW':
        return <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Risk: Low</span>;
      default:
        return (
          <span className="text-[10px] font-medium text-slate-400 bg-slate-800/80 border border-slate-700/60 px-1.5 py-0.5 rounded inline-flex items-center">
            <Clock className="w-2.5 h-2.5 mr-1 text-slate-500" /> Pending AI
          </span>
        );
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = searchQuery === '' || 
      (t.subject && t.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.initial_message && t.initial_message.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.customer_name && t.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.id && t.id.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesRisk = riskFilter === 'ALL' || t.risk_level === riskFilter;

    return matchesSearch && matchesStatus && matchesRisk;
  });

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 flex flex-col h-[calc(100vh-190px)] min-h-[600px] overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">Ticket Queue</h2>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/30">
              {filteredTickets.length}
            </span>
          </div>

          {onRunAllTickets && (
            <button
              onClick={onRunAllTickets}
              disabled={isRunningAll || tickets.length === 0}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-md shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
              title="Run autonomous AI agent on all pending tickets"
            >
              <Sparkles className={`w-3 h-3 ${isRunningAll ? 'animate-spin' : ''}`} />
              <span>{isRunningAll ? 'Running All...' : 'Run All AI'}</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tickets, customers, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          {['ALL', 'AWAITING_HUMAN_APPROVAL', 'INVESTIGATING', 'AUTO_RESOLVED', 'AWAITING_CUSTOMER_INFO', 'RESOLVED'].map((st) => {
            const labelMap = {
              'ALL': 'All',
              'AWAITING_HUMAN_APPROVAL': 'Approvals',
              'INVESTIGATING': 'Investigating',
              'AUTO_RESOLVED': 'Auto-Closed',
              'AWAITING_CUSTOMER_INFO': 'Awaiting Info',
              'RESOLVED': 'Resolved'
            };
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md whitespace-nowrap text-[11px] font-medium transition ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {labelMap[st]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ticket List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No tickets match the selected filters.
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const isSelected = selectedTicket && selectedTicket.id === ticket.id;
            return (
              <div
                key={ticket.id}
                onClick={() => onSelectTicket(ticket.id)}
                className={`p-3.5 cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-indigo-950/40 border-l-4 border-l-indigo-500' 
                    : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-400">
                      {ticket.id}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                      {ticket.category}
                    </span>
                  </div>
                  {getRiskBadge(ticket.risk_level, ticket.status)}
                </div>

                <h3 className="text-xs font-semibold text-slate-100 line-clamp-1 mb-1">
                  {ticket.subject}
                </h3>

                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                  {ticket.initial_message}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <User className="w-3 h-3 text-slate-400" />
                    <span className="truncate max-w-[110px] text-slate-300">{ticket.customer_name}</span>
                    {ticket.customer_tier === 'VIP' && (
                      <span className="text-[9px] font-extrabold text-amber-300 bg-amber-500/20 px-1 py-0.2 rounded">VIP</span>
                    )}
                  </div>
                  {getStatusBadge(ticket.status)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
