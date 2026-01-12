# 🗄️ AWS Legacy Archive

This directory contains the original "Heavy" AWS Infrastructure code used before the pivot to the E2B Serverless architecture.
These files are preserved for recovery or reference if we ever need to scale back to a full Kubernetes (EKS) setup.

## 📂 Contents

1.  **`k8s/`**: Kubernetes Manifests (Helm Charts/YAML) for deploying the Control Plane and Node Groups.
2.  **`backend/`**: Contains the original `k8s_manager.py` which interfaced with the `kubernetes` Python SDK.
3.  **`setup_aws.sh`**: The original provisioning script for AWS EKS.
4.  **`deploy_platform.sh`**: Script to build and push Docker images to ECR.

## 🔄 Restoration Instructions

To restore this architecture:

1.  Move files back to root:
    ```bash
    cp setup_aws.sh ../
    cp deploy_platform.sh ../
    cp -r k8s ../
    cp backend/builder/k8s_manager.py ../backend/builder/
    ```

2.  Re-enable K8s Manager in `backend/agents/deploy_agent.py`:
    -   Import `K8sManager` instead of `E2BManager`.
    -   Update `DeployAgent` to use `self.k8s.deploy_project()`.

3.  Execute Provisioning:
    ```bash
    cd ..
    ./setup_aws.sh
    ```
