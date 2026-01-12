import os
import json


def detect_project_type(project_path):
    """
    Detects if a project is static or dynamic and identifies the framework.
    """
    files = os.listdir(project_path)

    # 1. Check for Node.js projects
    if "package.json" in files:
        with open(os.path.join(project_path, "package.json"), "r") as f:
            package_data = json.load(f)
            dependencies = package_data.get("dependencies", {})
            dev_dependencies = package_data.get("devDependencies", {})
            all_deps = {**dependencies, **dev_dependencies}

            if "next" in all_deps:
                return {
                    "type": "dynamic",
                    "framework": "nextjs",
                    "build_command": "npm run build",
                    "start_command": "npm run start",
                }
            elif "vite" in all_deps:
                return {
                    "type": "static",
                    "framework": "vite",
                    "build_command": "npm run build",
                    "output_dir": "dist",
                }
            elif "react-scripts" in all_deps:
                return {
                    "type": "static",
                    "framework": "create-react-app",
                    "build_command": "npm run build",
                    "output_dir": "build",
                }
            else:
                return {
                    "type": "dynamic",
                    "framework": "nodejs",
                    "start_command": "npm start",
                }

    # 2. Check for Python projects
    if "requirements.txt" in files or "pyproject.toml" in files:
        # Simple detection for now
        return {
            "type": "dynamic",
            "framework": "python",
            "start_command": "uvicorn main:app --host 0.0.0.0 --port 8080",
        }

    # 3. Default to static if index.html exists
    if "index.html" in files:
        return {"type": "static", "framework": "vanilla-html", "output_dir": "."}

    return {"type": "unknown", "framework": "unknown"}


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        print(json.dumps(detect_project_type(sys.argv[1]), indent=2))
    else:
        print("Usage: python detect.py <project_path>")
