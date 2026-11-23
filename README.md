# ForgeOps AI

A small AI-assisted infrastructure operations demo for the Apple Junior Fullstack Engineer – ETS role.

## Features
- React + TypeScript dashboard
- FastAPI backend
- SQLite persistence (zero database setup)
- Optional Gemini API integration (`GEMINI_API_KEY`)
- Deterministic demo assistant when no API key is configured
- Service health and incident investigation tools
- Human approval workflow for simulated actions
- Audit log
- Basic backend tests

## Requirements
- Python 3.10+
- Node.js 20+
- npm

## Run locally

### 1. Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```
Backend: http://localhost:8000  
Swagger: http://localhost:8000/docs

### 2. Frontend (new terminal)
```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```
Frontend: http://localhost:5173

## Gemini
Add your key to `backend/.env`:
```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```
Without a key, the assistant uses a deterministic local demo response, so the app still works.

## Demo flow
1. Open Dashboard and inspect service health.
2. Open AI Assistant and ask: `Investigate payment service latency`.
3. The assistant checks service status and incidents and creates a proposed action.
4. Open Approvals and approve or reject the simulated action.
5. Open Audit Log to see the decision and execution record.

All remediation is simulated. No real infrastructure is modified.

## Deployment
### Backend on Render
- Create a new **Web Service** from this repository.
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add environment variable `FRONTEND_ORIGIN` with your deployed frontend URL.
- For a persistent SQLite database on Render, attach a persistent disk and set `DATABASE_URL=sqlite:////var/data/forgeops.db`. Without a disk, SQLite data may reset on redeploy/restart.

### Frontend on Vercel
- Import the same repository.
- Root Directory: `frontend`
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Add `VITE_API_URL` = your Render backend URL (no trailing slash).

For a reliable hosted database, switch to managed PostgreSQL later. This same-day starter intentionally uses SQLite to avoid setup delays.
