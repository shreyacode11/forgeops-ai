from pydantic import BaseModel, Field
from typing import Optional

class ChatRequest(BaseModel):
    message: str = Field(min_length=2, max_length=2000)

class ApprovalDecision(BaseModel):
    decided_by: str = Field(default="Demo Engineer", min_length=2, max_length=100)

class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    service: str = Field(min_length=2, max_length=100)
    severity: str = "medium"
    description: str = ""
