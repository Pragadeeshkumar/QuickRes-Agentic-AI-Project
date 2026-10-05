import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "quickres.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Customers table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        tier TEXT DEFAULT 'Standard', -- 'Standard', 'VIP', 'Enterprise'
        loyalty_points INTEGER DEFAULT 0,
        balance REAL DEFAULT 0.0,
        status TEXT DEFAULT 'Active',
        created_at TEXT NOT NULL
    )
    ''')

    # Orders table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        order_number TEXT UNIQUE NOT NULL,
        items TEXT NOT NULL, -- JSON string of items list
        total_amount REAL NOT NULL,
        order_date TEXT NOT NULL,
        delivery_date TEXT,
        status TEXT NOT NULL, -- 'Delivered', 'Shipped', 'Processing', 'Cancelled', 'Returned'
        tracking_number TEXT,
        shipping_address TEXT,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
    )
    ''')

    # Payments table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        customer_id TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL, -- 'Credit Card (Visa ...4242)', 'PayPal', etc.
        status TEXT NOT NULL, -- 'Captured', 'Refunded', 'Pending', 'Failed', 'Partially Refunded'
        transaction_date TEXT NOT NULL,
        refunded_amount REAL DEFAULT 0.0,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
    )
    ''')

    # Subscriptions table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        plan_name TEXT NOT NULL,
        monthly_cost REAL NOT NULL,
        status TEXT NOT NULL, -- 'Active', 'Cancelled', 'Past Due'
        started_at TEXT NOT NULL,
        renewal_date TEXT NOT NULL,
        cancelled_at TEXT,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
    )
    ''')

    # Tickets table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        order_id TEXT,
        subject TEXT NOT NULL,
        initial_message TEXT NOT NULL,
        category TEXT NOT NULL, -- 'ORDER', 'REFUND', 'SUBSCRIPTION', 'SHIPPING', 'ACCOUNT', 'INVOICE'
        intent TEXT NOT NULL, -- e.g. 'cancel_order', 'request_refund', 'check_payment'
        status TEXT NOT NULL, -- 'NEW', 'INVESTIGATING', 'AWAITING_CUSTOMER_INFO', 'AWAITING_HUMAN_APPROVAL', 'AUTO_RESOLVED', 'RESOLVED', 'REJECTED'
        risk_level TEXT DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        confidence_score REAL DEFAULT 0.0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        resolution_summary TEXT,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
    )
    ''')

    # Ticket Messages table (Customer-visible thread)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ticket_messages (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        sender TEXT NOT NULL, -- 'customer', 'agent_ai', 'human_agent'
        message TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(ticket_id) REFERENCES tickets(id)
    )
    ''')

    # Investigation Traces table (Internal agent step-by-step memory)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS investigation_traces (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        node_name TEXT NOT NULL, -- 'investigate', 'tool_exec', 'reflect', 'risk_gate', 'resolve'
        thought TEXT,
        tool_name TEXT,
        tool_input TEXT,
        tool_output TEXT,
        reflection TEXT,
        hypothesis TEXT,
        risk_score REAL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY(ticket_id) REFERENCES tickets(id)
    )
    ''')

    # Gated Actions table (Human-in-the-loop approvals)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS gated_actions (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        action_type TEXT NOT NULL, -- 'REFUND', 'CANCEL_SUBSCRIPTION', 'CREDIT_ACCOUNT', 'OVERRIDE_POLICY'
        payload_json TEXT NOT NULL, -- JSON dict of parameters e.g. {"amount": 79.99, "payment_id": "PAY-001"}
        risk_reason TEXT NOT NULL,
        risk_level TEXT NOT NULL, -- 'MEDIUM', 'HIGH', 'CRITICAL'
        status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'EDITED'
        human_notes TEXT,
        created_at TEXT NOT NULL,
        reviewed_at TEXT,
        FOREIGN KEY(ticket_id) REFERENCES tickets(id)
    )
    ''')

    # Knowledge Base table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS kb_articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        policy_tags TEXT,
        last_updated TEXT NOT NULL
    )
    ''')

    # Historical Cases table (for Case-Based Reasoning)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS historical_cases (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        category TEXT NOT NULL,
        intent TEXT NOT NULL,
        customer_query TEXT NOT NULL,
        investigation_summary TEXT NOT NULL,
        resolution_action TEXT NOT NULL,
        outcome TEXT NOT NULL
    )
    ''')

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at", DB_PATH)
