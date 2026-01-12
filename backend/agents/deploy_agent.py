from builder.e2b_manager import E2BManager
import time

class DeployAgent:
    def __init__(self):
        self.e2b = E2BManager()

    async def run(self, project_data):
        """
        Deploys project to an E2B Sandbox (Serverless).
        """
        print(f"[DeployAgent] Provisioning E2B Sandbox for: {project_data['project_name']}")
        
        try:
            p_id = str(project_data['id'])
            repo_url = project_data.get('repo_url')
            
            # 1. Create Sandbox
            # We pass build/start commands if available
            build_cmd = project_data.get('build_command')
            start_cmd = project_data.get('start_command', "echo 'No Start Cmd'")
            
            sandbox = self.e2b.create_sandbox(
                repo_url=repo_url,
                build_command=build_cmd,
                start_command=start_cmd
            )
            
            if not sandbox:
                raise Exception("Failed to create E2B Sandbox")
                
            print(f"[DeployAgent] Sandbox Active: {sandbox['url']}")
            
            return {
                "status": "live", 
                "url": sandbox['url'],
                "sandbox_id": sandbox['id']
            }

        except Exception as e:
            print(f"[DeployAgent] Deployment failed: {e}")
            raise e
