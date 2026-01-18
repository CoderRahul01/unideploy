from database import SessionLocal
import models

def check_deployments():
    db = SessionLocal()
    try:
        deployments = db.query(models.Deployment).all()
        print(f"Total Deployments: {len(deployments)}")
        for d in deployments:
            print(f"ID: {d.id}, ProjectID: {d.project_id}, Status: {d.status}")
        
        if not any(d.id == 4 for d in deployments):
            print("❌ Deployment ID 4 NOT FOUND")
        else:
            print("✅ Deployment ID 4 FOUND")

        projects = db.query(models.Project).all()
        print(f"\nTotal Projects: {len(projects)}")
        for p in projects:
            print(f"ID: {p.id}, Name: {p.name}")

    finally:
        db.close()

if __name__ == "__main__":
    check_deployments()
