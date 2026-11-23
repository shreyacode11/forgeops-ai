import os
from google import genai

SERVICES = [
    {"name": "payments-api", "status": "degraded", "latency_ms": 1840, "error_rate": 8.4, "region": "ap-south-1"},
    {"name": "identity-service", "status": "healthy", "latency_ms": 120, "error_rate": 0.2, "region": "ap-south-1"},
    {"name": "orders-api", "status": "healthy", "latency_ms": 210, "error_rate": 0.5, "region": "ap-south-1"},
    {"name": "notifications", "status": "warning", "latency_ms": 740, "error_rate": 2.1, "region": "ap-south-1"},
]

RUNBOOKS = [
    {"title": "High API latency", "text": "Check recent deployments, database connection pool saturation, dependency latency, and error-rate trends. Roll back only after an engineer reviews the change."},
    {"title": "Elevated 5xx errors", "text": "Inspect application logs, dependency health, recent configuration changes, and request traces. Do not restart production services without approval."},
    {"title": "Database connection exhaustion", "text": "Review active connections, slow queries, pool limits, and recent traffic changes. Scale only after checking capacity and cost."},
]

def get_service_health():
    return SERVICES

def get_recent_incidents(db):
    from .models import Incident
    return db.query(Incident).order_by(Incident.id.desc()).limit(8).all()

def search_runbooks(query: str):
    q = query.lower()
    matches = [r for r in RUNBOOKS if any(word in (r["title"] + " " + r["text"]).lower() for word in q.split() if len(word) > 3)]
    return matches or RUNBOOKS[:1]

def build_local_answer(message, incidents):
    payments = next(s for s in SERVICES if s["name"] == "payments-api")
    return (
        f"I checked the simulated service inventory. payments-api is {payments['status']} "
        f"with {payments['latency_ms']} ms latency and {payments['error_rate']}% error rate. "
        f"There are {len(incidents)} recorded incident(s). The runbook recommends checking recent "
        "deployments, database connection pools, dependency latency, and error-rate trends. "
        "I recommend that an engineer review a controlled restart or rollback only after checking "
        "the evidence. I have prepared a simulated action for human approval."
    )

def generate_answer(message, incidents):
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return build_local_answer(message, incidents), "local-demo"
    try:
        client = genai.Client(api_key=key)
        prompt = (
            "You are ForgeOps AI, an operations assistant. You must keep a human in the loop. "
            "Never claim to execute real infrastructure changes. Use only the supplied simulated "
            "context and give concise findings, evidence, and a safe recommendation.\n\n"
            f"Service inventory: {SERVICES}\n"
            f"Incidents: {[{'title': i.title, 'service': i.service, 'severity': i.severity, 'status': i.status} for i in incidents]}\n"
            f"Runbooks: {search_runbooks(message)}\n"
            f"Engineer request: {message}"
        )
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            contents=prompt
        )
        return response.text or build_local_answer(message, incidents), "gemini"
    except Exception as exc:
        return build_local_answer(message, incidents) + f"\n\n(LLM fallback: {type(exc).__name__})", "local-fallback"
