# QuickRes — Agentic AI Customer Support Ticket Resolution System

**QuickRes** is an autonomous Agentic AI customer support resolution system powered by **LangGraph**, **Agentic RAG**, **authorized ERP/CRM tools**, **ticket-level memory & reflection**, and **Human-in-the-Loop (HITL) risk gating**.

Unlike simple chat bots, QuickRes actively investigates each ticket: it retrieves relevant customer profiles, subscription state, transaction history, searches corporate policy SOPs, reflects on evidence sufficiency, and gates high-risk operations (e.g. monetary refunds > $0, hardware replacements) for human supervisor sign-off.

---

## 🏗️ System Architecture

```
                      +-----------------------------+
                      | Customer Submits Ticket     |
                      +--------------+--------------+
                                     |
                                     v
                       +-------------+-------------+
                       |   LangGraph Agent State   |
                       +-------------+-------------+
                                     |
                +--------------------+--------------------+
                |                                         |
                v                                         v
   +------------+------------+              +-------------+-------------+
   |   Investigate Node      | <--------->  |   Tool Execution Node     |
   | (Decide needed facts)   |              | - get_order()             |
   +------------+------------+              | - check_subscription()    |
                |                           | - check_payment()         |
                v                           | - search_knowledge_base() |
   +------------+------------+              | - search_historical_cases()|
   |     Reflect Node        |              +---------------------------+
   | - Evidence sufficiency  |
   | - Policy verification   |
   | - Risk score calculation|
   +------------+------------+
                |
                v
   +------------+------------+
   |     Risk Gate Node      |
   +------------+------------+
        /               \
 (Low Risk)           (High Risk)
     /                     \
    v                       v
+------------------+   +------------------------------------+
| Auto-Resolve     |   | Await Human Supervisor Approval    |
| & Notify Customer|   | (Approve, Reject, or Edit Payload) |
+------------------+   +------------------------------------+
```

---

## 🚀 Key Features

1. **Agentic RAG & Investigation Loop**:
   - Dynamic tool calling based on ticket intent rather than hardcoded sequences.
   - Vector-indexed Knowledge Base & SOPs with BM25 hybrid search.
   - Case-based reasoning using the **Bitext Customer Support Dataset**.

2. **Reflection & Self-Correction**:
   - Agent validates retrieved evidence against corporate return windows (e.g., 30-day hardware return policy, subscription cancellation timestamps).
   - Detects missing information (e.g. customer requesting cancellation without order number) and automatically asks for clarification in the customer thread.

3. **Risk Gate & Human-in-the-Loop (HITL)**:
   - High-risk operations (e.g. $49.99 refund, damaged monitor replacement) are queued in the supervisor's approval panel.
   - Supervisors can **Approve & Execute**, **Reject with custom feedback**, or **Edit payload parameters**.

4. **Dual Interface**:
   - **Customer Portal**: Mock customer persona switcher (VIP / Standard), support ticket submission with demo presets, and a clean customer chat thread (internal tool traces are kept confidential).
   - **Resolver Dashboard**: Real-time ticket queue, visual LangGraph step-by-step trace viewer, memory & evidence drawer, and human approval action center.

---

## 🛠️ How to Run Locally

### 1. Start the FastAPI Backend
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Start the React Frontend
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
