# 🛠️ UniDeploy Operations Guide

This guide covers how to monitor, scale, and manage costs for your UniDeploy production environment on AWS.

---

## 💰 1. Cost Management (The "6-Hour Day" Strategy)
To maximize your $100 AWS credit, you should stop resources when not in use.

### Option A: The "Sleep" Mode (Saves ~60% Cost)
*Keep the EKS cluster alive but turn off the worker nodes (EC2 instances).*
- **Stop (Scale to 0)**:
  ```bash
  eksctl scale nodegroup --cluster UniDeployEKS --name standard-nodes-v2 --nodes 0 --region us-east-1
  ```
- **Start (Resume)**:
  ```bash
  eksctl scale nodegroup --cluster UniDeployEKS --name standard-nodes-v2 --nodes 2 --region us-east-1
  ```
> [!NOTE]
> The EKS Control Plane still costs ~$0.10/hour while sleeping.

### Option B: The "Full Shutdown" (Saves 100% Cost)
*Delete the cluster entirely. Best for long breaks.*
- **Stop**:
  ```bash
  eksctl delete cluster --name UniDeployEKS --region us-east-1
  ```
- **Restart**: Run your `./setup_aws.sh` script again.

---

## 📊 2. Monitoring Commands

### Node & Cluster Health
```bash
# Check if your servers are up
kubectl get nodes

# See overall cluster health
eksctl get cluster --name UniDeployEKS --region us-east-1
```

### Application Health (Pods)
```bash
# Check if the control plane is running
kubectl get pods -n unideploy

# View live logs (Real-time troubleshooting)
kubectl logs -f deployment/unideploy-control-plane -n unideploy
```

### Networking & URLs
```bash
# Get the public URL of your Dashboard/API
kubectl get svc -n unideploy
```

---

## 🚑 3. Troubleshooting "When Things Go Wrong"

### "ImagePullBackOff"
- **Cause**: EKS can't find your Docker image in ECR.
- **Fix**: Check your Image URL in `k8s/aws_control_plane.yaml`. Ensure it matches your ECR registry path exactly.

### "CrashLoopBackOff"
- **Cause**: The backend app is crashing on startup.
- **Fix**: Check logs using `kubectl logs -n unideploy`. It's usually a missing environment variable or a database connection error.

### "Pending Nodes"
- **Cause**: AWS is out of `t3.medium` instances in that region or your quota is hit.
- **Fix**: Try changing the region in `setup_aws.sh` or wait 5 minutes.
