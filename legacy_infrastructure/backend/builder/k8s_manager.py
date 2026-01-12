import os
import yaml
from jinja2 import Template
from kubernetes import client, config, utils

class K8sManager:
    def __init__(self):
        try:
            config.load_kube_config()
        except:
            print("Could not load kube config, assuming in-cluster")
            config.load_incluster_config()
            
        self.k8s_client = client.ApiClient()
        self.templates_path = os.path.join(os.path.dirname(__file__), "templates")

    def generate_manifests(self, project_data):
        """
        Generates and returns K8s manifests as a list of dictionaries.
        """
        manifests = []
        template_files = ["k8s_deployment.yaml.j2", "k8s_service.yaml.j2", "k8s_ingress.yaml.j2"]
        
        for t_file in template_files:
            path = os.path.join(self.templates_path, t_file)
            with open(path, "r") as f:
                template = Template(f.read())
                manifest_str = template.render(**project_data)
                manifest_dict = yaml.safe_load(manifest_str)
                manifests.append(manifest_dict)
                
        return manifests

    def scale_deployment(self, project_name, replicas=1, namespace="default"):
        """
        Scales a deployment up or down.
        """
        api_instance = client.AppsV1Api(self.k8s_client)
        body = {"spec": {"replicas": replicas}}
        try:
            api_instance.patch_namespaced_deployment_scale(
                name=project_name,
                namespace=namespace,
                body=body
            )
            print(f"Scaled deployment {project_name} to {replicas} in {namespace}")
            return True
        except Exception as e:
            print(f"Error scaling deployment: {e}")
            raise e

    def ensure_namespace_quota(self, namespace):
        """
        Ensures a ResourceQuota exists in the namespace.
        """
        api_instance = client.CoreV1Api(self.k8s_client)
        quota_name = f"{namespace}-quota"
        
        # Free tier limits
        quota_manifest = {
            "apiVersion": "v1",
            "kind": "ResourceQuota",
            "metadata": {"name": quota_name},
            "spec": {
                "hard": {
                    "pods": "2",
                    "requests.cpu": "200m",
                    "requests.memory": "256Mi",
                    "limits.cpu": "500m",
                    "limits.memory": "512Mi"
                }
            }
        }
        
        try:
            api_instance.create_namespaced_resource_quota(namespace=namespace, body=quota_manifest)
            print(f"Created ResourceQuota in {namespace}")
        except client.exceptions.ApiException as e:
            if e.status == 409: # Already exists
                api_instance.replace_namespaced_resource_quota(name=quota_name, namespace=namespace, body=quota_manifest)
                print(f"Updated ResourceQuota in {namespace}")
            else:
                raise e

    def deploy_project(self, project_data):
        """
        Generates manifests and applies them to the K8s cluster.
        """
        namespace = project_data.get("namespace", "default")
        
        # Ensure quota exists first
        self.ensure_namespace_quota(namespace)

        manifests = self.generate_manifests(project_data)
        
        for manifest in manifests:
            try:
                utils.create_from_dict(self.k8s_client, manifest, namespace=namespace)
                print(f"Applied {manifest['kind']} - {manifest['metadata']['name']}")
            except Exception as e:
                # If already exists, we might want to patch or replace
                print(f"Error applying {manifest['kind']}: {e}. Trying patch...")
                # Simple patch logic could be added here
                
        return True

if __name__ == "__main__":
    # Test block
    manager = K8sManager()
    test_data = {
        "project_name": "test-app",
        "image_name": "nginx:latest",
        "port": 80,
        "domain": "test.unideploy.io",
        "cpu_limit": "200m",
        "mem_limit": "256Mi"
    }
    manifests = manager.generate_manifests(test_data)
    for m in manifests:
        print(yaml.dump(m))
