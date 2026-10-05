import React from 'react';
import { BookOpen, User, ShoppingBag, CreditCard, History, Check, ExternalLink } from 'lucide-react';

export default function EvidencePanel({ ticket, context }) {
  const orders = (context && context.orders) || [];
  const subscriptions = (context && context.subscriptions) || [];

  return (
    <div className="space-y-4 text-xs">
      {/* Customer CRM Profile */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-indigo-400" />
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Customer CRM Profile</h4>
          </div>
          <span className="font-mono text-slate-400 text-[11px]">{ticket.customer_id}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-slate-500 text-[10px] uppercase">Name</span>
            <p className="font-semibold text-slate-200 truncate">{ticket.customer_name}</p>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase">Email</span>
            <p className="font-semibold text-slate-200 truncate">{ticket.customer_email}</p>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase">Customer Tier</span>
            <p className="font-semibold text-indigo-300">{ticket.customer_tier || 'Standard'}</p>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase">Active Orders</span>
            <p className="font-semibold text-slate-200">{orders.length}</p>
          </div>
        </div>
      </div>

      {/* Subscriptions */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Subscription Records</h4>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <p className="text-slate-500 italic">No active or historical subscriptions on file.</p>
        ) : (
          <div className="space-y-2">
            {subscriptions.map(sub => (
              <div key={sub.id} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-100">{sub.plan_name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      sub.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    ${sub.monthly_cost}/mo • Renewal: {sub.renewal_date}
                    {sub.cancelled_at && ` • Cancelled: ${sub.cancelled_at}`}
                  </p>
                </div>
                <span className="font-mono text-slate-500 text-[10px]">{sub.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders List */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-4 h-4 text-cyan-400" />
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Recent Customer Orders</h4>
          </div>
        </div>

        {orders.length === 0 ? (
          <p className="text-slate-500 italic">No order history available.</p>
        ) : (
          <div className="space-y-2">
            {orders.map(o => (
              <div key={o.id} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-cyan-300">{o.order_number}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    o.status === 'Delivered' ? 'bg-emerald-500/20 text-emerald-300' :
                    o.status === 'Shipped' ? 'bg-cyan-500/20 text-cyan-300' :
                    o.status === 'Cancelled' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {o.status}
                  </span>
                </div>
                <div className="text-slate-300">
                  {Array.isArray(o.items) ? o.items.map((it, i) => (
                    <span key={i} className="inline-block mr-2">• {it.item_name} (x{it.qty})</span>
                  )) : 'Items on file'}
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
                  <span>Total: <strong className="text-white">${o.total_amount?.toFixed(2)}</strong></span>
                  <span>Date: {o.order_date}</span>
                  {o.tracking_number && <span className="font-mono text-indigo-300">{o.tracking_number}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
