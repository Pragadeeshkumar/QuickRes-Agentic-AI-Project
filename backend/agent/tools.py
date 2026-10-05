import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from database import get_db_connection
from rag.vector_store import vector_store

def get_customer(customer_id_or_email: str) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM customers WHERE id = ? OR email = ?",
        (customer_id_or_email, customer_id_or_email)
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return {"error": f"Customer '{customer_id_or_email}' not found."}

def get_order(order_number: str, customer_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM orders WHERE order_number = ? OR id = ?",
        (order_number, order_number)
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"error": f"Order '{order_number}' was not found in database records."}

    order_dict = dict(row)
    try:
        order_dict["items"] = json.loads(order_dict["items"])
    except Exception:
        pass

    # Strict Account Isolation Check
    if customer_id and order_dict.get("customer_id") != customer_id:
        return {
            "error": f"Security & Account Isolation: Order '{order_number}' does not belong to customer account '{customer_id}' (registered to another customer).",
            "mismatch": True,
            "order_number": order_number,
            "requesting_customer_id": customer_id
        }

    return order_dict

def get_customer_orders(customer_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC",
        (customer_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    results = []
    for r in rows:
        d = dict(r)
        try:
            d["items"] = json.loads(d["items"])
        except Exception:
            pass
        results.append(d)
    return results

def check_payment(payment_id_or_order_number: str, customer_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM payments WHERE id = ? OR order_id = ?",
        (payment_id_or_order_number, payment_id_or_order_number)
    )
    row = cursor.fetchone()
    if not row:
        # Check payments by customer if subscription
        target_cust = customer_id or payment_id_or_order_number
        cursor.execute(
            "SELECT * FROM payments WHERE customer_id = ? ORDER BY transaction_date DESC LIMIT 1",
            (target_cust,)
        )
        row = cursor.fetchone()
    conn.close()
    if row:
        pay_dict = dict(row)
        if customer_id and pay_dict.get("customer_id") and pay_dict.get("customer_id") != customer_id:
            return {
                "error": f"Payment record belongs to a different customer account ({pay_dict.get('customer_id')}) and not '{customer_id}'."
            }
        return pay_dict
    return {"error": f"Payment record not found for query '{payment_id_or_order_number}'."}

def check_subscription(customer_id: str) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM subscriptions WHERE customer_id = ?",
        (customer_id,)
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return {"error": f"No subscription found for customer '{customer_id}'."}

def search_knowledge_base(query: str, category: Optional[str] = None, top_k: int = 3) -> List[Dict[str, Any]]:
    return vector_store.search_kb(query=query, top_k=top_k, category=category)

def search_historical_cases(query: str, category: Optional[str] = None, top_k: int = 3) -> List[Dict[str, Any]]:
    return vector_store.search_cases(query=query, top_k=top_k, category=category)

def ask_customer_clarification(ticket_id: str, question: str) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    msg_id = f"MSG-{uuid.uuid4().hex[:8]}"
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute(
        "INSERT INTO ticket_messages (id, ticket_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?)",
        (msg_id, ticket_id, "agent_ai", question, now)
    )
    cursor.execute(
        "UPDATE tickets SET status = 'AWAITING_CUSTOMER_INFO', updated_at = ? WHERE id = ?",
        (now, ticket_id)
    )
    conn.commit()
    conn.close()
    return {"status": "clarification_requested", "question": question, "ticket_status": "AWAITING_CUSTOMER_INFO"}

def propose_gated_action(ticket_id: str, action_type: str, payload: Dict[str, Any], risk_reason: str, risk_level: str = "HIGH") -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    action_id = f"ACT-{uuid.uuid4().hex[:8]}"
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute(
        '''INSERT INTO gated_actions (id, ticket_id, action_type, payload_json, risk_reason, risk_level, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)''',
        (action_id, ticket_id, action_type, json.dumps(payload), risk_reason, risk_level, now)
    )
    cursor.execute(
        "UPDATE tickets SET status = 'AWAITING_HUMAN_APPROVAL', risk_level = ?, updated_at = ? WHERE id = ?",
        (risk_level, now, ticket_id)
    )

    # Post notification message to customer chat thread
    customer_msg = (
        f"Thank you for reaching out! We have investigated your records and prepared your request for {action_type.replace('_', ' ').title()}. "
        f"Because this involves financial or hardware replacement authorization, it has been forwarded to our Support Supervisor for review. "
        f"Your ticket is currently under review and we will notify you here as soon as authorization is completed."
    )
    cursor.execute(
        "INSERT INTO ticket_messages (id, ticket_id, sender, message, created_at) VALUES (?, ?, 'agent_ai', ?, ?)",
        (f"MSG-{uuid.uuid4().hex[:8]}", ticket_id, customer_msg, now)
    )

    conn.commit()
    conn.close()
    return {
        "action_id": action_id,
        "action_type": action_type,
        "risk_level": risk_level,
        "risk_reason": risk_reason,
        "status": "AWAITING_HUMAN_APPROVAL",
        "payload": payload
    }

def execute_low_risk_action(ticket_id: str, action_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    result = {"action_type": action_type, "status": "executed", "timestamp": now}

    if action_type == "CANCEL_PROCESSING_ORDER":
        order_num = payload.get("order_number")
        cursor.execute("UPDATE orders SET status = 'Cancelled' WHERE order_number = ?", (order_num,))
        result["message"] = f"Order {order_num} was successfully marked as Cancelled before shipment."
    elif action_type == "RESEND_TRACKING_NOTIFICATION":
        result["message"] = f"Tracking notification resent to customer email for carrier tracking {payload.get('tracking_number')}."

    cursor.execute("UPDATE tickets SET updated_at = ? WHERE id = ?", (now, ticket_id))
    conn.commit()
    conn.close()
    return result

def resolve_ticket(ticket_id: str, public_reply: str, internal_summary: str, is_auto: bool = True) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    msg_id = f"MSG-{uuid.uuid4().hex[:8]}"
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    new_status = "AUTO_RESOLVED" if is_auto else "RESOLVED"
    assigned_risk = "LOW" if is_auto else None

    cursor.execute(
        "INSERT INTO ticket_messages (id, ticket_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?)",
        (msg_id, ticket_id, "agent_ai", public_reply, now)
    )
    if assigned_risk:
        cursor.execute(
            "UPDATE tickets SET status = ?, resolution_summary = ?, risk_level = ?, updated_at = ? WHERE id = ?",
            (new_status, internal_summary, assigned_risk, now, ticket_id)
        )
    else:
        cursor.execute(
            "UPDATE tickets SET status = ?, resolution_summary = ?, updated_at = ? WHERE id = ?",
            (new_status, internal_summary, now, ticket_id)
        )
    conn.commit()
    conn.close()
    return {"status": new_status, "public_reply": public_reply, "internal_summary": internal_summary}
