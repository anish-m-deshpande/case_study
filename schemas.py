from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class EmployeeBase(BaseModel):
    id: str
    name: str
    grade: int
    title: str
    department: str
    manager_id: str
    home_base: str

class Employee(EmployeeBase):
    class Config:
        from_attributes = True

class LineItemBase(BaseModel):
    category: str
    amount: float
    currency: str
    date: datetime
    vendor: str
    description: Optional[str] = None

class LineItemCreate(LineItemBase):
    pass

class LineItem(LineItemBase):
    id: int
    submission_id: int
    verdict: str
    reasoning: str
    policy_citations: List[Dict[str, str]]
    confidence: float
    override_verdict: Optional[str] = None
    override_comment: Optional[str] = None

    class Config:
        from_attributes = True

class SubmissionBase(BaseModel):
    employee_id: str
    trip_purpose: str
    trip_start_date: datetime
    trip_end_date: datetime

class SubmissionCreate(SubmissionBase):
    pass

class Submission(SubmissionBase):
    id: int
    created_at: datetime
    status: str
    employee: Employee
    line_items: List[LineItem]

    class Config:
        from_attributes = True

class OverrideRequest(BaseModel):
    verdict: str
    comment: str

class PolicyQuestion(BaseModel):
    question: str

class PolicyAnswer(BaseModel):
    answer: str
    citations: List[Dict[str, str]]
