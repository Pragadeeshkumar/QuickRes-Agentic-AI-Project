import json
import uuid
import os
import random
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from database import get_db_connection, init_db
from seed_data import seed_database
from agent.graph import run_agent_investigation
from agent.tools import resolve_ticket
from rag.vector_store import vector_store

app = FastAPI(title="QuickRes Agentic AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Request Models
class CreateTicketRequest(BaseModel):
    customer_id: str
    subject: str
    message: str
    category: Optional[str] = "GENERAL"
    order_id: Optional[str] = None
    auto_investigate: Optional[bool] = True

class CustomerReplyRequest(BaseModel):
    message: str
    reinvestigate: Optional[bool] = True

class HumanApprovalRequest(BaseModel):
    notes: Optional[str] = "Approved by human supervisor."

class HumanRejectRequest(BaseModel):
    notes: str = "Rejected by human supervisor."

class HumanEditApprovalRequest(BaseModel):
    edited_payload: Dict[str, Any]
    notes: Optional[str] = "Modified payload approved by supervisor."

class CreateOrderRequest(BaseModel):
    customer_id: str
    order_number: Optional[str] = None
    item_name: str
    quantity: Optional[int] = 1
    price: float
    status: Optional[str] = "Processing"
    tracking_number: Optional[str] = None
    shipping_address: Optional[str] = "123 Innovation Way, Suite 400, Austin, TX 78701"

# Ensure DB is seeded on startup
@app.on_event("startup")
def on_startup():
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM customers")
    count = cursor.fetchone()["count"]
    conn.close()
    if count == 0:
        seed_database()

@app.post("/api/clear-tickets")
def clear_all_tickets():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM investigation_traces")
    cursor.execute("DELETE FROM gated_actions")
    cursor.execute("DELETE FROM ticket_messages")
    cursor.execute("DELETE FROM tickets")
    conn.commit()
    conn.close()
    return {"status": "success", "message": "All tickets and traces cleared successfully."}

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "QuickRes Agentic AI Backend"}

@app.get("/api/agent/status")
def get_agent_status():
    from agent.llm import pluggable_llm
    return {
        "provider": pluggable_llm.provider,
        "model": pluggable_llm.model_name,
        "groq_keys_count": len(pluggable_llm.groq_keys),
        "active_key_index": pluggable_llm.current_groq_idx + 1 if pluggable_llm.groq_keys else 0
    }

@app.post("/api/seed")
def seed():
    seed_database()
    return {"status": "success", "message": "Database and Vector store seeded successfully!"}

@app.get("/api/customers")
def get_customers():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM customers ORDER BY tier DESC, name ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/customers/{customer_id}")
def get_customer_detail(customer_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
    cust = cursor.fetchone()
    if not cust:
        conn.close()
        raise HTTPException(status_code=404, detail="Customer not found")

    cursor.execute("SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC", (customer_id,))
    orders = [dict(r) for r in cursor.fetchall()]
    for o in orders:
        try:
            o["items"] = json.loads(o["items"])
        except Exception:
            pass

    cursor.execute("SELECT * FROM subscriptions WHERE customer_id = ?", (customer_id,))
    subs = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM payments WHERE customer_id = ? ORDER BY transaction_date DESC", (customer_id,))
    payments = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return {
        "customer": dict(cust),
        "orders": orders,
        "subscriptions": subs,
        "payments": payments
    }

@app.post("/api/orders")
def create_order(req: CreateOrderRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    order_id = f"ord_{uuid.uuid4().hex[:8]}"
    order_number = req.order_number or f"ORD-{random.randint(1000, 9999)}"
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    items = [{
        "item_name": req.item_name,
        "quantity": req.quantity or 1,
        "price": req.price
    }]
    total_amount = round((req.quantity or 1) * req.price, 2)
    tracking_num = req.tracking_number or (f"TRK-FDX-{random.randint(100000, 999999)}" if req.status in ["Shipped", "Delivered"] else None)

    cursor.execute('''
    INSERT INTO orders (id, customer_id, order_number, items, total_amount, order_date, status, tracking_number, shipping_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        order_id,
        req.customer_id,
        order_number,
        json.dumps(items),
        total_amount,
        now,
        req.status or "Processing",
        tracking_num,
        req.shipping_address
    ))

    # Also insert captured payment
    payment_id = f"pay_{uuid.uuid4().hex[:8]}"
    cursor.execute('''
    INSERT INTO payments (id, order_id, customer_id, amount, payment_method, status, transaction_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        payment_id,
        order_number,
        req.customer_id,
        total_amount,
        "Credit Card (Visa ...4242)",
        "Captured",
        now
    ))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "order": {
            "id": order_id,
            "customer_id": req.customer_id,
            "order_number": order_number,
            "items": items,
            "total_amount": total_amount,
            "status": req.status or "Processing",
            "order_date": now,
            "tracking_number": tracking_num,
            "shipping_address": req.shipping_address
        }
    }

@app.get("/api/tickets")
def get_tickets(status: Optional[str] = None, risk: Optional[str] = None, customer_id: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = '''
    SELECT t.*, c.name as customer_name, c.email as customer_email, c.tier as customer_tier
    FROM tickets t
    JOIN customers c ON t.customer_id = c.id
    WHERE 1=1
    '''
    params = []

    if status and status.upper() != "ALL":
        query += " AND t.status = ?"
        params.append(status.upper())
    if risk and risk.upper() != "ALL":
        query += " AND t.risk_level = ?"
        params.append(risk.upper())
    if customer_id:
        query += " AND t.customer_id = ?"
        params.append(customer_id)

    query += " ORDER BY t.created_at DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/tickets/{ticket_id}")
def get_ticket_detail(ticket_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Ticket info
    cursor.execute('''
    SELECT t.*, c.name as customer_name, c.email as customer_email, c.tier as customer_tier
    FROM tickets t
    JOIN customers c ON t.customer_id = c.id
    WHERE t.id = ?
    ''', (ticket_id,))
    ticket = cursor.fetchone()
    if not ticket:
        conn.close()
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Messages
    cursor.execute("SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC", (ticket_id,))
    messages = [dict(r) for r in cursor.fetchall()]

    # Investigation Traces
    cursor.execute("SELECT * FROM investigation_traces WHERE ticket_id = ? ORDER BY step_number ASC, timestamp ASC", (ticket_id,))
    traces_raw = cursor.fetchall()
    traces = []
    for tr in traces_raw:
        item = dict(tr)
        for field in ["tool_input", "tool_output"]:
            if item.get(field):
                try:
                    item[field] = json.loads(item[field])
                except Exception:
                    pass
        traces.append(item)

    # Gated actions
    cursor.execute("SELECT * FROM gated_actions WHERE ticket_id = ? ORDER BY created_at DESC", (ticket_id,))
    actions_raw = cursor.fetchall()
    actions = []
    for a in actions_raw:
        item = dict(a)
        if item.get("payload_json"):
            try:
                item["payload"] = json.loads(item["payload_json"])
            except Exception:
                pass
        actions.append(item)

    # Customer orders & subscriptions for context drawer
    cust_id = ticket["customer_id"]
    cursor.execute("SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC", (cust_id,))
    orders = [dict(r) for r in cursor.fetchall()]
    for o in orders:
        try:
            o["items"] = json.loads(o["items"])
        except Exception:
            pass

    cursor.execute("SELECT * FROM subscriptions WHERE customer_id = ?", (cust_id,))
    subs = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return {
        "ticket": dict(ticket),
        "messages": messages,
        "traces": traces,
        "gated_actions": actions,
        "context": {
            "orders": orders,
            "subscriptions": subs
        }
    }

@app.post("/api/tickets")
def create_ticket(req: CreateTicketRequest, bg_tasks: BackgroundTasks):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Determine intent & category heuristic
    ticket_id = f"TCK-2026-{uuid.uuid4().hex[:4].upper()}"
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    category = req.category or "GENERAL"
    intent = "inquiry"

    lower_text = f"{req.subject} {req.message}".lower()
    if "refund" in lower_text or "charged" in lower_text or "broken" in lower_text:
        category = "REFUND"
        intent = "request_refund"
    elif "subscription" in lower_text or "cancel" in lower_text:
        category = "SUBSCRIPTION"
        intent = "manage_subscription"
    elif "shipping" in lower_text or "track" in lower_text or "where is" in lower_text:
        category = "SHIPPING"
        intent = "track_order"

    cursor.execute('''
    INSERT INTO tickets (id, customer_id, order_id, subject, initial_message, category, intent, status, risk_level, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', 'UNASSESSED', ?, ?)
    ''', (ticket_id, req.customer_id, req.order_id, req.subject, req.message, category, intent, now, now))

    # Add message
    msg_id = f"MSG-{uuid.uuid4().hex[:8]}"
    cursor.execute('''
    INSERT INTO ticket_messages (id, ticket_id, sender, message, created_at)
    VALUES (?, ?, 'customer', ?, ?)
    ''', (msg_id, ticket_id, req.message, now))

    conn.commit()
    conn.close()

    if req.auto_investigate:
        # Run synchronous or in background
        run_agent_investigation(ticket_id)

    return {"ticket_id": ticket_id, "status": "created"}

@app.post("/api/tickets/{ticket_id}/investigate")
def trigger_investigation(ticket_id: str):
    result = run_agent_investigation(ticket_id)
    return result

@app.post("/api/tickets/run-all")
def run_all_tickets():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM tickets WHERE status IN ('NEW', 'PENDING', 'UNASSESSED', 'INVESTIGATING', 'AWAITING_CUSTOMER_INFO')")
    tickets = cursor.fetchall()
    conn.close()

    ticket_ids = [t["id"] for t in tickets]
    results = []
    for tid in ticket_ids:
        try:
            res = run_agent_investigation(tid)
            results.append({
                "ticket_id": tid,
                "status": "completed",
                "result": res.get("final_output", {}).get("type"),
                "risk_level": res.get("risk_assessment", {}).get("risk_level")
            })
        except Exception as e:
            results.append({"ticket_id": tid, "status": "error", "error": str(e)})

    return {
        "status": "success",
        "processed_count": len(results),
        "results": results
    }

@app.post("/api/tickets/{ticket_id}/reply")
def customer_reply(ticket_id: str, req: CustomerReplyRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Add customer message
    msg_id = f"MSG-{uuid.uuid4().hex[:8]}"
    cursor.execute('''
    INSERT INTO ticket_messages (id, ticket_id, sender, message, created_at)
    VALUES (?, ?, 'customer', ?, ?)
    ''', (msg_id, ticket_id, req.message, now))

    cursor.execute("UPDATE tickets SET updated_at = ? WHERE id = ?", (now, ticket_id))
    conn.commit()
    conn.close()

    # If reinvestigate is true, re-run agent investigation with new info!
    if req.reinvestigate:
        run_agent_investigation(ticket_id)

    return {"status": "reply_sent"}

@app.post("/api/actions/{action_id}/approve")
def approve_action(action_id: str, req: HumanApprovalRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("SELECT * FROM gated_actions WHERE id = ?", (action_id,))
    act = cursor.fetchone()
    if not act:
        conn.close()
        raise HTTPException(status_code=404, detail="Action not found")

    ticket_id = act["ticket_id"]
    payload = json.loads(act["payload_json"])
    action_type = act["action_type"]

    # Mark action approved
    cursor.execute('''
    UPDATE gated_actions SET status = 'APPROVED', human_notes = ?, reviewed_at = ? WHERE id = ?
    ''', (req.notes, now, action_id))

    # Execute business logic
    public_msg = ""
    internal_summary = ""
    if action_type == "REFUND":
        amount = payload.get("amount", 0.0)
        pay_method = payload.get("payment_method", "your original payment method")
        public_msg = f"Good news! Your refund of ${amount:.2f} has been approved by our support supervisor and processed back to {pay_method}. It should appear in your statement within 2-3 business days.\n\nThank you for your patience and for choosing QuickRes!"
        internal_summary = f"Supervisor approved refund of ${amount:.2f}. Payout executed. Reason: {req.notes}"
    elif action_type == "REPLACEMENT_OR_REFUND":
        amount = payload.get("amount", 0.0)
        public_msg = f"Your request has been approved! We have initiated a free expedited replacement for your damaged item. A prepaid return shipping label has been dispatched to your email.\n\nThank you for providing the details!"
        internal_summary = f"Supervisor authorized free replacement for order {payload.get('order_number')}. Reason: {req.notes}"
    else:
        public_msg = f"Your request has been approved and processed by our support team.\n\nThank you!"
        internal_summary = f"Supervisor approved gated action {action_type}. Reason: {req.notes}"

    conn.commit()
    conn.close()

    # Resolve ticket
    resolve_ticket(ticket_id, public_msg, internal_summary, is_auto=False)
    return {"status": "action_approved", "ticket_status": "RESOLVED"}

@app.post("/api/actions/{action_id}/reject")
def reject_action(action_id: str, req: HumanRejectRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("SELECT * FROM gated_actions WHERE id = ?", (action_id,))
    act = cursor.fetchone()
    if not act:
        conn.close()
        raise HTTPException(status_code=404, detail="Action not found")

    ticket_id = act["ticket_id"]

    cursor.execute('''
    UPDATE gated_actions SET status = 'REJECTED', human_notes = ?, reviewed_at = ? WHERE id = ?
    ''', (req.notes, now, action_id))

    public_msg = f"Thank you for your patience. After a secondary supervisor review, we are unable to approve this request in its current form for the following reason: {req.notes}. Please feel free to reply if you can provide additional documentation."

    cursor.execute("UPDATE tickets SET status = 'ESCALATED', updated_at = ? WHERE id = ?", (now, ticket_id))
    cursor.execute(
        "INSERT INTO ticket_messages (id, ticket_id, sender, message, created_at) VALUES (?, ?, 'human_agent', ?, ?)",
        (f"MSG-{uuid.uuid4().hex[:8]}", ticket_id, public_msg, now)
    )
    conn.commit()
    conn.close()
    return {"status": "action_rejected", "ticket_status": "ESCALATED"}

@app.post("/api/actions/{action_id}/edit")
def edit_and_approve_action(action_id: str, req: HumanEditApprovalRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("SELECT * FROM gated_actions WHERE id = ?", (action_id,))
    act = cursor.fetchone()
    if not act:
        conn.close()
        raise HTTPException(status_code=404, detail="Action not found")

    ticket_id = act["ticket_id"]

    cursor.execute('''
    UPDATE gated_actions
    SET status = 'EDITED', payload_json = ?, human_notes = ?, reviewed_at = ?
    WHERE id = ?
    ''', (json.dumps(req.edited_payload), req.notes, now, action_id))

    amount = req.edited_payload.get("amount", 0.0)
    public_msg = f"Your support ticket has been reviewed and approved with custom adjustments: An authorized refund of ${amount:.2f} has been processed to your account.\n\nThank you for working with us!"
    internal_summary = f"Supervisor edited and approved payload to ${amount:.2f}. Notes: {req.notes}"

    conn.commit()
    conn.close()

    resolve_ticket(ticket_id, public_msg, internal_summary, is_auto=False)
    return {"status": "action_edited_and_approved", "ticket_status": "RESOLVED"}

@app.get("/api/kb")
def get_kb():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM kb_articles ORDER BY category ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/stats")
def get_stats():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total FROM tickets")
    total = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as auto_res FROM tickets WHERE status = 'AUTO_RESOLVED'")
    auto_res = cursor.fetchone()["auto_res"]

    cursor.execute("SELECT COUNT(*) as pending_appr FROM gated_actions WHERE status = 'PENDING'")
    pending_appr = cursor.fetchone()["pending_appr"]

    cursor.execute("SELECT COUNT(*) as resolved FROM tickets WHERE status IN ('RESOLVED', 'AUTO_RESOLVED')")
    resolved = cursor.fetchone()["resolved"]

    cursor.execute("SELECT COUNT(*) as tool_calls FROM investigation_traces WHERE node_name = 'tool_execution'")
    tool_calls = cursor.fetchone()["tool_calls"]

    conn.close()
    return {
        "total_tickets": total,
        "auto_resolved_count": auto_res,
        "pending_approvals": pending_appr,
        "resolved_count": resolved,
        "total_tool_calls": tool_calls,
        "auto_resolution_rate": round((auto_res / (resolved or 1)) * 100, 1)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
