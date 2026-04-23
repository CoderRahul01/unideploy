import os
import docker
from jinja2 import Template
from builder.detect import detect_project_type


def orchestrate_build(project_path, image_name, registry_url=None):
    """
    Full build orchestration: Detect -> Template -> Build
    """
    # 1. Detect project type
    config = detect_project_type(project_path)
    if config["type"] == "unknown":
        raise ValueError("Could not detect project type")

    # 2. Select and Load template
    template_name = f"Dockerfile.{config['framework'] if config['framework'] in ['python', 'nodejs'] else 'static'}.j2"
    template_path = os.path.join(os.path.dirname(__file__), "templates", template_name)

    with open(template_path, "r") as f:
        template = Template(f.read())

    # 3. Generate Dockerfile
    dockerfile_content = template.render(**config)
    dockerfile_path = os.path.join(project_path, "Dockerfile.unideploy")

    with open(dockerfile_path, "w") as f:
        f.write(dockerfile_content)

    print(f"Generated Dockerfile at {dockerfile_path}")

    # 4. Build Docker Image
    client = docker.from_env()
    print(f"Building image {image_name}...")

    try:
        image, logs = client.images.build(
            path=project_path,
            dockerfile="Dockerfile.unideploy",
            tag=image_name,
            rm=True,
        )
        for log in logs:
            if "stream" in log:
                print(log["stream"].strip())

        print(f"Successfully built {image_name}")

        # 5. Push to Registry (if provided)
        if registry_url:
            print(f"Pushing image to {registry_url}...")
            client.images.push(image_name)
            print("Successfully pushed")

        return image_name
    except Exception as e:
        print(f"Build failed: {e}")
        raise e


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 2:
        orchestrate_build(sys.argv[1], sys.argv[2])
    else:
        print("Usage: python orchestrator.py <project_path> <image_tag>")
