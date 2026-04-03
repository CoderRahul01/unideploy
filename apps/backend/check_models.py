import sys
import os
sys.path.append(os.getcwd())
try:
    import models
    from sqlalchemy.orm import declarative_base
    print(f"Project columns: {models.Project.__table__.columns.keys()}")
    p = models.Project(name="test")
    print("Success creating project with name")
except Exception as e:
    print(f"Error: {e}")
