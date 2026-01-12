from builder.docker_manager import DockerManager
from builder.tunnel_manager import TunnelManager
import time

class DeployAgent:
    def __init__(self):
        self.docker = DockerManager()
        self.tunnel = TunnelManager()
        
        # Ensure Runner Image Exists
        self.docker.build_runner_image()

    async def run(self, project_data):
        """
        Deploys project to Local Docker and exposes via Cloudflare Tunnel.
        """
        print(f"[DeployAgent] Provisioning Local Cloud for: {project_data['project_name']}")
        
        try:
            p_id = str(project_data['id'])
            
            # 1. Start Container
            # Pass build/start commands if you want, but for now we trust the image defaults or envs
            start_cmd = project_data.get('start_command', "echo 'No Start Cmd'")
            sandbox = self.docker.create_sandbox(p_id, start_cmd)
            
            if not sandbox:
                raise Exception("Failed to start Docker container")
                
            print(f"[DeployAgent] Sandbox Active on Local Port: {sandbox['port']}")
            
            # 2. Start Global Tunnel
            tunnel_info = self.tunnel.start_tunnel(sandbox['port'], p_id)
            
            if not tunnel_info:
                raise Exception("Failed to start Cloudflare Tunnel")
                
            return {
                "status": "live", 
                "url": tunnel_info['url'],
                "container_id": sandbox['id']
            }

        except Exception as e:
            print(f"[DeployAgent] Deployment failed: {e}")
            raise e
