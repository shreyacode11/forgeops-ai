from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
import os

from .database import Base, engine, get_db
from .models import Incident, Approval, AuditLog
from .schemas import ChatRequest, ApprovalDecision, IncidentCreate
from .agent import get_service_health, get_recent_incidents, search_runbooks, generate_answer

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ForgeOps AI API", version="1.0.0", description="Human-supervised AI operations demo")
origins = [os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins + ["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def log_event(db, actor, event, detail=""):
    db.add(AuditLog(actor=actor, event=event, detail=detail))
    db.commit()

@app.get("/")
def root():
    return {"name": "ForgeOps AI API", "docs": "/docs", "status": "ok"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    incidents = db.query(Incident).count()
    pending = db.query(Approval).filter(Approval.status == "pending").count()
    return {
        "services": get_service_health(),
        "incident_count": incidents,
        "pending_approvals": pending,
        "availability": "99.92%",
        "open_incidents": db.query(Incident).filter(Incident.status == "open").count()
    }

@app.get("/api/services")
def services():
    return get_service_health()

@app.get("/api/incidents")
def incidents(db: Session = Depends(get_db)):
    return db.query(Incident).order_by(Incident.id.desc()).all()

@app.post("/api/incidents")
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    if payload.severity not in {"low", "medium", "high", "critical"}:
        raise HTTPException(400, "Invalid severity")
    row = Incident(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    log_event(db, "Demo Engineer", "Incident created", f"{row.title} ({row.service})")
    return row

@app.get("/api/approvals")
def approvals(db: Session = Depends(get_db)):
    return db.query(Approval).order_by(Approval.id.desc()).all()

@app.post("/api/assistant/chat")
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    message = payload.message.strip()
    if len(message) < 2:
        raise HTTPException(400, "Message is too short")
    current_incidents = get_recent_incidents(db)
    answer, provider = generate_answer(message, current_incidents)
    runbooks = search_runbooks(message)
    proposed = Approval(
        action="Review simulated payment service restart",
        service="payments-api",
        reason="AI recommendation: investigate elevated latency, recent deployments, and connection pool saturation before any remediation."
    )
    db.add(proposed)
    db.commit()
    db.refresh(proposed)
    log_event(db, "ForgeOps AI", "Investigation completed", f"Provider: {provider}; approval #{proposed.id} created")
    return {
        "answer": answer,
        "provider": provider,
        "tools_used": ["get_service_health", "get_recent_incidents", "search_runbooks"],
        "runbooks": runbooks,
        "approval_id": proposed.id
    }

@app.post("/api/approvals/{approval_id}/approve")
def approve(approval_id: int, payload: ApprovalDecision, db: Session = Depends(get_db)):
    row = db.query(Approval).filter(Approval.id == approval_id).first()
    if not row:
        raise HTTPException(404, "Approval not found")
    if row.status != "pending":
        raise HTTPException(409, "This approval has already been decided")
    row.status = "approved"
    row.decided_by = payload.decided_by
    db.commit()
    log_event(db, payload.decided_by, "Approval accepted", f"Simulated action: {row.action}")
    return {"message": "Approved. Simulated action recorded; no real infrastructure was changed.", "approval": row}

@app.post("/api/approvals/{approval_id}/reject")
def reject(approval_id: int, payload: ApprovalDecision, db: Session = Depends(get_db)):
    row = db.query(Approval).filter(Approval.id == approval_id).first()
    if not row:
        raise HTTPException(404, "Approval not found")
    if row.status != "pending":
        raise HTTPException(409, "This approval has already been decided")
    row.status = "rejected"
    row.decided_by = payload.decided_by
    db.commit()
    log_event(db, payload.decided_by, "Approval rejected", f"Proposed action: {row.action}")
    return {"message": "Rejected. No action was executed.", "approval": row}

@app.get("/api/audit-logs")
def audit_logs(db: Session = Depends(get_db)):
    return db.query(AuditLog).order_by(AuditLog.id.desc()).limit(100).all()

@app.get("/api/runbooks")
def runbooks(q: str = "latency"):
    return search_runbooks(q)
