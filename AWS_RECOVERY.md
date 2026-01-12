# 📦 AWS Infrastructure# AWS Recovery & Archive

This document outlines the legacy AWS infrastructure that has been archived.
The new architecture uses a single EC2 instance (`brain` + `gateway`) and E2B.

Legacy code is in `legacy_aws_infrastructure/`.
Original `backend` is now `brain`.
Original `backend-node` is now `gateway`.
Original `frontend` is now `web`.
We successfully pivoted to a lightweight "Sandbox" architecture (Fly.io + Vectors) in **January 2026**.

If you ever need to restore the "Enterprise" scale AWS setup, follow this guide.

## 1. Restoring Files
The original AWS scripts and Kubernetes manifests have been moved to the `archive_aws/` directory.

### Scripts
- `archive_aws/setup_aws.sh`: Provisions the EKS Cluster, Node Groups, and ECR Repositories.
- `archive_aws/deploy_platform.sh`: Builds Docker images and deploys them to the EKS cluster.

### Kubernetes Manifests
- `archive_aws/k8s/`: Contains all Helm charts and raw YAML manifests.
    - `aws_control_plane.yaml`: Main deployment for Backend/Frontend.
    - `secrets.yaml`: Secrets management.

## 2. Restoration Steps
1.  **Move Files Back**:
    ```bash
    mv archive_aws/setup_aws.sh .
    mv archive_aws/deploy_platform.sh .
    mv archive_aws/k8s .
    ```

2.  **Install Prerequisites**:
    Ensure you have `eksctl`, `kubectl`, and `aws-cli` installed.

3.  **Provision Infrastructure**:
    ```bash
    chmod +x setup_aws.sh
    ./setup_aws.sh
    ```
    *Note: This will spin up real AWS resources (EKS Cluster). Expect costs ~ $0.10/hour.*

4.  **Deploy Platform**:
    ```bash
    chmod +x deploy_platform.sh
    ./deploy_platform.sh
    ```

## 3. Re-enabling Code
The Backend Python code for Kubernetes management was located in `backend/builder/k8s_manager.py`. Refactor the `main.py` to import and use this manager instead of the `FlyClient`.

## 4. Monitoring
Use the `OPERATIONS.md` guide (also archived or in version history) to monitor the cluster.
```bash
kubectl get pods -n unideploy
```
