from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from .database import Base

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    service = Column(String(100), nullable=False)
    severity = Column(String(30), default="medium")
    status = Column(String(30), default="open")
    description = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Approval(Base):
    __tablename__ = "approvals"
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(200), nullable=False)
    service = Column(String(100), nullable=False)
    reason = Column(Text, default="")
    status = Column(String(30), default="pending")
    requested_by = Column(String(100), default="ForgeOps AI")
    decided_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    actor = Column(String(100), nullable=False)
    event = Column(String(200), nullable=False)
    detail = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
