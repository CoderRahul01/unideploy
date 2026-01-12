from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    clerk_id = Column(String, unique=True, index=True)
    username = Column(String)
    email = Column(String)
    projects = relationship("Project", back_populates="owner")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True) # Added name column
    status = Column(String, default="CREATED") # CREATED, BUILT, RUNNING, SLEEPING, WAKING
    last_active_at = Column(DateTime, default=datetime.datetime.utcnow)
    daily_runtime_minutes = Column(Integer, default=0)
    total_runtime_minutes = Column(Integer, default=0)
    last_reset_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_locked = Column(Integer, default=0) # 0 = unlocked, 1 = locked
    last_deployed = Column(DateTime, default=datetime.datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="projects")
    deployments = relationship("Deployment", back_populates="project")

class Deployment(Base):
    __tablename__ = "deployments"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    status = Column(String) # queued, building, deploying, live, failed
    image_tag = Column(String)
    domain = Column(String)
    logs = Column(JSON) # Store build/deploy logs
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    project = relationship("Project", back_populates="deployments")
