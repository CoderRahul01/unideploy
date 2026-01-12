from builder.fly_manager import FlyManager

class DeployAgent:
    def __init__(self):
        self.manager = FlyManager()

    async def run(self, project_data):
        """
        Deploys the project to Fly.io Machines (Sandbox).
        project_data must contain: project_name, id, repo_url, build_command, start_command
        """
        print(f"[DeployAgent] Provisioning Sandbox for: {project_data['project_name']}")
        
        try:
            # For Sandbox, we use the "Universal Runner" image
            # In a real scenario, we might build a custom image
            # But here we pass the runtime config to the generic runner
            
            # Note: In a real Fly app, we'd pass ENV vars for build/start
            # self.manager.create_sandbox(project_id=project_data['id']...)
            
            # Mocking the success for now until we have real credits/app
            print(f"[DeployAgent] (Mock) Calling FlyManager.create_sandbox...")
            # machine = self.manager.create_sandbox(str(project_data['id']))
            
            # if machine:
            #     print(f"[DeployAgent] Successfully deployed machine {machine['id']}")
            return True
            # else:
            #     raise Exception("Fly.io provisioning failed.")
                
        except Exception as e:
            print(f"[DeployAgent] Deployment failed: {e}")
            raise e
