# QuickRes Agentic AI — Implementation Guide & System Documentation

QuickRes Agentic AI is an enterprise-grade autonomous customer support operations platform. Unlike traditional single-turn chatbots or standard Retrieval-Augmented Generation (RAG) wrappers, QuickRes operates as a **stateful, cyclic agentic state machine** powered by **LangGraph**, **Google Gemini 2.5 Flash**, **ChromaDB dense vector embeddings**, and a **Human-in-the-Loop (HITL) Policy Reflection & Risk Gating engine**.

---

## 1. System Architecture Overview

```mermaid
flowchart TD
    User([Customer / User]) -->|Submit Ticket / Reply| FastAPIServer[FastAPI REST Server (main.py)]
    FastAPIServer --> SQLite[(SQLite DB: quickres.db)]
    FastAPIServer --> AgentGraph[LangGraph State Machine (graph.py)]

    subgraph LangGraph ReAct Cycle
        AgentGraph --> InvestigateNode[1. Investigate Node (Planner)]
        InvestigateNode -->|Action: TOOL_CALL| ToolExecutionNode[2. Tool Execution Node]
        ToolExecutionNode -->|Output to State| InvestigateNode
        
        ToolExecutionNode --> CRMTools[CRM & Ledger Tools (tools.py)]
        ToolExecutionNode --> ChromaRAG[Dense Vector RAG (vector_store.py)]
        
        InvestigateNode -->|Action: PROCEED_TO_REFLECT| ReflectNode[3. Reflect & Evaluate Node]
        ReflectNode --> RiskGateNode[4. Risk Gate Node]
    end

    RiskGateNode -->|LOW RISK: Auto Resolve| AutoAction[Execute Action / Public Reply]
    RiskGateNode -->|HIGH RISK: Monetary / Hardware| GatedAction[Queue Gated Action (AWAITING_APPROVAL)]
    RiskGateNode -->|INFO GAP: Unknown / Mismatched Order| ClarifyAction[Ask Clarification (AWAITING_INFO)]

    GatedAction --> SupervisorUI[Supervisor Approval Panel (Frontend)]
    SupervisorUI -->|Approve / Modify / Reject| FastAPIServer
    AutoAction --> CustomerUI[Customer Support Portal (Frontend)]
    ClarifyAction --> CustomerUI
```

---

## 2. Directory Structure & Codebase Layout

```
QuickRes Agentic AI/
├── backend/
│   ├── agent/
│   │   ├── graph.py                 # LangGraph state machine, nodes & execution runner
│   │   ├── llm.py                   # Multi-provider LLM connector & ReAct reasoning prompts
│   │   └── tools.py                 # 7 typed tools with strict customer account isolation
│   ├── rag/
│   │   └── vector_store.py          # ChromaDB embedding store for SOP policies & Bitext cases
│   ├── database.py                  # SQLite schema definitions & connection manager
│   ├── seed_data.py                 # Benchmark CRM records & corporate SOP seeds
│   ├── main.py                      # FastAPI REST API endpoints & order creators
│   ├── generate_report_doc.py       # Word document report generator (.docx)
│   └── test_agent.py                # Automated investigation test suite
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CustomerPortal.jsx   # Multi-view customer portal with 2s step loader
│   │   │   ├── ResolverDashboard.jsx# Agent investigation trace & ticket triage view
│   │   │   ├── ApprovalPanel.jsx    # Human Supervisor HITL approval/reject/edit panel
│   │   │   ├── EvidencePanel.jsx    # Live customer account ledger drawer
│   │   │   ├── KnowledgeBaseView.jsx# Policy SOP documentation explorer
│   │   │   ├── StatsBanner.jsx      # Live operational SLA & automation metrics
│   │   │   └── Navbar.jsx           # App navigation & persona switcher
│   │   ├── App.jsx                  # Main application state & polling coordinator
│   │   └── index.css                # Glassmorphism design tokens & Tailwind utilities
│   ├── package.json                 # Frontend dependencies & Vite configuration
│   └── vite.config.js               # Dev server port & proxy configuration
├── QuickRes_Agentic_AI_Final_Project_Report.docx  # 15-20 Page Project Report
├── IMPLEMENTATION.md                # System implementation guide (this file)
└── README.md                        # Quickstart documentation
```

---

## 3. Core Backend Components

### 3.1 LangGraph Orchestration (`backend/agent/graph.py`)
The investigation lifecycle is governed by a compiled `StateGraph`:
- **`AgentState` Structure**:
  ```python
  class AgentState(TypedDict):
      ticket_id: str
      customer_id: str
      ticket: Dict[str, Any]
      tool_history: List[Dict[str, Any]]
      pending_tool: Dict[str, Any]
      reflections: List[Dict[str, Any]]
      current_hypothesis: str
      risk_assessment: Dict[str, Any]
      eval_result: Dict[str, Any]
      final_output: Dict[str, Any]
      step_count: int
      next_action: str
  ```
- **Execution Flow**:
  1. **`investigate_node`**: Invokes LLM planner (`decide_investigation_step`) to reason on missing facts. If missing evidence is identified, generates a tool call and routes to `tool_execution`.
  2. **`tool_execution_node`**: Executes the requested tool function, captures structured output, appends to `tool_history`, logs step in `investigation_traces`, and cycles back to `investigate_node`.
  3. **`reflect_node`**: Invokes `reflect_and_evaluate` to synthesize all gathered facts against retrieved SOP policies.
  4. **`risk_gate_node`**: Enforces determinism: dispatches low-risk autonomous actions or queues gated high-risk actions.

### 3.2 Reasoning & Reflection Engine (`backend/agent/llm.py`)
- **Direct REST Integration**: Uses direct HTTP requests to Google Generative Language API (`gemini-2.5-flash`) with tight timeouts (3.5s) to guarantee maximum reliability and low latency.
- **Rule-Based Fallback Engine**: If an external API timeout or rate limit occurs, an intelligent fallback evaluator guarantees 100% uptime with deterministic policy adherence.
- **Multi-Turn Order Reference Extraction**: Automatically parses customer messages from newest to oldest for order numbers (`ORD-XXXX`, `#XXXX`, or 4-digit numbers) so customer corrections in replies take immediate effect.

### 3.3 Strict Account Isolation & Tool Registry (`backend/agent/tools.py`)
All tools enforce strict multi-tenant boundary checks:
| Tool Name | Parameters | Purpose | Isolation Guardrail |
|---|---|---|---|
| `get_customer` | `customer_id_or_email` | Retrieves account tier, status, balance | Returns profile for verified ID |
| `get_order` | `order_number`, `customer_id` | Retrieves items, shipping status, tracking | **Rejects lookups if order is owned by another customer** |
| `get_customer_orders` | `customer_id` | Lists all recent orders for customer | Filters strictly by `customer_id` |
| `check_payment` | `payment_id`, `customer_id` | Verifies captured amounts & transactions | Verifies payment matches `customer_id` |
| `check_subscription` | `customer_id` | Retrieves plan tier & cancellation date | Scoped strictly to customer |
| `search_knowledge_base` | `query`, `category` | Semantic search over corporate SOPs | Scoped to policy namespaces |
| `search_historical_cases`| `query`, `category` | Dense vector search over past cases | Benchmark case studies |

### 3.4 Dense Vector RAG (`backend/rag/vector_store.py`)
- Built using **ChromaDB** with **Sentence-Transformers (`all-MiniLM-L6-v2`)**.
- Vectors indexed:
  - `KB-POL-001`: Subscription Erroneous Charge & Refund SOP (100% refund on charges post-cancellation).
  - `KB-POL-002`: Damaged Hardware Replacement Policy (30-day delivery window; replacements >$50 gated).
  - `KB-POL-003`: Order Modification & Cancellation SOP (24-hour pre-shipment cancellation; in-transit orders cannot be cancelled).

---

## 4. Frontend Architecture & User Experience

### 4.1 Customer Support Portal (`frontend/src/components/CustomerPortal.jsx`)
- **Paced 5-Step Pre-Chat Loader**: When submitting a ticket, the UI displays a clean 5-step progress card advancing smoothly at **2 seconds per step** (10s total) before opening the chat thread:
  1. *Ticket received & logged into support queue*
  2. *AI Agent analyzing issue & retrieving customer records...*
  3. *Querying CRM order history & transaction ledger...*
  4. *Verifying corporate SOP policies & resolution precedent...*
  5. *Formulating response & evaluating risk safety gate...*
- **Order Selection Guardrails**: Orders with status `Shipped` or `Cancelled` are automatically disabled in the dropdown when selecting *Order Modification / Cancel*, preventing invalid submissions.
- **In-Portal "+ Add Order" Mock Tool**: Customers can create custom test orders directly in the portal (`Processing`, `Shipped`, `Delivered`, etc.) to test cancellation and refund workflows without modifying database tables.

### 4.2 Resolver & Supervisor Dashboard
- **Investigation Trace Visualizer**: Displays the real-time reasoning steps, tool inputs, and raw outputs generated during the LangGraph investigation.
- **Human-in-the-Loop Approval Panel (`ApprovalPanel.jsx`)**:
  - Displays pending high-risk disbursements (e.g. monetary refunds >$0 or monitor replacements >$50).
  - Allows supervisors to **Approve**, **Reject with Notes**, or **Edit Action Payload** (e.g. adjusting refund amounts) before final execution.

---

## 5. Database Schema (`backend/database.py`)

```sql
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    tier TEXT DEFAULT 'Standard',
    loyalty_points INTEGER DEFAULT 0,
    balance REAL DEFAULT 0.0,
    status TEXT DEFAULT 'Active',
    created_at TEXT NOT NULL
);

CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    order_number TEXT UNIQUE NOT NULL,
    items TEXT NOT NULL,
    total_amount REAL NOT NULL,
    order_date TEXT NOT NULL,
    delivery_date TEXT,
    status TEXT NOT NULL,
    tracking_number TEXT,
    shipping_address TEXT,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    customer_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL,
    transaction_date TEXT NOT NULL,
    refunded_amount REAL DEFAULT 0.0,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    price REAL NOT NULL,
    billing_cycle TEXT NOT NULL,
    status TEXT NOT NULL,
    start_date TEXT NOT NULL,
    cancelled_at TEXT,
    renewal_date TEXT,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE tickets (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    order_id TEXT,
    subject TEXT NOT NULL,
    initial_message TEXT NOT NULL,
    category TEXT NOT NULL,
    intent TEXT,
    status TEXT DEFAULT 'NEW',
    risk_level TEXT DEFAULT 'LOW',
    resolution_summary TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE ticket_messages (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(ticket_id) REFERENCES tickets(id)
);

CREATE TABLE investigation_traces (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    node_name TEXT NOT NULL,
    thought TEXT,
    tool_name TEXT,
    tool_input TEXT,
    tool_output TEXT,
    hypothesis TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(ticket_id) REFERENCES tickets(id)
);

CREATE TABLE gated_actions (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    risk_reason TEXT NOT NULL,
    risk_level TEXT DEFAULT 'HIGH',
    status TEXT DEFAULT 'PENDING',
    human_notes TEXT,
    created_at TEXT NOT NULL,
    reviewed_at TEXT,
    FOREIGN KEY(ticket_id) REFERENCES tickets(id)
);
```

---

## 6. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status |
| `POST` | `/api/seed` | Seed database & ChromaDB vector store |
| `GET` | `/api/customers` | List all customer profiles |
| `GET` | `/api/customers/{id}` | Customer detail with orders, subscriptions, and payments |
| `POST` | `/api/orders` | Create custom customer order (Live UI Mock) |
| `GET` | `/api/tickets` | Query ticket list with filters (`status`, `risk`, `customer_id`) |
| `POST` | `/api/tickets` | Create a new ticket & trigger agent investigation |
| `GET` | `/api/tickets/{id}` | Full ticket detail with messages, traces, and gated actions |
| `POST` | `/api/tickets/{id}/reply` | Customer reply endpoint (triggers multi-turn re-investigation) |
| `POST` | `/api/actions/{id}/approve` | Supervisor approve gated action |
| `POST` | `/api/actions/{id}/reject` | Supervisor reject gated action with audit notes |
| `POST` | `/api/actions/{id}/edit` | Supervisor modify payload & approve |
| `GET` | `/api/stats` | Aggregated SLA, volume, and automation metrics |

---

## 7. Setup & Execution Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- (Optional) Google Gemini API Key in `.env`: `GEMINI_API_KEY=your_key_here`

### Step 1: Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
pip install python-docx
```

### Step 2: Launch Backend Server
```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API will run at `http://127.0.0.1:8000` (Swagger UI at `http://127.0.0.1:8000/docs`).*

### Step 3: Install & Launch Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend Customer Portal & Dashboard will run at `http://localhost:3000`.*

---

## 8. Verified Test Scenarios

1. **Subscription Charge After Cancellation (`KB-POL-001`)**:
   - Customer charged $49.99 post-cancellation.
   - Agent verifies cancellation date, payment capture, gates $49.99 refund for Supervisor review.
2. **Damaged Hardware Replacement (`KB-POL-002`)**:
   - Customer reports cracked gaming monitor (`ORD-8842` - $349.50).
   - Agent verifies delivery date (<30 days), gates $349.50 replacement for Supervisor approval.
3. **Pre-Shipment Cancellation (`KB-POL-003`)**:
   - Customer cancels `Processing` order.
   - Agent validates status and autonomously marks order as `Cancelled`.
4. **Dispatched Order Cancellation Rule**:
   - Customer attempts to cancel `Shipped` order (`ORD-9921`).
   - Agent explains in-transit policy and redirects to returns upon delivery.
5. **Cross-Account Ownership Protection**:
   - Customer attempts to cancel or track another customer's order.
   - Agent refuses, protects tenant data, and prompts clarification with customer's own active orders.
