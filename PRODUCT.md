# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Customer Support Agents & Supervisors:** Review incoming customer tickets, monitor internal step-by-step agent reasoning traces, inspect evidence, and approve/reject/modify high-risk financial or replacement gated actions.
- **End Customers:** Submit support tickets, track order deliveries, request cancellations or refunds, and interact in real-time with the support AI.

## Product Purpose

QuickRes is an Autonomous Customer Support Ticket Resolution and Verification System. It eliminates routine support backlogs by autonomously investigating and resolving low-risk inquiries while enforcing strict policy adherence and human-in-the-loop gating for high-risk financial or hardware replacement actions.

## Positioning

Unlike unconstrained chatbot wrappers, QuickRes uses a deterministic, risk-evaluated multi-step LangGraph pipeline powered by Groq LPUs with dual-key automatic failover. It verifies every claim against internal CRM records, databases, and policy vector stores before taking action.

## Operating Context

- **Resolver Dashboard:** Operator console showing real-time ticket queues, risk badges, step-by-step agent investigation traces, retrieved evidence, confidence scores, and pending supervisor approval cards.
- **Customer Portal:** Clean user-facing chat thread with context sidebar displaying active orders, ticket metadata, and resolution progress.

## Capabilities and Constraints

- **Autonomous Tool Use:** Authorized tools for customer lookup (`get_customer`), order inspection (`get_order`), order history (`get_customer_orders`), payment verification (`check_payment`), subscription details (`check_subscription`), and RAG vector searches (`search_knowledge_base`, `search_historical_cases`).
- **Policy Reflection & Risk Gating:** High-value hardware replacements (> $50) and monetary refunds (> $0) trigger `GATED_ACTION` requiring supervisor review.
- **LLM Infrastructure:** Groq API integration (`openai/gpt-oss-120b` / `llama-3.3-70b-versatile`) with dual-key automatic failover and Gemini fallback.
- **Backend & Frontend:** FastAPI backend with SQLite persistence and Chroma vector store; React + TailwindCSS modern dark-mode frontend.

## Brand Commitments

- **Tone:** Professional, transparent, empathetic, and security-conscious.
- **Name:** QuickRes Agentic AI.

## Product Principles

1. **Verify Before Action:** Never modify customer state or execute financial actions without verified CRM records and policy grounding.
2. **Account Security & Isolation:** Never disclose or alter orders belonging to different customer accounts.
3. **Transparent Auditing:** Every agent reasoning thought, tool execution, and reflection is stored and reviewable in real time.
4. **Frictionless Human-in-the-Loop:** High-risk actions generate clear, editable approval cards for supervisors without blocking the customer interface.
