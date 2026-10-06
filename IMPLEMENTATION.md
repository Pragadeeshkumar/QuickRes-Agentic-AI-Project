# QuickRes Agentic AI — Implementation & Architecture Guide

QuickRes Agentic AI is an autonomous, enterprise-grade customer support investigation and resolution system. Rather than using rigid hardcoded pipelines or ungrounded chatbot wrappers, QuickRes operates as an **autonomous agentic state machine** powered by **LangGraph**, **Pluggable LLMs (Groq LPUs / Gemini / OpenAI)**, **Hybrid BM25 Vector RAG**, **Enterprise CRM/ERP Tools**, and **Human-in-the-Loop (HITL) Risk Gating**.

---

## 🏗️ System Architecture & Workflow

```mermaid
flowchart TD
    User([Customer / User]) -->|Submit Ticket / Reply| FastAPIServer[FastAPI Backend (main.py)]
    FastAPIServer --> SQLite[(SQLite DB: quickres.db)]
    FastAPIServer --> AgentGraph[LangGraph State Machine (graph.py)]

    subgraph Agentic Investigation Loop
        AgentGraph --> InvestigateNode[1. Autonomous Investigation Node]
        InvestigateNode -->|LLM chooses Tool Call| ToolExecNode[2. Tool Execution Node]
        ToolExecNode -->|Observation returned to State| InvestigateNode
        
        ToolExecNode --> CRMTools[CRM / ERP Tools: Orders, Subscriptions, Payments]
        ToolExecNode --> RAGStore[Hybrid RAG: Corporate SOPs & Bitext Cases]
        
        InvestigateNode -->|Evidence Sufficient| ReflectNode[3. Policy Reflection Node]
        ReflectNode --> RiskGateNode[4. Deterministic Risk Gate Node]
    end

    RiskGateNode -->|LOW RISK: Tracking, Status, Password| AutoAction[Auto-Resolve & Respond]
    RiskGateNode -->|HIGH RISK: Refunds > $0, Hardware Swap| GatedAction[Queue Gated Action - Awaiting Approval]
    RiskGateNode -->|INFO GAP: Missing Order/Details| ClarifyAction[Ask Clarification in Thread]

    GatedAction --> SupervisorUI[Supervisor Approval Panel (Frontend)]
    SupervisorUI -->|Approve / Modify / Reject| FastAPIServer
    AutoAction --> CustomerUI[Customer Support Portal (Frontend)]
    ClarifyAction --> CustomerUI
```

---

## 📚 What is in the RAG? (Documents, Policies & Datasets)

The RAG subsystem ([`backend/rag/vector_store.py`](file:///e:/projects/QuickRes%20Agentic%20AI/backend/rag/vector_store.py)) indexes two distinct knowledge collections using an in-memory **BM25 Okapi lexical-semantic hybrid store** with tokenized field scoring and title bonuses:

### 1. Corporate Knowledge Base & Standard Operating Procedures (SOPs)
Stored in `kb_articles` and searched via `search_knowledge_base()`:

| Policy ID | Title | Category | Key Policy Rules & Gating Constraints |
| :--- | :--- | :--- | :--- |
| **`KB-POL-001`** | **Subscription Cancellation & Erroneous Billing Policy** | `SUBSCRIPTION` | • Customers cancelling prior to billing renewal are 100% entitled to full refund.<br>• Requires cross-referencing `subscriptions.cancelled_at` against `payments.transaction_date`.<br>• Gating: All monetary payouts require Supervisor Approval. |
| **`KB-POL-002`** | **Order Return, Damaged Goods & 30-Day Window Policy** | `REFUND` / `RETURN` | • Physical goods return window is **30 days** from confirmed delivery.<br>• Defective / Damaged items eligible for expedited free replacement or 100% refund.<br>• Requests > 30 days are non-refundable for cash (optional 15% store credit).<br>• Gating: Refunds > $50 or any hardware replacements require human supervisor sign-off. |
| **`KB-POL-003`** | **Shipping Tracking & Delivery Inquiries Policy** | `SHIPPING` | • Real-time carrier tracking lookup (FedEx, UPS, DHL).<br>• Orders in 'Processing' status can be modified/cancelled autonomously within 24h.<br>• Orders in 'Shipped' status cannot be intercepted; customer must initiate standard return.<br>• Gating: Low-Risk, auto-resolved without human supervisor sign-off. |
| **`KB-POL-004`** | **Account Security, Password Resets & Email Changes** | `ACCOUNT` | • Password reset magic links sent automatically to primary verified email (Low-Risk).<br>• Email updates require verifying two previous order IDs or human sign-off.<br>• Account unlock triggers automated verification check. |

### 2. Historical Support Cases (Few-Shot Case-Based Reasoning)
Stored in `historical_cases` and searched via `search_historical_cases()`:
- **Dataset**: Built from the **Bitext Customer Support Benchmark Dataset** (`Bitext_Sample_Customer_Support_Training_Dataset_27K_responses-v11.csv`).
- **Contents**: 27,000+ real-world support inquiries categorized across intents (cancellations, delivery tracking, payment disputes, account issues, replacements) with historical investigation summaries and resolution outcomes.
- **Purpose**: Enables the LLM to perform case-based reasoning by retrieving how previous human agents resolved analogous edge cases.

---

## 🛠️ Available Agent Tools

The autonomous planner has access to 7 typed tools in [`backend/agent/tools.py`](file:///e:/projects/QuickRes%20Agentic%20AI/backend/agent/tools.py):

1. **`get_customer(customer_id)`**: Retrieves customer profile, loyalty points, customer tier (VIP/Standard/Enterprise), account balance, and status.
2. **`get_order(order_id, customer_id)`**: Retrieves items, line-item totals, shipping address, status, carrier tracking numbers, and enforces strict tenant isolation.
3. **`get_customer_orders(customer_id)`**: Fetches all recent order history for a customer account.
4. **`check_payment(payment_id, order_id, customer_id)`**: Validates payment capture status, payment method, charge amount, and refund history.
5. **`check_subscription(customer_id, subscription_id)`**: Inspects subscription tier, monthly cost, start date, renewal date, and cancellation timestamps.
6. **`search_knowledge_base(query, category)`**: BM25 hybrid search across corporate SOP policies.
7. **`search_historical_cases(query, category)`**: Retrieves historical case resolutions and past precedent.

---

## 🛡️ Risk Gating & Human-in-the-Loop (HITL)

QuickRes enforces deterministic risk gates:
- **Low-Risk Actions** (e.g. tracking info, FAQ replies, password resets): Executed autonomously; ticket marked `RESOLVED`.
- **High-Risk Actions** (e.g. monetary refunds, hardware replacements > $50):
  - Agent proposes a `GATED_ACTION`.
  - Ticket status transitions to `AWAITING_APPROVAL`.
  - Supervisor reviews proposed action in the **Resolver Dashboard / Approval Panel**, with full power to **Approve & Execute**, **Reject with feedback**, or **Edit payload parameters**.

---

## 🚀 How to Run QuickRes

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The application will be accessible at **`http://localhost:3000`** (or `http://localhost:5173`).
