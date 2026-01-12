from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ProjectBase(BaseModel):
    name: str
    git_url: Optional[str] = None


class ProjectCreate(ProjectBase):
    project_type: Optional[str] = None
    port: Optional[int] = None


class Project(ProjectBase):
    id: int
    owner_id: int
    project_type: Optional[str] = None
    status: str
    last_active_at: datetime
    daily_runtime_minutes: int
    total_runtime_minutes: int
    last_reset_at: datetime
    last_deployed: Optional[datetime] = None

    class Config:
        from_attributes = True


class DeploymentBase(BaseModel):
    project_id: int


class DeploymentCreate(DeploymentBase):
    pass


class Deployment(DeploymentBase):
    id: int
    status: str
    image_tag: Optional[str] = None
    domain: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
