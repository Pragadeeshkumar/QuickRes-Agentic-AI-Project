import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, TypedDict
import sqlite3

from langgraph.graph import StateGraph, END
from database import get_db_connection
from agent.tools import (
    get_customer,
    get_order,
    get_customer_orders,
    check_payment,
    check_subscription,
    search_knowledge_base,
    search_historical_cases,
    ask_customer_clarification,
    propose_gated_action,
    execute_low_risk_action,
    resolve_ticket,
)
from agent.llm import pluggable_llm

class AgentState(TypedDict, total=False):
    ticket_id: str
    customer_id: str
    ticket: Dict[str, Any]
    tool_history: List[Dict[str, Any]]
    pending_tool: Dict[str, Any]
    reflections: List[str]
    current_hypothesis: str
    risk_assessment: Dict[str, Any]
    eval_result: Dict[str, Any]
    final_output: Dict[str, Any]
    step_count: int
    next_action: str

def log_trace(ticket_id: str, step_number: int, node_name: str, thought: str = None,
              tool_name: str = None, tool_input: Any = None, tool_output: Any = None,
              reflection: str = None, hypothesis: str = None, risk_score: float = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    trace_id = f"TRC-{uuid.uuid4().hex[:8]}"
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute('''
    INSERT INTO investigation_traces (
        id, ticket_id, step_number, node_name, thought, tool_name,
        tool_input, tool_output, reflection, hypothesis, risk_score, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        trace_id, ticket_id, step_number, node_name, thought, tool_name,
        json.dumps(tool_input) if tool_input is not None else None,
        json.dumps(tool_output) if tool_output is not None else None,
        reflection, hypothesis, risk_score, now
    ))
    conn.commit()
    conn.close()

# Node 1: Investigate
def investigate_node(state: AgentState) -> AgentState:
    current_count = state.get("step_count", 0) + 1
    ticket = state.get("ticket", {})
    ticket_id = state.get("ticket_id")

    decision = pluggable_llm.decide_investigation_step(state)
    thought = decision.get("thought", "Analyzing ticket requirements...")
    hypothesis = f"Investigating issue for customer {ticket.get('customer_id')} concerning {ticket.get('subject')}"
    
    new_state = dict(state)
    new_state["step_count"] = current_count
    new_state["current_hypothesis"] = hypothesis

    if decision.get("action_type") == "TOOL_CALL":
        new_state["next_action"] = "EXECUTE_TOOL"
        new_state["pending_tool"] = {
            "name": decision.get("tool"),
            "input": decision.get("tool_input", {})
        }
        log_trace(
            ticket_id=ticket_id,
            step_number=current_count,
            node_name="investigate",
            thought=thought,
            tool_name=decision.get("tool"),
            tool_input=decision.get("tool_input"),
            hypothesis=hypothesis
        )
    else:
        new_state["next_action"] = "PROCEED_TO_REFLECT"
        log_trace(
            ticket_id=ticket_id,
            step_number=current_count,
            node_name="investigate",
            thought=thought,
            hypothesis=hypothesis
        )

    return new_state

# Node 2: Tool Execution
def tool_execution_node(state: AgentState) -> AgentState:
    current_count = state.get("step_count", 0) + 1
    ticket_id = state.get("ticket_id")
    pending = state.get("pending_tool", {})
    tool_name = pending.get("name")
    tool_input = pending.get("input", {})
    tool_output = {}

    ticket_customer_id = state.get("ticket", {}).get("customer_id")

    if tool_name == "get_customer":
        tool_output = get_customer(tool_input.get("customer_id_or_email") or ticket_customer_id)
    elif tool_name == "get_order":
        tool_output = get_order(
            tool_input.get("order_number"),
            customer_id=tool_input.get("customer_id") or ticket_customer_id
        )
    elif tool_name == "get_customer_orders":
        tool_output = get_customer_orders(tool_input.get("customer_id") or ticket_customer_id)
    elif tool_name == "check_payment":
        tool_output = check_payment(
            tool_input.get("payment_id_or_order_number") or ticket_customer_id,
            customer_id=ticket_customer_id
        )
    elif tool_name == "check_subscription":
        tool_output = check_subscription(tool_input.get("customer_id") or ticket_customer_id)
    elif tool_name == "search_knowledge_base":
        tool_output = search_knowledge_base(
            query=tool_input.get("query", ""),
            category=tool_input.get("category")
        )
    elif tool_name == "search_historical_cases":
        tool_output = search_historical_cases(
            query=tool_input.get("query", ""),
            category=tool_input.get("category")
        )

    history = list(state.get("tool_history", []))
    history.append({
        "tool_name": tool_name,
        "tool_input": tool_input,
        "tool_output": tool_output
    })

    log_trace(
        ticket_id=ticket_id,
        step_number=current_count,
        node_name="tool_execution",
        thought=f"Executed tool '{tool_name}' successfully.",
        tool_name=tool_name,
        tool_input=tool_input,
        tool_output=tool_output,
        hypothesis=state.get("current_hypothesis")
    )

    new_state = dict(state)
    new_state["step_count"] = current_count
    new_state["tool_history"] = history
    new_state["pending_tool"] = {}
    return new_state

# Node 3: Reflect
def reflect_node(state: AgentState) -> AgentState:
    current_count = state.get("step_count", 0) + 1
    ticket_id = state.get("ticket_id")

    eval_result = pluggable_llm.reflect_and_evaluate(state)
    reflection_text = eval_result.get("reflection", "Evidence evaluated against policies.")
    
    reflections = list(state.get("reflections", []))
    reflections.append(reflection_text)
    
    risk_assessment = {
        "risk_level": eval_result.get("risk_level", "LOW"),
        "risk_score": eval_result.get("risk_score", 0.0),
        "action_required": eval_result.get("action_required")
    }

    log_trace(
        ticket_id=ticket_id,
        step_number=current_count,
        node_name="reflect",
        thought="Evaluated evidence against corporate policies and calculated risk level.",
        reflection=reflection_text,
        risk_score=eval_result.get("risk_score", 0.0),
        hypothesis=state.get("current_hypothesis")
    )

    new_state = dict(state)
    new_state["step_count"] = current_count
    new_state["reflections"] = reflections
    new_state["risk_assessment"] = risk_assessment
    new_state["eval_result"] = eval_result
    return new_state

# Node 4: Risk Gate & Resolution
def risk_gate_node(state: AgentState) -> AgentState:
    current_count = state.get("step_count", 0) + 1
    ticket_id = state.get("ticket_id")
    eval_result = state.get("eval_result", {})
    action_required = eval_result.get("action_required")
    new_state = dict(state)
    new_state["step_count"] = current_count

    if action_required == "GATED_ACTION":
        gated = eval_result.get("gated_action", {})
        action_type = gated.get("action_type", "REFUND")
        payload = gated.get("payload", {})
        risk_reason = gated.get("risk_reason", "High value or monetary impact requires supervisor review.")
        risk_level = eval_result.get("risk_level", "HIGH")

        gated_res = propose_gated_action(
            ticket_id=ticket_id,
            action_type=action_type,
            payload=payload,
            risk_reason=risk_reason,
            risk_level=risk_level
        )
        new_state["final_output"] = {
            "type": "GATED_ACTION_PROPOSED",
            "details": gated_res
        }
        log_trace(
            ticket_id=ticket_id,
            step_number=current_count,
            node_name="risk_gate",
            thought=f"Risk score {eval_result.get('risk_score')} exceeds autonomous threshold. Gated action submitted for Human Approval.",
            tool_name="propose_gated_action",
            tool_input={"action_type": action_type, "payload": payload},
            tool_output=gated_res,
            risk_score=eval_result.get("risk_score")
        )

    elif action_required == "ASK_CLARIFICATION":
        question = eval_result.get("clarification_question", "Could you please provide more details regarding your order?")
        clarify_res = ask_customer_clarification(ticket_id, question)
        new_state["final_output"] = {
            "type": "CLARIFICATION_REQUESTED",
            "details": clarify_res
        }
        log_trace(
            ticket_id=ticket_id,
            step_number=current_count,
            node_name="risk_gate",
            thought="Identified missing customer data. Posted clarification question into customer thread.",
            tool_name="ask_customer_clarification",
            tool_input={"question": question},
            tool_output=clarify_res,
            risk_score=eval_result.get("risk_score")
        )

    elif action_required == "EXECUTE_LOW_RISK":
        low_action = eval_result.get("low_risk_action", {})
        exec_res = execute_low_risk_action(
            ticket_id=ticket_id,
            action_type=low_action.get("action_type"),
            payload=low_action.get("payload", {})
        )
        pub_reply = eval_result.get("public_reply", "Your request has been processed successfully.")
        summary = eval_result.get("internal_summary", "Low risk action completed autonomously.")
        resolve_res = resolve_ticket(ticket_id, pub_reply, summary, is_auto=True)
        new_state["final_output"] = {
            "type": "AUTO_RESOLVED",
            "details": {**exec_res, **resolve_res}
        }
        log_trace(
            ticket_id=ticket_id,
            step_number=current_count,
            node_name="risk_gate",
            thought="Low-risk action executed and ticket closed autonomously.",
            tool_name="execute_low_risk_action",
            tool_output=exec_res,
            risk_score=eval_result.get("risk_score")
        )

    elif action_required == "AUTO_RESOLVE":
        pub_reply = eval_result.get("public_reply", "Your request has been resolved.")
        summary = eval_result.get("internal_summary", "Inquiry resolved autonomously.")
        resolve_res = resolve_ticket(ticket_id, pub_reply, summary, is_auto=True)
        new_state["final_output"] = {
            "type": "AUTO_RESOLVED",
            "details": resolve_res
        }
        log_trace(
            ticket_id=ticket_id,
            step_number=current_count,
            node_name="risk_gate",
            thought="Inquiry resolved autonomously without gating.",
            tool_name="resolve_ticket",
            tool_output=resolve_res,
            risk_score=eval_result.get("risk_score")
        )

    return new_state

# Conditional Router Function
def route_after_investigate(state: AgentState) -> str:
    if state.get("next_action") == "EXECUTE_TOOL":
        if len(state.get("tool_history", [])) >= 5:
            return "reflect"
        return "tool_execution"
    return "reflect"

def build_quickres_graph():
    builder = StateGraph(AgentState)

    builder.add_node("investigate", investigate_node)
    builder.add_node("tool_execution", tool_execution_node)
    builder.add_node("reflect", reflect_node)
    builder.add_node("risk_gate", risk_gate_node)

    builder.set_entry_point("investigate")

    builder.add_conditional_edges(
        "investigate",
        route_after_investigate,
        {
            "tool_execution": "tool_execution",
            "reflect": "reflect"
        }
    )

    builder.add_edge("tool_execution", "investigate")
    builder.add_edge("reflect", "risk_gate")
    builder.add_edge("risk_gate", END)

    return builder.compile()

quickres_agent = build_quickres_graph()

def run_agent_investigation(ticket_id: str) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT t.*, c.name as customer_name FROM tickets t JOIN customers c ON t.customer_id = c.id WHERE t.id = ?", (ticket_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {"error": f"Ticket {ticket_id} not found."}

    ticket = dict(row)

    # Fetch all ticket messages (full conversational history)
    cursor.execute("SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC", (ticket_id,))
    ticket_messages = [dict(m) for m in cursor.fetchall()]
    ticket["messages"] = ticket_messages

    # Check newest customer message first for order numbers (ORD-XXXX, #XXXX, or 4-digit numbers)
    import re
    found_order = None
    for msg in reversed(ticket_messages):
        if msg.get("sender") == "customer":
            text = msg.get("message", "")
            m = re.search(r'ORD[-\s#]?(\d{4})', text, re.IGNORECASE)
            if m:
                found_order = f"ORD-{m.group(1)}"
                break
            m2 = re.search(r'#?(\d{4})\b', text)
            if m2:
                found_order = f"ORD-{m2.group(1)}"
                break

    if found_order:
        ticket["order_id"] = found_order
        cursor.execute("UPDATE tickets SET order_id = ? WHERE id = ?", (found_order, ticket_id))

    # Clear previous traces and pending gated actions for clean trace state
    cursor.execute("DELETE FROM investigation_traces WHERE ticket_id = ?", (ticket_id,))
    cursor.execute("DELETE FROM gated_actions WHERE ticket_id = ? AND status = 'PENDING'", (ticket_id,))
    cursor.execute("UPDATE tickets SET status = 'INVESTIGATING', updated_at = ? WHERE id = ?",
                   (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), ticket_id))
    conn.commit()
    conn.close()

    initial_state: AgentState = {
        "ticket_id": ticket_id,
        "customer_id": ticket.get("customer_id"),
        "ticket": ticket,
        "tool_history": [],
        "pending_tool": {},
        "reflections": [],
        "current_hypothesis": "",
        "risk_assessment": {},
        "eval_result": {},
        "final_output": {},
        "step_count": 0,
        "next_action": "INVESTIGATE"
    }

    final_state = quickres_agent.invoke(initial_state)

    # Persist final risk_level to ticket record
    risk_lvl = final_state.get("risk_assessment", {}).get("risk_level")
    if risk_lvl:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE tickets SET risk_level = ? WHERE id = ?", (risk_lvl, ticket_id))
            conn.commit()
            conn.close()
        except Exception:
            pass

    return {
        "ticket_id": ticket_id,
        "final_output": final_state.get("final_output"),
        "tool_history_count": len(final_state.get("tool_history", [])),
        "reflections": final_state.get("reflections"),
        "risk_assessment": final_state.get("risk_assessment")
    }
