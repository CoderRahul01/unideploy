import docker
import os
import time

class DockerManager:
    """
    Manages Local Docker Containers for User Projects.
    Acts as the "Local Cloud" provider.
    """
    def __init__(self):
        try:
            self.client = docker.from_env()
            self.network_name = "unideploy-net"
            self._ensure_network()
            print("[DockerManager] Connected to Docker Engine.")
        except Exception as e:
            print(f"[DockerManager] Failed to connect to Docker: {e}")
            self.client = None

    def _ensure_network(self):
        """Ensures a dedicated bridge network exists."""
        if not self.client: return
        try:
            self.client.networks.get(self.network_name)
        except docker.errors.NotFound:
            self.client.networks.create(self.network_name, driver="bridge")

    def build_runner_image(self):
        """Builds the 'Universal Runner' image locally."""
        if not self.client: return False
        try:
            print("[DockerManager] Building Runner Image...")
            # Assuming Dockerfile is at backend/runner/Dockerfile
            # Context is backend/runner
            image, logs = self.client.images.build(
                path=os.path.join("backend", "runner"),
                tag="unideploy-runner:latest",
                rm=True
            )
            print("[DockerManager] Runner image built successfully.")
            return True
        except Exception as e:
            print(f"[DockerManager] Build failed: {e}")
            return False

    def create_sandbox(self, project_id: str, command: str = None):
        """
        Starts a container for the project on the docker network.
        Returns container object or None.
        """
        if not self.client: return None
        
        container_name = f"unideploy-{project_id}"
        
        # Cleanup existing
        try:
            old = self.client.containers.get(container_name)
            old.stop()
            old.remove()
        except docker.errors.NotFound:
            pass
            
        try:
            # We map a random host port to 8080
            container = self.client.containers.run(
                "unideploy-runner:latest",
                name=container_name,
                network=self.network_name,
                detach=True,
                environment={
                    "START_COMMAND": command or "echo 'No Start Command'"
                },
                ports={'8080/tcp': None} # Bind to random port
            )
            
            # Get the assigned port
            container.reload()
            host_port = container.attrs['NetworkSettings']['Ports']['8080/tcp'][0]['HostPort']
            
            print(f"[DockerManager] Started {container_name} on port {host_port}")
            return {"id": container.id, "port": host_port, "name": container_name}
            
        except Exception as e:
            print(f"[DockerManager] Container start failed: {e}")
            return None

    def stop_sandbox(self, project_id: str):
        if not self.client: return
        try:
            container = self.client.containers.get(f"unideploy-{project_id}")
            container.stop()
            print(f"[DockerManager] Stopped {project_id}")
        except Exception as e:
            print(f"[DockerManager] Stop failed: {e}")
