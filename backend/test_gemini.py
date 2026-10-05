import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

key = os.getenv("GEMINI_API_KEY")
if not key:
    print("GEMINI_API_KEY is not set. Please provide it in .env")
    exit(0)

print("Using Gemini API Key:", key[:6] + "...")
genai.configure(api_key=key)
model = genai.GenerativeModel("gemini-2.5-flash-lite")

prompt = """
You are the QuickRes Autonomous Agentic Planner.
Customer says: 'I cancelled my subscription 3 days ago but was charged $49.99 today.'
Available Tools: [get_customer, get_order, check_payment, check_subscription, search_knowledge_base, search_historical_cases]

Think step-by-step:
1. What facts are needed?
2. Which authorized tool should be called first?

Respond strictly in JSON:
{
  "thought": "Agent Plan: ...",
  "action_type": "TOOL_CALL",
  "tool": "check_subscription",
  "tool_input": {"customer_id": "CUST-1001"}
}
"""

res = model.generate_content(prompt)
print("--- GEMINI LIVE PLANNER OUTPUT ---")
print(res.text)
