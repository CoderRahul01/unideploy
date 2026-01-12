#!/bin/bash

# setup_aws.sh - UniDeploy AWS Infrastructure Provisioning Guide
# This script helps provision the necessary AWS resources for UniDeploy.

echo "--- UniDeploy AWS Setup ---"

# 1. Variables (Update these)
REGION="us-east-1"
ECR_REPO_NAME="unideploy-repo"
EKS_CLUSTER_NAME="UniDeployEKS"

echo "[1/4] Creating Amazon ECR Repository..."
aws ecr create-repository --repository-name $ECR_REPO_NAME --region $REGION

echo "[2/4] Authenticating Docker with ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$REGION.amazonaws.com

echo "[3/4] Creating EKS Cluster (using eksctl)..."
# Note: This requires eksctl installed. Alternatively, use AWS Console.
eksctl create cluster \
    --name $EKS_CLUSTER_NAME \
    --region $REGION \
    --nodegroup-name standard-nodes \
    --node-type t3.medium \
    --nodes 2 \
    --managed

echo "[4/4] Updating Kubeconfig..."
aws eks update-kubeconfig --region $REGION --name $EKS_CLUSTER_NAME

echo "------------------------------------------------"
echo "AWS Setup Complete!"
echo "ECR Registry: $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$REGION.amazonaws.com"
echo "EKS Cluster: $EKS_CLUSTER_NAME"
echo ""
echo "Next Steps:"
echo "1. Push images to ECR: docker tag ... && docker push ..."
echo "2. Create 'unideploy' namespace: kubectl create namespace unideploy"
echo "3. Apply manifests: kubectl apply -f k8s/aws_control_plane.yaml"
echo "------------------------------------------------"
