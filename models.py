from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()

class Employee(Base):
    __tablename__ = "employees"

    id = Column(String, primary_key=True, index=True) # NW-XXXXX
    name = Column(String)
    grade = Column(Integer)
    title = Column(String)
    department = Column(String)
    manager_id = Column(String)
    home_base = Column(String)

    submissions = relationship("Submission", back_populates="employee")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.id"))
    trip_purpose = Column(String)
    trip_start_date = Column(DateTime)
    trip_end_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String) # e.g., "pending", "reviewed"

    employee = relationship("Employee", back_populates="submissions")
    line_items = relationship("LineItem", back_populates="submission")

class LineItem(Base):
    __tablename__ = "line_items"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"))
    category = Column(String)
    amount = Column(Float)
    currency = Column(String)
    date = Column(DateTime)
    vendor = Column(String)
    description = Column(Text)
    
    # AI Verdict
    verdict = Column(String) # compliant, flagged, rejected
    reasoning = Column(Text)
    policy_citations = Column(JSON) # List of {clause: str, quote: str}
    confidence = Column(Float)
    
    # Human Override
    override_verdict = Column(String, nullable=True)
    override_comment = Column(Text, nullable=True)

    submission = relationship("Submission", back_populates="line_items")
