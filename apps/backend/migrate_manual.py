from database import engine
from sqlalchemy import text


def migrate():
    with engine.connect() as conn:
        print("Running manual migration...")
        try:
            conn.execute(text("ALTER TABLE projects ADD COLUMN name VARCHAR"))
            conn.execute(text("CREATE INDEX ix_projects_name ON projects (name)"))
            print("Successfully added 'name' column to projects table.")
        except Exception as e:
            print(f"Migration error (might already exist): {e}")


if __name__ == "__main__":
    migrate()
