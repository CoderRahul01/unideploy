# 🚀 UniDeploy

**One-Click Automated Deployment for Modern Web Apps.**

UniDeploy is a high-performance orchestration platform that abstracts away the complexities of AWS, Kubernetes, and Docker. Simply upload your project, and let our Agents handle the rest.

![UniDeploy Dashboard](/Users/rahulpandey187/.gemini/antigravity/brain/094cce14-e6a8-4afb-b408-61eefb170de9/unideploy_dashboard_upload_ui_1768114075277.png)

## ✨ Core Features

- 🤖 **Agent-Based Architecture**: Modular Build, Deploy, and Notify agents for autonomous orchestration.
- ⚡ **Instant Framework Detection**: Auto-detects Python, Node.js, and Static sites.
- 🔒 **Enterprise Auth**: Powered by Clerk for secure and seamless user management.
- 📡 **Live Observability**: Real-time deployment feedback via WebSockets.
- ☁️ **Cloud Native**: Native integration with AWS EKS, ECR, and Supabase (PostgreSQL).

## 🏗️ Technical Stack

- **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons.
- **Backend**: FastAPI (Python 3.11), SQLAlchemy.
- **Infrastructure**: AWS (EKS, ECR), Kubernetes, Docker.
- **Database**: Supabase (Postgres).
- **Auth**: Clerk.

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

## 🚢 AWS Deployment Guide

Deploying UniDeploy to AWS involves three main phases: Provisioning, Configuration, and Rollout.

### 1. Provisioning (Infra)
Ensure you have `eksctl`, `kubectl`, and `aws` CLI installed and configured.
```bash
chmod +x setup_aws.sh
./setup_aws.sh
```

### 2. Configuration (Environment)
1.  **Backend Secrets**: Create `k8s/secrets.yaml` from `k8s/secrets.yaml.template` and apply it:
    ```bash
    kubectl apply -f k8s/secrets.yaml
    ```
2.  **Retrieve Backend URL**: You need the backend endpoint for the frontend build.
    ```bash
    kubectl get svc unideploy-backend -n unideploy -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
    ```
    > [!NOTE]
    > It may take a few minutes for AWS to assign a hostname. If it's empty, wait and retry.

### 3. Production Rollout
Build images and deploy to EKS.
```bash
# Set your backend URL discovered above
export NEXT_PUBLIC_API_URL="http://<your-loadbalancer-url>"

chmod +x deploy_platform.sh
./deploy_platform.sh
```

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
