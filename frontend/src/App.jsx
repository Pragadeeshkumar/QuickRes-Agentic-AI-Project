import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import StatsBanner from './components/StatsBanner';
import ResolverDashboard from './components/ResolverDashboard';
import CustomerPortal from './components/CustomerPortal';

export default function App() {
  const [activeTab, setActiveTab] = useState('resolver'); // 'resolver' | 'customer'
  const [tickets, setTickets] = useState([]);
  
  // Resolver selected ticket
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  
  // Customer portal selected customer and customer-active ticket
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerTicketId, setCustomerTicketId] = useState(null);
  const [customerTicketDetail, setCustomerTicketDetail] = useState(null);

  const [stats, setStats] = useState(null);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const initialLoadedRef = useRef(false);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch overview data (pure data sync, never overrides user's active selections)
  const fetchAllData = async () => {
    try {
      const [tRes, sRes, cRes] = await Promise.all([
        fetch('/api/tickets'),
        fetch('/api/stats'),
        fetch('/api/customers')
      ]);
      const tData = await tRes.json();
      const sData = await sRes.json();
      const cData = await cRes.json();

      setTickets(tData);
      setStats(sData);
      setCustomers(cData);

      // Only set initial selections ONCE on first page load
      if (!initialLoadedRef.current) {
        initialLoadedRef.current = true;
        if (cData.length > 0) {
          setSelectedCustomerId(cData[0].id);
        }
        if (tData.length > 0) {
          setSelectedTicketId(tData[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching overview data:", err);
    }
  };

  // Fetch Resolver ticket detail
  const fetchTicketDetail = async (id) => {
    if (!id) {
      setTicketDetail(null);
      return;
    }
    try {
      const res = await fetch(`/api/tickets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTicketDetail(data);
      }
    } catch (err) {
      console.error("Error fetching resolver ticket detail:", err);
    }
  };

  // Fetch Customer Portal ticket detail
  const fetchCustomerTicketDetail = async (id) => {
    if (!id) {
      setCustomerTicketDetail(null);
      return;
    }
    try {
      const res = await fetch(`/api/tickets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCustomerTicketDetail(data);
      }
    } catch (err) {
      console.error("Error fetching customer ticket detail:", err);
    }
  };

  // Polling loop (Runs every 6s without resetting user selection)
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Sync Resolver ticket detail
  useEffect(() => {
    if (selectedTicketId) {
      fetchTicketDetail(selectedTicketId);
    } else {
      setTicketDetail(null);
    }
  }, [selectedTicketId]);

  // Sync Customer ticket detail
  useEffect(() => {
    if (customerTicketId) {
      fetchCustomerTicketDetail(customerTicketId);
    } else {
      setCustomerTicketDetail(null);
    }
  }, [customerTicketId]);

  // When changing customer persona, switch persona and set active ticket to that customer's latest ticket (or null)
  const handleSelectCustomer = (cid) => {
    setSelectedCustomerId(cid);
    const userTickets = tickets.filter(t => t.customer_id === cid);
    if (userTickets.length > 0) {
      setCustomerTicketId(userTickets[0].id);
    } else {
      setCustomerTicketId(null);
      setCustomerTicketDetail(null);
    }
  };

  // Handler: Run LangGraph Agent Investigation on single ticket
  const handleRunInvestigation = async (ticketId) => {
    setIsInvestigating(true);
    showToast(`Investigating Ticket ${ticketId} with Groq AI Agent...`, 'info');
    try {
      const res = await fetch(`/api/tickets/${ticketId}/investigate`, {
        method: 'POST'
      });
      const data = await res.json();
      await fetchTicketDetail(ticketId);
      if (customerTicketId === ticketId) {
        await fetchCustomerTicketDetail(ticketId);
      }
      await fetchAllData();
      showToast(`Investigation complete: ${data.final_output?.type || 'Completed'}`, 'success');
    } catch (err) {
      showToast(`Investigation error: ${err.message}`, 'error');
    } finally {
      setIsInvestigating(false);
    }
  };

  // Handler: Run All Tickets through AI Agent in batch
  const handleRunAllTickets = async () => {
    setIsRunningAll(true);
    showToast("Running Groq AI Agent across all pending tickets...", "info");
    try {
      const res = await fetch('/api/tickets/run-all', { method: 'POST' });
      const data = await res.json();
      await fetchAllData();
      if (selectedTicketId) {
        await fetchTicketDetail(selectedTicketId);
      }
      if (customerTicketId) {
        await fetchCustomerTicketDetail(customerTicketId);
      }
      showToast(`Batch AI run complete: Processed ${data.processed_count || 0} tickets!`, "success");
    } catch (err) {
      showToast(`Error running batch tickets: ${err.message}`, "error");
    } finally {
      setIsRunningAll(false);
    }
  };

  // Handler: Create ticket from customer portal
  const handleCreateTicket = async (payload) => {
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      await fetchAllData();
      
      setSelectedTicketId(data.ticket_id);
      setCustomerTicketId(data.ticket_id);
      await fetchTicketDetail(data.ticket_id);
      await fetchCustomerTicketDetail(data.ticket_id);
      showToast(`Support conversation started (#${data.ticket_id})`, 'success');
      return data.ticket_id;
    } catch (err) {
      showToast(`Error creating ticket: ${err.message}`, 'error');
      return null;
    }
  };

  // Handler: Customer reply
  const handleCustomerReply = async (ticketId, message) => {
    try {
      await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, reinvestigate: true })
      });
      await fetchCustomerTicketDetail(ticketId);
      await fetchTicketDetail(ticketId);
      await fetchAllData();
      showToast("Reply sent to QuickRes Agent.", "success");
    } catch (err) {
      showToast("Error sending reply", "error");
    }
  };

  // Handler: Supervisor manual message
  const handleSupervisorReply = async (ticketId, message) => {
    try {
      await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, reinvestigate: false })
      });
      await fetchTicketDetail(ticketId);
      if (customerTicketId === ticketId) {
        await fetchCustomerTicketDetail(ticketId);
      }
      showToast("Supervisor message posted.", "info");
    } catch (err) {
      showToast("Error posting note", "error");
    }
  };

  // Handler: Approve Gated Action
  const handleApproveAction = async (actionId, notes) => {
    try {
      const res = await fetch(`/api/actions/${actionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      if (res.ok) {
        showToast("Action approved & payout executed! Ticket resolved.", "success");
        await fetchTicketDetail(selectedTicketId);
        if (customerTicketId) {
          await fetchCustomerTicketDetail(customerTicketId);
        }
        await fetchAllData();
      }
    } catch (err) {
      showToast("Error approving action", "error");
    }
  };

  // Handler: Reject Gated Action
  const handleRejectAction = async (actionId, notes) => {
    try {
      const res = await fetch(`/api/actions/${actionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      if (res.ok) {
        showToast("Action rejected. Ticket escalated with reason.", "warning");
        await fetchTicketDetail(selectedTicketId);
        if (customerTicketId) {
          await fetchCustomerTicketDetail(customerTicketId);
        }
        await fetchAllData();
      }
    } catch (err) {
      showToast("Error rejecting action", "error");
    }
  };

  // Handler: Edit & Approve Gated Action
  const handleEditAndApproveAction = async (actionId, editedPayload, notes) => {
    try {
      const res = await fetch(`/api/actions/${actionId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edited_payload: editedPayload, notes })
      });
      if (res.ok) {
        showToast("Modified action approved and executed!", "success");
        await fetchTicketDetail(selectedTicketId);
        if (customerTicketId) {
          await fetchCustomerTicketDetail(customerTicketId);
        }
        await fetchAllData();
      }
    } catch (err) {
      showToast("Error editing action", "error");
    }
  };

  // Handler: Clear All Tickets
  const handleClearTickets = async () => {
    setIsClearing(true);
    try {
      await fetch('/api/clear-tickets', { method: 'POST' });
      setTickets([]);
      setSelectedTicketId(null);
      setTicketDetail(null);
      setCustomerTicketId(null);
      setCustomerTicketDetail(null);
      await fetchAllData();
      showToast("All tickets and conversation history cleared!", "info");
    } catch (err) {
      showToast("Error clearing tickets", "error");
    } finally {
      setIsClearing(false);
    }
  };

  // Handler: Reset / Load Sample Tickets
  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/seed', { method: 'POST' });
      await fetchAllData();
      showToast("Sample demo tickets loaded successfully!", "success");
    } catch (err) {
      showToast("Error resetting data", "error");
    } finally {
      setIsResetting(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];
  const customerTickets = tickets.filter(t => t.customer_id === (selectedCustomer && selectedCustomer.id));

  // Ensure customer ticket detail strictly matches the selected customer
  const safeCustomerTicket = (customerTicketDetail && customerTicketDetail.ticket && customerTicketDetail.ticket.customer_id === selectedCustomer?.id)
    ? { ...customerTicketDetail.ticket, ...customerTicketDetail }
    : null;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onClearTickets={handleClearTickets}
        onResetData={handleResetData}
        onRunAllTickets={handleRunAllTickets}
        isClearing={isClearing}
        isResetting={isResetting}
        isRunningAll={isRunningAll}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* KPI Banner - Only shown on Resolver Dashboard */}
        {activeTab === 'resolver' && <StatsBanner stats={stats} />}

        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce">
            <div className={`px-4 py-3 rounded-xl border shadow-2xl text-xs font-semibold flex items-center space-x-2 ${
              toastMessage.type === 'success' ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50' :
              toastMessage.type === 'error' ? 'bg-rose-950/90 text-rose-200 border-rose-500/50' :
              toastMessage.type === 'warning' ? 'bg-amber-950/90 text-amber-200 border-amber-500/50' :
              'bg-slate-900/90 text-indigo-200 border-indigo-500/50'
            }`}>
              <span>{toastMessage.msg}</span>
            </div>
          </div>
        )}

        {/* Tab 1: Resolver Dashboard */}
        {activeTab === 'resolver' && (
          <ResolverDashboard
            tickets={tickets}
            selectedTicket={ticketDetail ? { ...ticketDetail.ticket, ...ticketDetail } : null}
            onSelectTicket={(id) => setSelectedTicketId(id)}
            onRunInvestigation={handleRunInvestigation}
            isInvestigating={isInvestigating}
            onApproveAction={handleApproveAction}
            onRejectAction={handleRejectAction}
            onEditAndApproveAction={handleEditAndApproveAction}
            onSupervisorReply={handleSupervisorReply}
            onRunAllTickets={handleRunAllTickets}
            isRunningAll={isRunningAll}
          />
        )}

        {/* Tab 2: Customer Portal (ChatGPT Style) */}
        {activeTab === 'customer' && (
          <CustomerPortal
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={handleSelectCustomer}
            customerTickets={customerTickets}
            onCreateTicket={handleCreateTicket}
            onCustomerReply={handleCustomerReply}
            selectedTicket={safeCustomerTicket}
            onSelectTicket={(id) => setCustomerTicketId(id)}
          />
        )}
      </main>
    </div>
  );
}
