from seed_data import seed_database
from agent.graph import run_agent_investigation
from database import get_db_connection

seed_database()

for tid in ['TCK-2026-001', 'TCK-2026-002', 'TCK-2026-003', 'TCK-2026-005']:
    res = run_agent_investigation(tid)
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT id, status, risk_level, resolution_summary FROM tickets WHERE id = ?', (tid,))
    t = dict(c.fetchone())
    conn.close()
    print(f"Ticket {tid} -> Status: {t['status']}, Risk: {t['risk_level']}, Tools: {res['tool_history_count']}")
