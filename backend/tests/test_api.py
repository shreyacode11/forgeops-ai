from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_services():
    response = client.get("/api/services")
    assert response.status_code == 200
    assert any(s["name"] == "payments-api" for s in response.json())

def test_chat_creates_approval():
    response = client.post("/api/assistant/chat", json={"message": "Investigate payment service latency"})
    assert response.status_code == 200
    data = response.json()
    assert data["approval_id"] > 0
    assert "search_runbooks" in data["tools_used"]
