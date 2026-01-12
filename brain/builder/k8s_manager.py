class K8sManager:
    def __init__(self):
        print("[MockK8sManager] Initialized in Sandbox Mode.")
        self.k8s_client = None

    def deploy_project(self, project_data: dict) -> bool:
        print(f"[MockK8sManager] Mock deploying {project_data['project_name']}...")
        print(f"[MockK8sManager] Domain: {project_data['domain']}")
        return True

    def scale_deployment(self, project_name: str, replicas: int) -> bool:
        print(f"[MockK8sManager] Mock scaling {project_name} to {replicas}")
        return True
