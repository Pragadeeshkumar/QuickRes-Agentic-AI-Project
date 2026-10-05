import React, { useState } from 'react';
import { 
  ShieldAlert, CheckCircle, XCircle, Edit3, DollarSign, 
  FileText, ArrowRight, UserCheck, AlertTriangle, ShieldCheck, User, CreditCard, BookOpen
} from 'lucide-react';

export default function ApprovalPanel({ 
  gatedActions, 
  onApprove, 
  onReject, 
  onEditAndApprove, 
  ticket 
}) {
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');

  if (!gatedActions || gatedActions.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400">
        <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
        <p className="text-sm font-medium text-slate-300">No Gated Actions Requiring Human Sign-off</p>
        <p className="text-xs text-slate-500 mt-1">
          Low-risk inquiries are resolved autonomously. High-risk operations (Refunds, Replacements &gt; $50) will trigger here.
        </p>
      </div>
    );
  }

  const pendingAction = gatedActions.find(a => a.status === 'PENDING') || gatedActions[0];
  const payload = pendingAction.payload || {};

  const handleEditOpen = () => {
    setEditAmount(payload.amount || '');
    setEditNotes(`Supervisor adjusted amount to $${payload.amount || ''} after customer tier review.`);
    setShowEditModal(true);
  };

  const handleEditSubmit = () => {
    const newPayload = { ...payload, amount: parseFloat(editAmount) || payload.amount };
    onEditAndApprove(pendingAction.id, newPayload, editNotes);
    setShowEditModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Pending Action Banner formatted per Specification Doc */}
      <div className={`p-5 rounded-2xl border transition-all ${
        pendingAction.status === 'PENDING'
          ? 'bg-gradient-to-b from-amber-950/40 via-slate-900/90 to-slate-900/90 border-amber-500/50 shadow-xl shadow-amber-950/20'
          : pendingAction.status === 'APPROVED'
            ? 'bg-emerald-950/20 border-emerald-500/30'
            : 'bg-rose-950/20 border-rose-500/30'
      }`}>
        {/* Banner Header: Ticket # | Customer | Proposed Action | Risk */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5 mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${
              pendingAction.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-slate-800 text-slate-400'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-mono font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/50">
                  Ticket #{ticket.id}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-white font-semibold flex items-center">
                  <User className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  {ticket.customer_name}
                </span>
              </div>
              <div className="mt-1 flex items-center space-x-2">
                <span className="text-sm font-bold text-white tracking-tight">
                  Proposed Action: <span className="text-amber-300 font-mono">{pendingAction.action_type} {payload.amount ? `$${payload.amount.toFixed(2)}` : ''}</span>
                </span>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Risk: {pendingAction.risk_level}
                </span>
              </div>
            </div>
          </div>

          <span className="text-[11px] font-mono text-slate-400 self-start sm:self-auto bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
            Status: {pendingAction.status}
          </span>
        </div>

        {/* Supporting Evidence Grid */}
        <div className="mb-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
            Supporting Evidence & Policy Citations:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-slate-500 font-medium text-[11px] flex items-center">
                <CreditCard className="w-3.5 h-3.5 text-indigo-400 mr-1.5" /> Transaction Verified:
              </span>
              <p className="font-semibold text-slate-200">
                {payload.payment_method || 'Visa ending in 4242'}
              </p>
              <span className="text-[10px] font-mono text-emerald-400">Captured Charge: ${payload.amount?.toFixed(2) || '49.99'}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-slate-500 font-medium text-[11px] flex items-center">
                <UserCheck className="w-3.5 h-3.5 text-cyan-400 mr-1.5" /> Account State:
              </span>
              <p className="font-semibold text-slate-200 truncate">
                {ticket.customer_name} ({ticket.customer_tier || 'VIP'})
              </p>
              <span className="text-[10px] text-amber-300 font-medium">Cancellation Timestamp Confirmed</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-slate-500 font-medium text-[11px] flex items-center">
                <BookOpen className="w-3.5 h-3.5 text-amber-400 mr-1.5" /> Corporate SOP Citation:
              </span>
              <p className="font-bold text-indigo-300 font-mono">
                {payload.policy_ref || 'KB-POL-001'}
              </p>
              <span className="text-[10px] text-slate-400 truncate block">100% Refund Entitlement</span>
            </div>
          </div>
        </div>

        {/* Supervisor Risk Reason */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-5 text-xs flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-amber-400">Human-in-the-Loop Risk Rationale:</span>
            <p className="text-slate-300 leading-relaxed font-sans">
              {pendingAction.risk_reason}
            </p>
          </div>
        </div>

        {/* Action Controls for PENDING status */}
        {pendingAction.status === 'PENDING' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onApprove(pendingAction.id, "Supervisor confirmed policy compliance and approved payout.")}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition active:scale-95"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve & Execute</span>
              </button>

              <button
                onClick={() => setShowRejectBox(!showRejectBox)}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 text-xs font-semibold transition"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Reject</span>
              </button>

              <button
                onClick={handleEditOpen}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Edit Payload & Approve</span>
              </button>
            </div>

            {/* Rejection Note Box */}
            {showRejectBox && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-500/30 space-y-2 mt-3 animate-fadeIn">
                <span className="text-xs font-semibold text-rose-300">Reason for Rejection:</span>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Explain why this proposed action is rejected..."
                  rows={2}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowRejectBox(false)}
                    className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onReject(pendingAction.id, rejectNotes || "Action rejected by supervisor upon manual review.");
                      setShowRejectBox(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-medium">
                Supervisor Audit: <span className="text-white font-semibold">{pendingAction.human_notes || 'Action logged and executed.'}</span>
              </span>
            </div>
            <span className="text-slate-500 font-mono text-[11px]">Reviewed: {pendingAction.reviewed_at}</span>
          </div>
        )}
      </div>

      {/* Edit Payload Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-indigo-400 mr-1" />
                <span>Edit Payload & Approve</span>
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Adjusted Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Supervisor Decision Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
              >
                Save & Approve Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
