import json
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Employee
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./northwind.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_employees():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    submissions_dir = "submissions"
    for folder in os.listdir(submissions_dir):
        info_path = os.path.join(submissions_dir, folder, "employee_info.json")
        if os.path.exists(info_path):
            with open(info_path, "r") as f:
                data = json.load(f)
                
                # Check if employee already exists
                existing = db.query(Employee).filter(Employee.id == data["employee_id"]).first()
                if not existing:
                    employee = Employee(
                        id=data["employee_id"],
                        name=data["name"],
                        grade=data["grade"],
                        title=data["title"],
                        department=data["department"],
                        manager_id=data["manager_id"],
                        home_base=data["home_base"]
                    )
                    db.add(employee)
                    print(f"Seeded employee: {employee.name}")
    
    db.commit()
    db.close()

if __name__ == "__main__":
    seed_employees()
