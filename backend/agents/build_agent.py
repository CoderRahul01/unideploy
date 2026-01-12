import os
import docker
from jinja2 import Template
from builder.detect import detect_project_type

class BuildAgent:
    def __init__(self, registry_url=None):
        try:
            self.client = docker.from_env()
        except Exception as e:
            print(f"[BuildAgent] Warning: Could not initialize Docker client: {e}")
            self.client = None
        self.registry_url = registry_url

    async def run(self, project_path, project_name):
        """
        Orchestrates the build for a specific project.
        """
        print(f"[BuildAgent] Starting build for {project_name} at {project_path}")
        
        # 1. Detection
        config = detect_project_type(project_path)
        if config["type"] == "unknown":
            raise ValueError(f"Could not detect project type for {project_name}")
        
        # 2. Dockerfile Generation
        template_name = f"Dockerfile.{config['framework'] if config['framework'] in ['python', 'nodejs'] else 'static'}.j2"
        # Correct path for agents/build_agent.py to find builder/templates
        template_path = os.path.join(os.path.dirname(__file__), "..", "builder", "templates", template_name)
        
        with open(template_path, "r") as f:
            template = Template(f.read())
        
        dockerfile_content = template.render(**config)
        dockerfile_path = os.path.join(project_path, "Dockerfile.unideploy")
        
        with open(dockerfile_path, "w") as f:
            f.write(dockerfile_content)
            
        # 3. Build
        image_tag = f"unideploy/{project_name}:latest"
        if self.registry_url:
            image_tag = f"{self.registry_url}/{project_name}:latest"
            
        print(f"[BuildAgent] Building {image_tag}...")
        
        image, logs = self.client.images.build(
            path=project_path,
            dockerfile="Dockerfile.unideploy",
            tag=image_tag,
            rm=True
        )
        
        # Simple log processing
        for log in logs:
            if 'stream' in log:
                print(f"[BuildAgent LOG] {log['stream'].strip()}")
                
        print(f"[BuildAgent] Build successful: {image_tag}")
        
        if self.registry_url:
            print(f"[BuildAgent] Pushing {image_tag} to registry...")
            self.client.images.push(image_tag)
            
        return image_tag
