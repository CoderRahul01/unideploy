# 🚀 UniDeploy

**One-Click Automated Deployment for Modern Web Apps.**

UniDeploy is a high-performance orchestration platform that abstracts away the complexities of AWS, Kubernetes, and Docker. Simply upload your project, and let our Agents handle the rest.

![UniDeploy Dashboard](/Users/rahulpandey187/.gemini/antigravity/brain/094cce14-e6a8-4afb-b408-61eefb170de9/unideploy_dashboard_upload_ui_1768114075277.png)

## ✨ Core Features

- 🤖 **Agent-Based Architecture**: Modular Build, Deploy, and Notify agents for autonomous orchestration.
- ⚡ **Instant Framework Detection**: Auto-detects Python, Node.js, and Static sites.
- 🔒 **GitHub-Only Auth**: Secure & streamlined identity via GitHub OAuth.
- 📡 **Live Observability**: Real-time deployment feedback via WebSockets & Cost Tracking.
- ☁️ **Hybrid Cloud**: Native integration with AWS (Stability) and E2B (Serverless Compute).

## 🏗️ Technical Stack

- **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons.
- **Backend**: FastAPI (Python 3.11), SQLAlchemy.
- **Infrastructure**: AWS (EC2/ECS for Platform), E2B (Firecracker VMs for User Sandboxes).
- **Database**: Supabase (Postgres).
- **Auth**: Firebase (GitHub Provider).

## 🚀 Quick Start

### 1. Local Development
```bash
# Brain (Python Backend)
cd brain && uvicorn main:app --reload

# Gateway (Node.js)
cd gateway && npm run dev

# Web (Frontend)
cd web && npm run dev
```

## 🚢 Deployment & Testing

### 1. Local Development (Testing)
Run the full stack locally with a single command.

**Prerequisites:**
- Python 3.11+
- Node.js 18+

```bash
# Easy Start (Recommended)
chmod +x start_dev.sh
./start_dev.sh
```

**Manual Start (Alternative):**
If you prefer to run services individually:
```bash
# Terminal 1: Brain (Backend) -> localhost:8000
cd brain && source venv/bin/activate && pip install -r requirements.txt && uvicorn main:app --reload --port 8000

# Terminal 2: Gateway (WebSocket) -> localhost:3001
cd gateway && npm install && npm run dev

# Terminal 3: Web (Frontend) -> localhost:3000
cd web && npm install && npm run dev
```
**Verification:**
- Open `http://localhost:3000`.
- Ensure no red CORS errors in the browser console.
- Try a test deployment (if E2B key is set).

### 2. Production Deployment
UniDeploy is designed to run on any cloud provider (AWS, Vercel, DigitalOcean).

**Recommended Setup:**
- **Frontend**: Deploy to Vercel (Auto-detects Next.js).
- **Backend**: Deploy to AWS EC2 or DigitalOcean Droplet (Dockerized).
- **Gateway**: Deploy alongside Backend or as a separate service.

**Production Testing:**
1.  **Environment Variables**: Ensure `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_GATEWAY_URL` are set in Vercel to point to your production backend.
2.  **CORS**: The backend (`main.py`) and gateway (`index.js`) are configured to accept requests from `unideploy.in`. Add your specific production domain to `ALLOWED_ORIGINS` env var if different.

> [!NOTE]
> **Legacy Scripts Archived**: The old AWS shell scripts and Kubernetes YAMLs have been moved to `_archive_legacy_aws_infrastructure` and are ignored by git. They are **NOT** used for current deployments.

## 🛠️ Crucial Commands (Cheat Sheet)

| Action | Command |
| :--- | :--- |
| **Get App Status** | `kubectl get pods -n unideploy` |
| **View Logs** | `kubectl logs -l app=backend -n unideploy` |
| **Get Live URLs** | `kubectl get svc -n unideploy` |
| **Restart App** | `kubectl rollout restart deployment -n unideploy` |
| **Delete All** | `kubectl delete namespace unideploy` |

## 🧪 Optimization & Cleanliness
- **Frontend**: Uses Next.js Standalone for 80% smaller Docker images.
- **Infrastructure**: Automated manifest substitution and one-click scripts.
- **Organization**: Separated `k8s`, `frontend`, and `backend` with clear boundaries.

---
*Built with ❤️ for developers who just want to ship.*
