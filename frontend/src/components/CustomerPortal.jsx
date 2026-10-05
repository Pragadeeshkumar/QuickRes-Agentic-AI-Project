import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Send, Bot, Clock, CheckCircle2, ShieldAlert, 
  HelpCircle, Sparkles, MessageSquare, Plus, ArrowRight, 
  FileText, ShoppingBag, CreditCard, LifeBuoy, ListFilter, 
  ArrowLeft, ChevronRight, Check, Loader2, Search, Database, ShieldCheck, X
} from 'lucide-react';

export default function CustomerPortal({ 
  customers, 
  selectedCustomer, 
  onSelectCustomer, 
  customerTickets, 
  onCreateTicket,
  onCustomerReply,
  selectedTicket,
  onSelectTicket
}) {
  const [viewMode, setViewMode] = useState(selectedTicket ? 'detail' : 'create');

  // Form Fields
  const [category, setCategory] = useState('SUBSCRIPTION');
  const [subject, setSubject] = useState('');
  const [orderId, setOrderId] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStepIndex, setSubmittingStepIndex] = useState(0);

  // Customer's actual CRM data (orders & subscriptions on file)
  const [customerContext, setCustomerContext] = useState({ orders: [], subscriptions: [] });

  // Add New Custom Order State
  const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
  const [newOrderItem, setNewOrderItem] = useState('');
  const [newOrderPrice, setNewOrderPrice] = useState('');
  const [newOrderQuantity, setNewOrderQuantity] = useState(1);
  const [newOrderStatus, setNewOrderStatus] = useState('Processing');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Reply in ticket thread
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const processingStatements = [
    { icon: CheckCircle2, text: "Ticket received & logged into support queue", color: "text-emerald-400" },
    { icon: Search, text: "AI Agent analyzing issue & retrieving customer records...", color: "text-indigo-400" },
    { icon: Database, text: "Querying CRM order history & transaction ledger...", color: "text-cyan-400" },
    { icon: FileText, text: "Verifying corporate SOP policies & resolution precedent...", color: "text-purple-400" },
    { icon: ShieldCheck, text: "Formulating response & evaluating risk safety gate...", color: "text-teal-400" }
  ];

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (viewMode === 'detail') {
      scrollToBottom();
    }
  }, [selectedTicket, selectedTicket?.messages, viewMode]);

  const fetchCustomerOrders = async (customerId) => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      setCustomerContext({
        orders: data.orders || [],
        subscriptions: data.subscriptions || []
      });
    } catch (err) {
      console.error("Error loading customer orders/subs:", err);
    }
  };

  // Fetch customer's real orders and subscriptions from backend
  useEffect(() => {
    if (selectedCustomer?.id) {
      fetchCustomerOrders(selectedCustomer.id);
    }
  }, [selectedCustomer?.id]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!newOrderItem.trim() || !newOrderPrice || !selectedCustomer) return;

    setIsCreatingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          item_name: newOrderItem.trim(),
          price: parseFloat(newOrderPrice),
          quantity: parseInt(newOrderQuantity) || 1,
          status: newOrderStatus
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        await fetchCustomerOrders(selectedCustomer.id);
        setOrderId(data.order.order_number);
        if (data.order.status === 'Processing') {
          setCategory('ORDER');
          setSubject(`Cancel order ${data.order.order_number} (${data.order.items[0]?.item_name})`);
          setDescription(`Hello support, I placed order ${data.order.order_number} for ${data.order.items[0]?.item_name} ($${data.order.total_amount?.toFixed(2)}) earlier today. Please cancel it before it enters shipment.`);
        } else if (data.order.status === 'Shipped') {
          setCategory('SHIPPING');
          setSubject(`Tracking for order ${data.order.order_number}`);
          setDescription(`Hello support, please provide the latest tracking status and carrier update for my order ${data.order.order_number}.`);
        } else if (data.order.status === 'Delivered') {
          setCategory('REFUND');
          setSubject(`Return & Refund for order ${data.order.order_number}`);
          setDescription(`Hello support, I received order ${data.order.order_number} (${data.order.items[0]?.item_name}) but I would like to request a return and refund.`);
        }
        setIsAddOrderModalOpen(false);
        setNewOrderItem('');
        setNewOrderPrice('');
      }
    } catch (err) {
      console.error("Failed to create order:", err);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Demo Quick-Fill Presets directly matching database records
  const demoPresets = [
    {
      title: "Subscription Charge After Cancellation",
      category: "SUBSCRIPTION",
      subject: "Charged $49.99 after cancelling my subscription",
      orderId: "",
      description: "Hi, I cancelled my QuickRes Pro Cloud subscription 3 days ago, but I just saw a charge of $49.99 on my credit card this morning. Please refund this erroneous charge as I already cancelled."
    },
    {
      title: "Damaged Screen on Gaming Monitor",
      category: "REFUND",
      subject: "Screen arrived cracked on gaming monitor (ORD-8842)",
      orderId: "ORD-8842",
      description: "I received my Ultra HD 4K Gaming Monitor yesterday (order ORD-8842), but upon unboxing the screen is cracked and will not turn on. I request an expedited replacement or refund."
    },
    {
      title: "Where is My Package? (Tracking)",
      category: "SHIPPING",
      subject: "Tracking status for order ORD-9921",
      orderId: "ORD-9921",
      description: "Hello, could you please tell me when my Pro Wireless Headphones from order ORD-9921 will arrive and share the live tracking number?"
    },
    {
      title: "Cancel Recent Purchase (Processing)",
      category: "ORDER",
      subject: "Need to cancel my recent purchase",
      orderId: "",
      description: "Hello support, I placed an order earlier today by mistake and would like to cancel it before it enters shipment."
    }
  ];

  const handleApplyPreset = (p) => {
    setCategory(p.category);
    setSubject(p.subject);
    setOrderId(p.orderId);
    setDescription(p.description);
  };

  const handleSelectOrder = (o) => {
    if (category === 'ORDER' && (o.status === 'Shipped' || o.status === 'Cancelled')) {
      if (o.status === 'Shipped') {
        setOrderId(o.order_number);
        setCategory('SHIPPING');
      } else {
        return;
      }
    } else {
      setOrderId(o.order_number);
      if (o.status === 'Processing') {
        setCategory('ORDER');
      } else if (o.status === 'Shipped') {
        setCategory('SHIPPING');
      } else {
        setCategory('REFUND');
      }
    }
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !selectedCustomer) return;

    setIsSubmitting(true);
    setSubmittingStepIndex(0);

    // Start ticket creation on backend
    const ticketPromise = onCreateTicket({
      customer_id: selectedCustomer.id,
      subject: subject.trim(),
      message: description.trim(),
      category: category,
      order_id: orderId.trim() || null
    });

    try {
      // Step sequentially through all 5 steps with deliberate 2-second pace (2000ms per step)
      for (let step = 0; step < processingStatements.length; step++) {
        setSubmittingStepIndex(step);
        await new Promise(r => setTimeout(r, 2000));
      }

      // Await backend completion
      const newTicketId = await ticketPromise;

      // Small pause on final step completion
      await new Promise(r => setTimeout(r, 600));

      setIsSubmitting(false);
      if (newTicketId) {
        setViewMode('detail');
      }
    } catch (err) {
      console.error("Submission error:", err);
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setIsSendingReply(true);
    await onCustomerReply(selectedTicket.id, replyText);
    setReplyText('');
    setIsSendingReply(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'INVESTIGATING':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-cyan-400" /> AI Investigator Working...
          </span>
        );
      case 'AWAITING_CUSTOMER_INFO':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <HelpCircle className="w-3.5 h-3.5 mr-1.5 text-purple-400" /> Action Required: Reply Needed
          </span>
        );
      case 'AWAITING_HUMAN_APPROVAL':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> In Supervisor Review
          </span>
        );
      case 'AUTO_RESOLVED':
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Resolved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Submitted
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Support Portal Header & Persona Switcher */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Customer Support Portal</h1>
              <p className="text-xs text-slate-400 mt-0.5">Submit an inquiry or track your active tickets.</p>
            </div>
          </div>

          {/* Navigation & Persona Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setViewMode('create')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === 'create'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Ticket</span>
              </button>

              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === 'list'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>My Tickets ({customerTickets.length})</span>
              </button>
            </div>

            {/* Persona Switcher Dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400 text-[11px]">Logged in:</span>
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => onSelectCustomer(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.name} {c.tier === 'VIP' ? '(VIP)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN VIEW 1: Clean Ticket Submission Form */}
      {viewMode === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Ticket Form (8 Cols) */}
          <div className="lg:col-span-8">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800/90 space-y-5 shadow-xl">
              <div>
                <h2 className="text-base font-bold text-white">Raise a Support Ticket</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Provide your inquiry details. Our autonomous agent will retrieve your records and formulate a solution.
                </p>
              </div>

              <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs">
                {/* Category & Order Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-semibold">
                      Category <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="SUBSCRIPTION">Subscription & Billing</option>
                      <option value="REFUND">Refunds & Returns</option>
                      <option value="SHIPPING">Shipping & Tracking</option>
                      <option value="ORDER">Order Modification / Cancel</option>
                      <option value="ACCOUNT">Account Support</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-slate-300 font-semibold">
                        Select Related Order (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddOrderModalOpen(true)}
                        className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Add Order</span>
                      </button>
                    </div>
                    <select
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                    >
                      <option value="">-- No specific order linked --</option>
                      {customerContext.orders.map(o => {
                        const isShippedOrCancelled = o.status === 'Shipped' || o.status === 'Cancelled';
                        const isDisabled = category === 'ORDER' && isShippedOrCancelled;

                        return (
                          <option 
                            key={o.id} 
                            value={o.order_number}
                            disabled={isDisabled}
                            className={isDisabled ? 'text-slate-500 bg-slate-900' : 'text-white bg-slate-900'}
                          >
                            {o.order_number} (${o.total_amount?.toFixed(2)} - {o.status}) {isDisabled ? `— [${o.status}: Cannot cancel/modify]` : ''}
                          </option>
                        );
                      })}
                    </select>

                    {category === 'ORDER' && (
                      <p className="text-[10.5px] text-amber-400/90 flex items-center pt-0.5">
                        <ShieldAlert className="w-3.5 h-3.5 mr-1 shrink-0 text-amber-400" />
                        <span>Only <strong>Processing</strong> orders are eligible for cancellation. Shipped & Cancelled orders cannot be cancelled.</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Subject / Summary */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">
                    Subject <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Charged after cancellation / Tracking status for order"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Description Textarea */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">
                    Description <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what happened with your order, payment, or subscription..."
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                </div>

                {/* Submit Button & Live 5-Step Processing Card */}
                {isSubmitting ? (
                  <div className="p-5 rounded-2xl bg-slate-900/95 border border-indigo-500/40 space-y-4 shadow-xl shadow-indigo-950/40">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center space-x-2 text-cyan-300 font-bold text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                        <span>Ticket Received — QuickRes Agent Processing</span>
                      </div>
                      <span className="text-[11px] font-mono text-indigo-300 bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-500/30">
                        Step {Math.min(submittingStepIndex + 1, processingStatements.length)} of {processingStatements.length}
                      </span>
                    </div>

                    {/* All 5 Steps Listed with Progressive State */}
                    <div className="space-y-2.5">
                      {processingStatements.map((step, idx) => {
                        const isDone = idx < submittingStepIndex;
                        const isCurrent = idx === submittingStepIndex;

                        return (
                          <div
                            key={idx}
                            className={`flex items-center space-x-3 p-2.5 rounded-xl text-xs transition-all duration-300 ${
                              isCurrent
                                ? 'bg-indigo-950/60 border border-indigo-500/40 text-white font-semibold shadow-sm'
                                : isDone
                                ? 'bg-emerald-950/20 border border-emerald-500/20 text-emerald-300'
                                : 'bg-slate-950/40 border border-slate-800/60 text-slate-500'
                            }`}
                          >
                            <div className="shrink-0">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : isCurrent ? (
                                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                              ) : (
                                <Clock className="w-4 h-4 text-slate-600" />
                              )}
                            </div>
                            <span className={`text-xs ${isCurrent ? 'text-cyan-200' : isDone ? 'text-emerald-300' : 'text-slate-500'}`}>
                              {step.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-slate-400 italic text-center pt-1">
                      Executing automated triage, SOP validation, and agent policy graph...
                    </p>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={!subject.trim() || !description.trim()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Support Ticket</span>
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Right: Quick Demo Scenarios (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  1-Click Demo Scenarios
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Click a preset to auto-fill ticket details based on database records:
              </p>

              <div className="space-y-2">
                {demoPresets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="w-full text-left p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/40 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white group-hover:text-indigo-300 transition line-clamp-1">
                        {p.title}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 ml-1 transition transform group-hover:translate-x-0.5" />
                    </div>
                    <span className="text-[10px] font-mono text-indigo-400 mt-1 block">
                      {p.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Account Records Snapshot */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-xs space-y-2.5">
              <span className="font-bold text-slate-300 flex items-center">
                <CreditCard className="w-3.5 h-3.5 text-cyan-400 mr-1.5" /> Your Account Records
              </span>
              <div className="space-y-1 text-[11px] text-slate-400">
                <p>• Orders on file: <strong className="text-slate-200">{customerContext.orders.length}</strong></p>
                <p>• Subscriptions: <strong className="text-slate-200">{customerContext.subscriptions.length > 0 ? customerContext.subscriptions[0].plan_name : 'None'}</strong></p>
                <p>• Tier: <strong className="text-indigo-300">{selectedCustomer?.tier || 'Standard'}</strong></p>
              </div>
            </div>

            {/* Dedicated Recent Orders Card */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white flex items-center text-xs">
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-400 mr-1.5" /> Your Recent Orders ({customerContext.orders.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddOrderModalOpen(true)}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Add Order</span>
                </button>
              </div>

              {customerContext.orders.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No orders on file for this customer.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {customerContext.orders.map(o => {
                    const isSelected = orderId === o.order_number;
                    const itemsText = (o.items && o.items[0]?.item_name) || "Store Merchandise";

                    return (
                      <div
                        key={o.id}
                        onClick={() => handleSelectOrder(o)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-950/60 border-indigo-500/60 shadow-sm'
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-indigo-300">{o.order_number}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                            o.status === 'Processing' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
                            o.status === 'Shipped' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' :
                            o.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {o.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 truncate">{itemsText}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-800/60 font-mono">
                          <span>${o.total_amount?.toFixed(2)}</span>
                          <span className="text-indigo-400 font-sans font-semibold">
                            {isSelected ? '✓ Linked to Ticket' : 'Click to Link'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN VIEW 2: "My Tickets" Table */}
      {viewMode === 'list' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Your Submitted Support Tickets</h2>
              <p className="text-xs text-slate-400">Track the live status and resolutions for your tickets.</p>
            </div>
            <button
              onClick={() => setViewMode('create')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Ticket</span>
            </button>
          </div>

          {customerTickets.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-600 opacity-40" />
              <p className="text-sm font-medium text-slate-300">No support tickets found</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                You haven't submitted any tickets under this customer account yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {customerTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    onSelectTicket(t.id);
                    setViewMode('detail');
                  }}
                  className="p-4 hover:bg-slate-800/40 cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded">
                        {t.id}
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {t.category}
                      </span>
                      {t.order_id && (
                        <span className="text-[10px] font-mono text-cyan-300">
                          Order: {t.order_id}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate max-w-xl">
                      {t.subject}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {t.initial_message}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 self-start sm:self-auto shrink-0">
                    <span className="text-xs text-slate-500 font-mono hidden md:inline">{t.created_at?.split(' ')[0]}</span>
                    {getStatusBadge(t.status)}
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. MAIN VIEW 3: Active Ticket Conversation & Resolution Thread */}
      {viewMode === 'detail' && selectedTicket && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Thread (8 Cols) */}
          <div className="lg:col-span-8">
            <div className="glass-panel rounded-2xl border border-slate-800 flex flex-col h-[640px] overflow-hidden shadow-2xl">
              {/* Thread Header */}
              <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setViewMode('list')}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                    title="Back to Tickets"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-indigo-400">{selectedTicket.id}</span>
                      <h2 className="text-sm font-bold text-white truncate max-w-md">{selectedTicket.subject}</h2>
                    </div>
                    <span className="text-[11px] text-slate-400">Category: {selectedTicket.category}</span>
                  </div>
                </div>

                {getStatusBadge(selectedTicket.status)}
              </div>

              {/* Messages Body */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/40">
                {selectedTicket.messages && selectedTicket.messages.map((msg, idx) => {
                  const isUser = msg.sender === 'customer';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                        isUser
                          ? 'bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white'
                          : 'bg-gradient-to-tr from-cyan-600 to-teal-600 text-white'
                      }`}>
                        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>

                      <div className={`rounded-2xl p-4 text-xs max-w-[82%] leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md'
                          : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-sm shadow-sm'
                      }`}>
                        <div className="flex items-center justify-between text-[10px] opacity-75 mb-1.5 pb-1 border-b border-white/10 space-x-4">
                          <span className="font-semibold">
                            {isUser ? selectedCustomer?.name : 'QuickRes Support AI'}
                          </span>
                          <span className="font-mono text-slate-400">{msg.created_at}</span>
                        </div>
                        <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isSendingReply && (
                  <div className="flex items-center space-x-2 text-xs text-indigo-300 py-2 px-3 animate-pulse bg-slate-900/60 rounded-xl border border-indigo-500/20 max-w-fit">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>QuickRes AI is formulating response...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Reply Form */}
              <div className="p-3 bg-slate-900/90 border-t border-slate-800">
                <form onSubmit={handleSendReply} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      selectedTicket.status === 'AWAITING_CUSTOMER_INFO'
                        ? 'Provide the requested order number or info...'
                        : 'Reply to support...'
                    }
                    className="flex-1 p-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isSendingReply || !replyText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Ticket Metadata Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3.5 text-xs">
              <h3 className="font-bold text-white uppercase tracking-wider text-[11px] border-b border-slate-800 pb-2">
                Ticket Metadata
              </h3>

              <div className="space-y-2.5">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Reference ID</span>
                  <p className="font-mono font-bold text-indigo-300 mt-0.5">{selectedTicket.id}</p>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedTicket.status)}</div>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Category</span>
                  <p className="font-semibold text-slate-200 mt-0.5">{selectedTicket.category}</p>
                </div>

                {selectedTicket.order_id && (
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-semibold">Associated Order</span>
                    <p className="font-mono text-cyan-300 mt-0.5">{selectedTicket.order_id}</p>
                  </div>
                )}

                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Submitted On</span>
                  <p className="font-mono text-slate-400 mt-0.5">{selectedTicket.created_at}</p>
                </div>
              </div>
            </div>

            {/* Dedicated Recent Orders Card for Detail View */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white flex items-center text-xs">
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-400 mr-1.5" /> Your Recent Orders ({customerContext.orders.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddOrderModalOpen(true)}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Add Order</span>
                </button>
              </div>

              {customerContext.orders.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No orders on file for this customer.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {customerContext.orders.map(o => {
                    const isSelected = selectedTicket.order_id === o.order_number || replyText.includes(o.order_number);
                    const itemsText = (o.items && o.items[0]?.item_name) || "Store Merchandise";

                    return (
                      <div
                        key={o.id}
                        onClick={() => setReplyText(o.order_number)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-950/60 border-indigo-500/60 shadow-sm'
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                        }`}
                        title="Click to insert this order number into your reply message"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-indigo-300">{o.order_number}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                            o.status === 'Processing' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
                            o.status === 'Shipped' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' :
                            o.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {o.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 truncate">{itemsText}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-800/60 font-mono">
                          <span>${o.total_amount?.toFixed(2)}</span>
                          <span className="text-indigo-400 font-sans font-semibold flex items-center">
                            <Plus className="w-3 h-3 mr-0.5" /> Insert in Reply
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => setViewMode('create')}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Raise Another Ticket</span>
            </button>
          </div>
        </div>
      )}

      {/* Add New Custom Order Modal */}
      {isAddOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl space-y-4 bg-slate-900 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Add Customer Order (Live Mock)</h3>
              </div>
              <button
                onClick={() => setIsAddOrderModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Create a custom purchase for <strong className="text-white">{selectedCustomer?.name}</strong> to test cancellation, shipping, or refunds without modifying database tables manually.
            </p>

            <form onSubmit={handleCreateOrder} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold">Item / Product Name <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Noise-Cancelling Headphones"
                  value={newOrderItem}
                  onChange={(e) => setNewOrderItem(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">Price ($) <span className="text-rose-400">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="79.99"
                    value={newOrderPrice}
                    onChange={(e) => setNewOrderPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={newOrderQuantity}
                    onChange={(e) => setNewOrderQuantity(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold">Initial Order Status</label>
                <select
                  value={newOrderStatus}
                  onChange={(e) => setNewOrderStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="Processing">Processing (Eligible for Immediate Cancellation)</option>
                  <option value="Shipped">Shipped (In Transit — test shipping tracking)</option>
                  <option value="Delivered">Delivered (Completed — test return/refund)</option>
                  <option value="Cancelled">Cancelled (Already voided)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 Tip: Choose <strong>Processing</strong> to test immediate cancellation by the AI agent.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOrderModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOrder || !newOrderItem.trim() || !newOrderPrice}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition disabled:opacity-50 flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
                >
                  {isCreatingOrder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Create & Link Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
