import os
import subprocess
import tempfile
from pathlib import Path
from google.cloud import run_v2
from e2b_code_interpreter import Sandbox

GCP_PROJECT    = os.environ.get("GCP_PROJECT_ID", "unideploy-test")
GCP_REGION     = os.environ.get("GCP_REGION", "us-central1")
REGISTRY       = os.environ.get("GCP_ARTIFACT_REGISTRY", "us-central1-docker.pkg.dev")
DOMAIN_BASE    = os.environ.get("DOMAIN_BASE", "unideploy.in")
REPO           = "unideploy-apps"


class DeployAgent:

    async def deploy(self, project_id: str, sandbox_id: str) -> dict:
        """
        Full pipeline:
        1. Pull project files out of E2B sandbox
        2. Generate a Dockerfile if one doesn't exist
        3. Build + push Docker image to Artifact Registry
        4. Deploy to Cloud Run
        5. Map custom subdomain
        Returns: { url, custom_domain, status }
        """
        image_uri = await self._build_image(project_id, sandbox_id)
        service_url = await self._deploy_to_cloud_run(project_id, image_uri)
        custom_domain = await self._map_domain(project_id, service_url)

        return {
            "status":        "live",
            "url":           service_url,
            "custom_domain": custom_domain,
            "image_uri":     image_uri,
        }

    async def _build_image(self, project_id: str, sandbox_id: str) -> str:
        """
        Downloads files from E2B sandbox, generates Dockerfile if missing,
        then builds + pushes the image using Cloud Build (serverless build).
        """
        image_tag = f"{REGISTRY}/{GCP_PROJECT}/{REPO}/{project_id}:latest"

        with tempfile.TemporaryDirectory() as tmpdir:
            # 1. Pull files from E2B sandbox
            api_key = os.getenv("E2B_API_KEY")
            sbx = Sandbox.connect(sandbox_id, api_key=api_key)
            
            # List files in the project directory
            files = sbx.files.list("/home/user/project")
            for f in files:
                if f.type == "file":
                    content = sbx.files.read(f"/home/user/project/{f.name}")
                    Path(tmpdir, f.name).write_text(content)

            # 2. Generate Dockerfile if not present
            dockerfile = Path(tmpdir, "Dockerfile")
            if not dockerfile.exists():
                dockerfile.write_text(self._auto_dockerfile(tmpdir))

            # 3. Build via Cloud Build (no local Docker needed)
            subprocess.run([
                "gcloud", "builds", "submit",
                "--tag", image_tag,
                "--project", GCP_PROJECT,
                tmpdir
            ], check=True)

        return image_tag

    def _auto_dockerfile(self, project_dir: str) -> str:
        """
        Detects framework from files and generates an appropriate Dockerfile.
        """
        files = os.listdir(project_dir)

        if "requirements.txt" in files:
            return """FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
"""
        elif "package.json" in files:
            return """FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "start"]
"""
        else:
            return """FROM python:3.11-slim
WORKDIR /app
COPY . .
EXPOSE 8080
CMD ["python", "main.py"]
"""

    async def _deploy_to_cloud_run(self, project_id: str, image_uri: str) -> str:
        """
        Deploys the image to Cloud Run and returns the service URL.
        Service name = project_id (slugified).
        """
        service_name = f"ud-{project_id}"
        client = run_v2.ServicesClient()

        service = run_v2.Service(
            template=run_v2.RevisionTemplate(
                containers=[
                    run_v2.Container(
                        image=image_uri,
                        ports=[run_v2.ContainerPort(container_port=8080)],
                        resources=run_v2.ResourceRequirements(
                            limits={"cpu": "1", "memory": "512Mi"}
                        ),
                    )
                ],
                scaling=run_v2.RevisionScaling(
                    min_instance_count=0,
                    max_instance_count=10,
                ),
            ),
            ingress=run_v2.IngressTraffic.INGRESS_TRAFFIC_ALL,
        )

        parent = f"projects/{GCP_PROJECT}/locations/{GCP_REGION}"
        operation = client.create_service(
            parent=parent,
            service=service,
            service_id=service_name,
        )
        result = operation.result(timeout=300)

        # Make it publicly accessible
        from google.iam.v1 import policy_pb2
        policy = client.get_iam_policy(resource=result.name)
        policy.bindings.append(
            policy_pb2.Binding(role="roles/run.invoker", members=["allUsers"])
        )
        client.set_iam_policy(resource=result.name, policy=policy)

        return result.uri

    async def _map_domain(self, project_id: str, service_url: str) -> str:
        """
        Maps {project_id}.unideploy.in → Cloud Run service.
        Requires wildcard DNS *.unideploy.in → ghs.googlehosted.com
        set up once in your DNS provider.
        """
        subdomain = f"{project_id}.{DOMAIN_BASE}"

        subprocess.run([
            "gcloud", "beta", "run", "domain-mappings", "create",
            "--service", f"ud-{project_id}",
            "--domain", subdomain,
            "--region", GCP_REGION,
            "--project", GCP_PROJECT,
        ], check=True)

        return f"https://{subdomain}"


deploy_agent = DeployAgent()
