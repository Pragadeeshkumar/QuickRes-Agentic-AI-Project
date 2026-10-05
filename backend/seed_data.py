import csv
import json
import os
import random
import uuid
from datetime import datetime, timedelta

from database import get_db_connection, init_db
from rag.vector_store import vector_store

BITEXT_CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "Bitext_Sample_Customer_Support_Training_Dataset_27K_responses-v11.csv")

def seed_database(clear_first: bool = True):
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    if clear_first:
        cursor.execute("DELETE FROM investigation_traces")
        cursor.execute("DELETE FROM gated_actions")
        cursor.execute("DELETE FROM ticket_messages")
        cursor.execute("DELETE FROM tickets")
        cursor.execute("DELETE FROM payments")
        cursor.execute("DELETE FROM subscriptions")
        cursor.execute("DELETE FROM orders")
        cursor.execute("DELETE FROM customers")
        cursor.execute("DELETE FROM kb_articles")
        cursor.execute("DELETE FROM historical_cases")
        conn.commit()

    # 1. Seed Customers
    customers = [
        {
            "id": "CUST-1001",
            "name": "Sarah Connor",
            "email": "sarah.connor@example.com",
            "tier": "VIP",
            "loyalty_points": 450,
            "balance": 0.0,
            "status": "Active",
            "created_at": (datetime.now() - timedelta(days=400)).isoformat()
        },
        {
            "id": "CUST-1002",
            "name": "Alex Mercer",
            "email": "alex.mercer@example.com",
            "tier": "Standard",
            "loyalty_points": 80,
            "balance": 15.0,
            "status": "Active",
            "created_at": (datetime.now() - timedelta(days=120)).isoformat()
        },
        {
            "id": "CUST-1003",
            "name": "Emily Watson",
            "email": "emily.watson@example.com",
            "tier": "Standard",
            "loyalty_points": 120,
            "balance": 0.0,
            "status": "Active",
            "created_at": (datetime.now() - timedelta(days=60)).isoformat()
        },
        {
            "id": "CUST-1004",
            "name": "David Kim",
            "email": "david.kim@example.com",
            "tier": "Enterprise",
            "loyalty_points": 1200,
            "balance": 0.0,
            "status": "Active",
            "created_at": (datetime.now() - timedelta(days=300)).isoformat()
        }
    ]

    for c in customers:
        cursor.execute('''
        INSERT OR REPLACE INTO customers (id, name, email, tier, loyalty_points, balance, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (c["id"], c["name"], c["email"], c["tier"], c["loyalty_points"], c["balance"], c["status"], c["created_at"]))

    # 2. Seed Orders
    orders = [
        {
            "id": "ORD-9921",
            "customer_id": "CUST-1001",
            "order_number": "ORD-9921",
            "items": json.dumps([{"item_name": "Pro Wireless Noise Cancelling Headphones", "qty": 1, "price": 199.99}]),
            "total_amount": 199.99,
            "order_date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "delivery_date": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d"),
            "status": "Shipped",
            "tracking_number": "TRK-FEDEX-88392019",
            "shipping_address": "742 Evergreen Terrace, Springfield, OR"
        },
        {
            "id": "ORD-8842",
            "customer_id": "CUST-1002",
            "order_number": "ORD-8842",
            "items": json.dumps([{"item_name": "Ultra HD 4K Gaming Monitor 27-inch", "qty": 1, "price": 349.50}]),
            "total_amount": 349.50,
            "order_date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
            "delivery_date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "status": "Delivered",
            "tracking_number": "TRK-UPS-99482103",
            "shipping_address": "1048 Ocean Avenue, Santa Monica, CA"
        },
        {
            "id": "ORD-7711",
            "customer_id": "CUST-1003",
            "order_number": "ORD-7711",
            "items": json.dumps([{"item_name": "Ergonomic Mechanical Keyboard RGB", "qty": 1, "price": 89.00}]),
            "total_amount": 89.00,
            "order_date": (datetime.now() - timedelta(days=45)).strftime("%Y-%m-%d"),
            "delivery_date": (datetime.now() - timedelta(days=40)).strftime("%Y-%m-%d"),
            "status": "Delivered",
            "tracking_number": "TRK-DHL-11928374",
            "shipping_address": "350 5th Avenue, New York, NY"
        },
        {
            "id": "ORD-6620",
            "customer_id": "CUST-1001",
            "order_number": "ORD-6620",
            "items": json.dumps([{"item_name": "USB-C Dual Docking Station", "qty": 1, "price": 65.00}]),
            "total_amount": 65.00,
            "order_date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "delivery_date": None,
            "status": "Processing",
            "tracking_number": None,
            "shipping_address": "742 Evergreen Terrace, Springfield, OR"
        }
    ]

    for o in orders:
        cursor.execute('''
        INSERT OR REPLACE INTO orders (id, customer_id, order_number, items, total_amount, order_date, delivery_date, status, tracking_number, shipping_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (o["id"], o["customer_id"], o["order_number"], o["items"], o["total_amount"], o["order_date"], o["delivery_date"], o["status"], o["tracking_number"], o["shipping_address"]))

    # 3. Seed Payments
    payments = [
        {
            "id": "PAY-9921",
            "order_id": "ORD-9921",
            "customer_id": "CUST-1001",
            "amount": 199.99,
            "payment_method": "Credit Card (Visa ending in 4242)",
            "status": "Captured",
            "transaction_date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S"),
            "refunded_amount": 0.0
        },
        {
            "id": "PAY-8842",
            "order_id": "ORD-8842",
            "customer_id": "CUST-1002",
            "amount": 349.50,
            "payment_method": "PayPal (alex.mercer@example.com)",
            "status": "Captured",
            "transaction_date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d %H:%M:%S"),
            "refunded_amount": 0.0
        },
        {
            "id": "PAY-SUB-1001",
            "order_id": None,
            "customer_id": "CUST-1001",
            "amount": 49.99,
            "payment_method": "Credit Card (Visa ending in 4242)",
            "status": "Captured",
            "transaction_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "refunded_amount": 0.0
        }
    ]

    for p in payments:
        cursor.execute('''
        INSERT OR REPLACE INTO payments (id, order_id, customer_id, amount, payment_method, status, transaction_date, refunded_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (p["id"], p["order_id"], p["customer_id"], p["amount"], p["payment_method"], p["status"], p["transaction_date"], p["refunded_amount"]))

    # 4. Seed Subscriptions
    subscriptions = [
        {
            "id": "SUB-1001",
            "customer_id": "CUST-1001",
            "plan_name": "QuickRes Pro Cloud Monthly",
            "monthly_cost": 49.99,
            "status": "Cancelled",
            "started_at": (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d"),
            "renewal_date": datetime.now().strftime("%Y-%m-%d"),
            "cancelled_at": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S")
        },
        {
            "id": "SUB-1004",
            "customer_id": "CUST-1004",
            "plan_name": "QuickRes Enterprise Suite",
            "monthly_cost": 299.00,
            "status": "Active",
            "started_at": (datetime.now() - timedelta(days=180)).strftime("%Y-%m-%d"),
            "renewal_date": (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d"),
            "cancelled_at": None
        }
    ]

    for s in subscriptions:
        cursor.execute('''
        INSERT OR REPLACE INTO subscriptions (id, customer_id, plan_name, monthly_cost, status, started_at, renewal_date, cancelled_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (s["id"], s["customer_id"], s["plan_name"], s["monthly_cost"], s["status"], s["started_at"], s["renewal_date"], s["cancelled_at"]))

    # 5. Seed Knowledge Base Policies
    kb_articles = [
        {
            "id": "KB-POL-001",
            "title": "Subscription Cancellation and Erroneous Billing Policy",
            "category": "SUBSCRIPTION",
            "content": """
1. Policy Overview:
Customers who cancel their subscription before the renewal date must not be billed for subsequent billing cycles.
2. Erroneous Charges:
If a recurring billing charge is processed after the documented cancellation timestamp, the customer is fully entitled to an immediate 100% refund of the erroneous charge ($49.99 or applicable tier amount).
3. Risk & Authorization:
All direct monetary refunds require secondary supervisor/human agent verification and approval before payout execution.
4. Resolution Action:
Investigator must verify cancellation timestamp in the subscriptions table, locate the captured transaction in payments table, and propose a gated REFUND action with policy citation KB-POL-001.
            """,
            "policy_tags": "subscription, cancellation, charge, refund, error, billing",
            "last_updated": datetime.now().isoformat()
        },
        {
            "id": "KB-POL-002",
            "title": "Order Return, Damaged Goods, and 30-Day Window Policy",
            "category": "REFUND",
            "content": """
1. Standard Return Window:
Customers can return physical products within 30 days of confirmed delivery for a full refund or free replacement.
2. Damaged on Arrival:
If an item arrives damaged or defective, the customer is eligible for an expedited free replacement or full refund regardless of shipping insurance. Photographic proof or serial verification may be requested for items > $200.
3. Out-of-Window Returns:
Requests made beyond 30 days after delivery are strictly non-refundable for cash, but may receive a 15% store credit or courtesy extension upon human agent approval.
4. Gating:
Refunds exceeding $50 or any hardware replacement requires human approval.
            """,
            "policy_tags": "return, damaged, defective, 30 days, monitor, hardware, replacement",
            "last_updated": datetime.now().isoformat()
        },
        {
            "id": "KB-POL-003",
            "title": "Shipping Tracking & Delivery Inquiries Policy",
            "category": "SHIPPING",
            "content": """
1. Order Status Tracking:
Customers inquiring about order location or status should be provided with real-time carrier tracking details (FedEx, UPS, DHL) and estimated delivery date.
2. Processing Orders:
Orders in 'Processing' status can be modified or cancelled autonomously without human sign-off if requested within 24 hours of placement.
3. Shipped Orders:
Orders already in 'Shipped' status cannot be stopped in transit; the customer must wait for delivery and initiate a standard return.
4. Autonomous Execution:
Status lookups and tracking lookups are Low-Risk and should be resolved autonomously without gating.
            """,
            "policy_tags": "shipping, tracking, where is my order, delivery, carrier, fedex, ups",
            "last_updated": datetime.now().isoformat()
        },
        {
            "id": "KB-POL-004",
            "title": "Account Security, Password Resets, and Email Changes",
            "category": "ACCOUNT",
            "content": """
1. Password Reset:
Automated magic links can be dispatched to the verified primary email address on file. Low risk.
2. Email Address Changes:
Updating customer email address requires verifying two past order IDs or receiving approval from a supervisor.
3. Account Lockouts:
Accounts locked due to repeated failed logins can be unlocked automatically if customer verification passes.
            """,
            "policy_tags": "account, password, login, email, unlock, security",
            "last_updated": datetime.now().isoformat()
        }
    ]

    for kb in kb_articles:
        cursor.execute('''
        INSERT OR REPLACE INTO kb_articles (id, title, category, content, policy_tags, last_updated)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (kb["id"], kb["title"], kb["category"], kb["content"], kb["policy_tags"], kb["last_updated"]))

    # Add to vector store
    vector_store.add_kb_articles(kb_articles)

    # 6. Parse and seed Historical Cases from Bitext dataset
    historical_cases = []
    if os.path.exists(BITEXT_CSV_PATH):
        try:
            with open(BITEXT_CSV_PATH, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                count = 0
                for row in reader:
                    if count >= 60:
                        break
                    intent = row.get("intent", "")
                    category = row.get("category", "GENERAL")
                    instruction = row.get("instruction", "")
                    response = row.get("response", "")

                    if instruction and response:
                        case_id = f"CASE-{1000 + count}"
                        summary = f"Customer queried regarding {intent.replace('_', ' ')}. Policy and CRM data checked. Formulated resolution based on standard standard workflow."
                        h_case = {
                            "id": case_id,
                            "case_id": case_id,
                            "category": category,
                            "intent": intent,
                            "customer_query": instruction,
                            "investigation_summary": summary,
                            "resolution_action": response[:250] + "...",
                            "outcome": "Resolved"
                        }
                        historical_cases.append(h_case)
                        cursor.execute('''
                        INSERT OR REPLACE INTO historical_cases (id, case_id, category, intent, customer_query, investigation_summary, resolution_action, outcome)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (h_case["id"], h_case["case_id"], h_case["category"], h_case["intent"], h_case["customer_query"], h_case["investigation_summary"], h_case["resolution_action"], h_case["outcome"]))
                        count += 1
        except Exception as e:
            print("Notice loading bitext CSV:", e)

    # Add fallback historical cases if CSV was empty
    if not historical_cases:
        historical_cases = [
            {
                "id": "CASE-1001",
                "case_id": "CASE-1001",
                "category": "SUBSCRIPTION",
                "intent": "cancel_subscription",
                "customer_query": "I cancelled my subscription 2 days ago but was charged $49.99.",
                "investigation_summary": "Checked subscription table: confirmed cancelled_at timestamp prior to renewal. Located transaction PAY-SUB-1001. Checked KB-POL-001.",
                "resolution_action": "Initiated refund approval of $49.99 to original Visa card and sent confirmation.",
                "outcome": "Refund Approved and Processed"
            },
            {
                "id": "CASE-1002",
                "case_id": "CASE-1002",
                "category": "ORDER",
                "intent": "track_order",
                "customer_query": "Where is my package for order ORD-9921?",
                "investigation_summary": "Retrieved order ORD-9921. Status is Shipped via FedEx tracking TRK-FEDEX-88392019. Delivery in 2 days.",
                "resolution_action": "Provided live tracking details and expected delivery date. Ticket auto-resolved.",
                "outcome": "Auto-Resolved"
            }
        ]
        for h_case in historical_cases:
            cursor.execute('''
            INSERT OR REPLACE INTO historical_cases (id, case_id, category, intent, customer_query, investigation_summary, resolution_action, outcome)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (h_case["id"], h_case["case_id"], h_case["category"], h_case["intent"], h_case["customer_query"], h_case["investigation_summary"], h_case["resolution_action"], h_case["outcome"]))

    vector_store.add_historical_cases(historical_cases)

    # 7. Seed Initial Demo Tickets
    tickets = [
        {
            "id": "TCK-2026-001",
            "customer_id": "CUST-1001",
            "order_id": None,
            "subject": "Charged $49.99 after cancelling my subscription",
            "initial_message": "Hi, I cancelled my QuickRes Pro Cloud subscription 3 days ago, but I just saw a charge of $49.99 on my credit card statement this morning. Please refund this charge as I already cancelled.",
            "category": "SUBSCRIPTION",
            "intent": "subscription_billing_refund",
            "status": "NEW",
            "risk_level": "UNASSESSED",
            "created_at": (datetime.now() - timedelta(minutes=45)).strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": (datetime.now() - timedelta(minutes=45)).strftime("%Y-%m-%d %H:%M:%S"),
        },
        {
            "id": "TCK-2026-002",
            "customer_id": "CUST-1001",
            "order_id": "ORD-9921",
            "subject": "Tracking status for order ORD-9921",
            "initial_message": "Hello, could you let me know when my Pro Wireless Noise Cancelling Headphones will arrive? Order number is ORD-9921.",
            "category": "SHIPPING",
            "intent": "track_order",
            "status": "NEW",
            "risk_level": "UNASSESSED",
            "created_at": (datetime.now() - timedelta(minutes=30)).strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": (datetime.now() - timedelta(minutes=30)).strftime("%Y-%m-%d %H:%M:%S"),
        },
        {
            "id": "TCK-2026-003",
            "customer_id": "CUST-1002",
            "order_id": "ORD-8842",
            "subject": "Screen arrived cracked on gaming monitor (ORD-8842)",
            "initial_message": "I received my Ultra HD 4K Gaming Monitor yesterday (ORD-8842), but upon unboxing the screen is cracked and won't turn on. I would like a replacement or a full refund.",
            "category": "REFUND",
            "intent": "damaged_goods_replacement",
            "status": "NEW",
            "risk_level": "UNASSESSED",
            "created_at": (datetime.now() - timedelta(minutes=20)).strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": (datetime.now() - timedelta(minutes=20)).strftime("%Y-%m-%d %H:%M:%S"),
        },
        {
            "id": "TCK-2026-004",
            "customer_id": "CUST-1003",
            "order_id": "ORD-7711",
            "subject": "Return inquiry for keyboard purchased last month",
            "initial_message": "Hi team, I want to return my mechanical keyboard from order ORD-7711. It's in good condition but I decided I prefer a different switch type.",
            "category": "REFUND",
            "intent": "return_request",
            "status": "NEW",
            "risk_level": "UNASSESSED",
            "created_at": (datetime.now() - timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": (datetime.now() - timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S"),
        },
        {
            "id": "TCK-2026-005",
            "customer_id": "CUST-1001",
            "order_id": None,
            "subject": "Need to cancel my recent purchase",
            "initial_message": "Hello support, I placed an order by mistake a few moments ago and need to cancel it right away please.",
            "category": "ORDER",
            "intent": "cancel_order",
            "status": "NEW",
            "risk_level": "UNASSESSED",
            "created_at": (datetime.now() - timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": (datetime.now() - timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M:%S"),
        }
    ]

    for t in tickets:
        cursor.execute('''
        INSERT OR REPLACE INTO tickets (id, customer_id, order_id, subject, initial_message, category, intent, status, risk_level, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (t["id"], t["customer_id"], t["order_id"], t["subject"], t["initial_message"], t["category"], t["intent"], t["status"], t["risk_level"], t["created_at"], t["updated_at"]))

        # Also add initial customer message into ticket_messages
        msg_id = f"MSG-{uuid.uuid4().hex[:8]}"
        cursor.execute('''
        INSERT OR REPLACE INTO ticket_messages (id, ticket_id, sender, message, created_at)
        VALUES (?, ?, ?, ?, ?)
        ''', (msg_id, t["id"], "customer", t["initial_message"], t["created_at"]))

    conn.commit()
    conn.close()
    print("Database and Vector Store seeded with Customers, Orders, Subscriptions, Policies, Historical Cases & Demo Tickets!")

if __name__ == "__main__":
    seed_database()
