# Go (Execution Triggers)

This file will track active commands and execution context for running the multi-agent system.

## Setup Commands
```bash
# To run after dependencies are updated:
pip install -r apps/backend/requirements.txt
```

## Docker Commands
```bash
# Build
docker build -t unideploy-backend apps/backend/

# Run
docker run -p 8000:8000 --env-file apps/backend/.env unideploy-backend
```
