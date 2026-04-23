export interface FileNode {
  name: string;
  type: "file" | "directory";
  extension?: string;
  content?: string;
  children?: FileNode[];
}

export interface MockDeployment {
  id: string;
  commitSha: string;
  commitMessage: string;
  branch: string;
  status: "success" | "failed" | "building" | "cancelled";
  duration: string;
  deployedAt: string;
  deployedBy: string;
  logs: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export const mockFileTree: FileNode[] = [
  {
    name: "src",
    type: "directory",
    children: [
      {
        name: "app",
        type: "directory",
        children: [
          {
            name: "main.py",
            type: "file",
            extension: "py",
            content: `from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

app = FastAPI(title="My API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Item(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    price: float

items: List[Item] = []

@app.get("/")
def root():
    return {"message": "Welcome to My API"}

@app.get("/items", response_model=List[Item])
def list_items():
    return items

@app.post("/items", response_model=Item, status_code=201)
def create_item(item: Item):
    item.id = len(items) + 1
    items.append(item)
    return item

@app.get("/items/{item_id}", response_model=Item)
def get_item(item_id: int):
    for item in items:
        if item.id == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
`,
          },
          {
            name: "models.py",
            type: "file",
            extension: "py",
            content: `from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
`,
          },
        ],
      },
      {
        name: "tests",
        type: "directory",
        children: [
          {
            name: "test_main.py",
            type: "file",
            extension: "py",
            content: `from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to My API"}

def test_create_item():
    response = client.post("/items", json={
        "name": "Test Item",
        "description": "A test item",
        "price": 9.99
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Item"
    assert "id" in data

def test_list_items():
    response = client.get("/items")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
`,
          },
        ],
      },
    ],
  },
  {
    name: "requirements.txt",
    type: "file",
    extension: "txt",
    content: `fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
sqlalchemy==2.0.23
pytest==7.4.3
httpx==0.25.2
`,
  },
  {
    name: "Dockerfile",
    type: "file",
    extension: "dockerfile",
    content: `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
`,
  },
  {
    name: ".env.example",
    type: "file",
    extension: "env",
    content: `DATABASE_URL=postgresql://user:password@localhost/dbname
SECRET_KEY=your-secret-key-here
DEBUG=false
`,
  },
];

export const mockDeployments: MockDeployment[] = [
  {
    id: "dep-001",
    commitSha: "a3f2c1d",
    commitMessage: "feat: add item creation endpoint with validation",
    branch: "main",
    status: "success",
    duration: "1m 23s",
    deployedAt: "2026-04-04T10:30:00Z",
    deployedBy: "rahul@7edge.io",
    logs: [
      "[00:00] Starting build pipeline...",
      "[00:01] Installing dependencies from requirements.txt",
      "[00:08] fastapi==0.104.1 installed",
      "[00:09] uvicorn[standard]==0.24.0 installed",
      "[00:12] Running tests...",
      "[00:15] test_root PASSED",
      "[00:16] test_create_item PASSED",
      "[00:17] test_list_items PASSED",
      "[00:18] All 3 tests passed",
      "[00:19] Building Docker image...",
      "[01:02] Image built: sha256:abc123def456",
      "[01:10] Pushing to registry...",
      "[01:20] Deploying to sandbox...",
      "[01:23] ✓ Deployment successful",
      "[01:23] Service live at: https://api-dep-001.sandbox.e2b.dev",
    ],
  },
  {
    id: "dep-002",
    commitSha: "b8e4f7a",
    commitMessage: "fix: handle 404 errors in get_item endpoint",
    branch: "main",
    status: "success",
    duration: "58s",
    deployedAt: "2026-04-03T16:15:00Z",
    deployedBy: "rahul@7edge.io",
    logs: [
      "[00:00] Starting build pipeline...",
      "[00:01] Installing dependencies...",
      "[00:10] Running tests...",
      "[00:14] All tests passed",
      "[00:15] Building Docker image...",
      "[00:48] Deploying to sandbox...",
      "[00:58] ✓ Deployment successful",
    ],
  },
  {
    id: "dep-003",
    commitSha: "c2d9e3f",
    commitMessage: "feat: add SQLAlchemy models and database layer",
    branch: "feature/database",
    status: "failed",
    duration: "2m 11s",
    deployedAt: "2026-04-03T11:00:00Z",
    deployedBy: "rahul@7edge.io",
    logs: [
      "[00:00] Starting build pipeline...",
      "[00:01] Installing dependencies...",
      "[00:15] Running tests...",
      "[00:22] ERROR: test_create_item FAILED",
      "[00:22] AssertionError: 422 != 201",
      "[00:22] Validation error: field 'price' is required",
      "[02:11] ✗ Build failed — tests did not pass",
    ],
  },
  {
    id: "dep-004",
    commitSha: "d5a1b6c",
    commitMessage: "chore: update dependencies to latest versions",
    branch: "main",
    status: "success",
    duration: "1m 45s",
    deployedAt: "2026-04-02T09:00:00Z",
    deployedBy: "rahul@7edge.io",
    logs: [
      "[00:00] Starting build pipeline...",
      "[00:01] Installing updated dependencies...",
      "[00:20] Running tests...",
      "[00:30] All tests passed",
      "[00:31] Deploying...",
      "[01:45] ✓ Deployment successful",
    ],
  },
  {
    id: "dep-005",
    commitSha: "e7f3c8b",
    commitMessage: "feat: add CORS middleware configuration",
    branch: "main",
    status: "success",
    duration: "1m 02s",
    deployedAt: "2026-04-01T14:30:00Z",
    deployedBy: "rahul@7edge.io",
    logs: [
      "[00:00] Starting build pipeline...",
      "[00:01] Installing dependencies...",
      "[00:12] Running tests...",
      "[00:20] All tests passed",
      "[00:21] Deploying...",
      "[01:02] ✓ Deployment successful",
    ],
  },
  {
    id: "dep-006",
    commitSha: "f1e2d3c",
    commitMessage: "fix: resolve import path issues",
    branch: "hotfix/imports",
    status: "cancelled",
    duration: "0m 14s",
    deployedAt: "2026-03-31T20:00:00Z",
    deployedBy: "rahul@7edge.io",
    logs: [
      "[00:00] Starting build pipeline...",
      "[00:01] Installing dependencies...",
      "[00:14] ⊘ Deployment cancelled by user",
    ],
  },
  {
    id: "dep-007",
    commitSha: "a9b8c7d",
    commitMessage: "docs: add API documentation and README",
    branch: "main",
    status: "success",
    duration: "55s",
    deployedAt: "2026-03-30T11:45:00Z",
    deployedBy: "rahul@7edge.io",
    logs: [
      "[00:00] Starting build pipeline...",
      "[00:01] Installing dependencies...",
      "[00:10] Running tests...",
      "[00:18] All tests passed",
      "[00:19] Deploying...",
      "[00:55] ✓ Deployment successful",
    ],
  },
  {
    id: "dep-008",
    commitSha: "b3c4d5e",
    commitMessage: "init: initial project scaffold",
    branch: "main",
    status: "success",
    duration: "2m 30s",
    deployedAt: "2026-03-29T09:00:00Z",
    deployedBy: "rahul@7edge.io",
    logs: [
      "[00:00] Starting build pipeline...",
      "[00:01] Initialising project structure...",
      "[00:10] Installing dependencies...",
      "[01:00] Running initial tests...",
      "[01:10] All tests passed",
      "[01:11] Building Docker image (first build)...",
      "[02:20] Deploying to sandbox...",
      "[02:30] ✓ Initial deployment successful",
    ],
  },
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content: "Build me a REST API for managing a todo list with FastAPI",
    timestamp: "2026-04-04T10:00:00Z",
  },
  {
    id: "msg-2",
    role: "assistant",
    content:
      "I'll create a FastAPI REST API for your todo list. Setting up the project structure with CRUD endpoints, Pydantic models for validation, and in-memory storage to start.",
    timestamp: "2026-04-04T10:00:05Z",
  },
  {
    id: "msg-3",
    role: "user",
    content: "Add authentication with JWT tokens",
    timestamp: "2026-04-04T10:05:00Z",
  },
  {
    id: "msg-4",
    role: "assistant",
    content:
      "Adding JWT authentication using `python-jose` and `passlib`. I'll create `/auth/register` and `/auth/login` endpoints, and protect the todo routes with a Bearer token dependency.",
    timestamp: "2026-04-04T10:05:08Z",
  },
  {
    id: "msg-5",
    role: "user",
    content: "Write tests for the auth endpoints",
    timestamp: "2026-04-04T10:10:00Z",
  },
  {
    id: "msg-6",
    role: "assistant",
    content:
      "Writing pytest tests for registration, login, token validation, and protected route access. I'll cover success paths and edge cases like duplicate users and invalid tokens.",
    timestamp: "2026-04-04T10:10:06Z",
  },
];
