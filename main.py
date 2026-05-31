from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database
from database import engine, get_db
import receipt_processor
import reviewer
import policy_engine
import os
import aiofiles
import uuid
from datetime import datetime
import asyncio

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Northwind Logistics Expense Review")

# Serve static files (frontend) from the static directory
# We use a catch-all route to handle React Router if needed, 
# but for this app, serving index.html at root is enough.
app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

@app.get("/")
async def serve_frontend():
    return FileResponse("static/index.html")

@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # If the file exists in static, serve it, otherwise serve index.html
    file_path = os.path.join("static", full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse("static/index.html")

@app.get("/employees", response_model=List[schemas.Employee])
def get_employees(db: Session = Depends(get_db)):
    return db.query(models.Employee).all()

@app.post("/employees", response_model=schemas.Employee)
def create_employee(employee: schemas.EmployeeBase, db: Session = Depends(get_db)):
    db_employee = models.Employee(**employee.dict())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

@app.post("/submissions", response_model=schemas.Submission)
async def create_submission(
    employee_id: str = Form(...),
    trip_purpose: str = Form(...),
    trip_start_date: str = Form(...),
    trip_end_date: str = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    # 1. Get Employee
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # 2. Create Submission record
    db_submission = models.Submission(
        employee_id=employee_id,
        trip_purpose=trip_purpose,
        trip_start_date=datetime.fromisoformat(trip_start_date),
        trip_end_date=datetime.fromisoformat(trip_end_date),
        status="pending"
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)

    trip_context = {
        "purpose": trip_purpose,
        "dates": f"{trip_start_date} to {trip_end_date}"
    }

    # 3. Process each file in parallel with concurrency control
    semaphore = asyncio.Semaphore(5) 

    async def process_file(file: UploadFile):
        async with semaphore:
            unique_id = str(uuid.uuid4())
            temp_path = f"temp_{unique_id}_{file.filename}"
            
            async with aiofiles.open(temp_path, 'wb') as out_file:
                content = await file.read()
                await out_file.write(content)
            
            try:
                receipt_data = await receipt_processor.extract_receipt_data(temp_path)
                review_result = await reviewer.review_line_item(
                    employee_data={
                        "name": employee.name,
                        "grade": employee.grade,
                        "title": employee.title,
                        "home_base": employee.home_base
                    },
                    trip_context=trip_context,
                    receipt_data=receipt_data
                )
                
                return {
                    "receipt_data": receipt_data,
                    "review_result": review_result
                }
            except Exception as e:
                print(f"Error processing {file.filename}: {str(e)}")
                return {
                    "receipt_data": {"vendor": file.filename, "category": "Error", "total_amount": 0, "date": datetime.now().strftime("%Y-%m-%d")},
                    "review_result": {"verdict": "Flagged", "reasoning": f"AI processing failed: {str(e)}", "policy_citations": [], "confidence": 0}
                }
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)

    results = await asyncio.gather(*[process_file(f) for f in files])

    # 4. Save LineItems to DB
    for res in results:
        receipt_data = res["receipt_data"]
        review_result = res["review_result"]
        
        try:
            item_date = datetime.fromisoformat(receipt_data.get("date", datetime.now().strftime("%Y-%m-%d")))
        except:
            item_date = datetime.now()

        db_line_item = models.LineItem(
            submission_id=db_submission.id,
            category=receipt_data.get("category", "Other"),
            amount=receipt_data.get("total_amount", 0.0),
            currency=receipt_data.get("currency", "USD"),
            date=item_date,
            vendor=receipt_data.get("vendor", "Unknown"),
            description=receipt_data.get("description", ""),
            verdict=review_result["verdict"],
            reasoning=review_result["reasoning"],
            policy_citations=review_result["policy_citations"],
            confidence=review_result["confidence"]
        )
        db.add(db_line_item)

    db.commit()
    db.refresh(db_submission)
    return db_submission

@app.get("/submissions", response_model=List[schemas.Submission])
def list_submissions(db: Session = Depends(get_db)):
    return db.query(models.Submission).order_by(models.Submission.created_at.desc()).all()

@app.get("/submissions/{submission_id}", response_model=schemas.Submission)
def get_submission(submission_id: int, db: Session = Depends(get_db)):
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission

@app.delete("/submissions/{submission_id}")
def delete_submission(submission_id: int, db: Session = Depends(get_db)):
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    db.query(models.LineItem).filter(models.LineItem.submission_id == submission_id).delete()
    db.delete(submission)
    db.commit()
    return {"status": "success"}

@app.post("/line_items/{line_item_id}/override")
def override_line_item(line_item_id: int, override: schemas.OverrideRequest, db: Session = Depends(get_db)):
    line_item = db.query(models.LineItem).filter(models.LineItem.id == line_item_id).first()
    if not line_item:
        raise HTTPException(status_code=404, detail="Line item not found")
    
    line_item.override_verdict = override.verdict
    line_item.override_comment = override.comment
    db.commit()
    return {"status": "success"}

@app.post("/policy/chat", response_model=schemas.PolicyAnswer)
async def policy_chat(question: schemas.PolicyQuestion):
    results = await asyncio.to_thread(policy_engine.query_policies, question.question, 5)
    context = "\n---\n".join(results['documents'][0])
    
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    prompt = f"""
    Answer the following question based ONLY on the provided Northwind Logistics policy snippets.
    If the answer is not in the snippets, say "I'm sorry, but I don't have information on that in the policy library."
    Do not fabricate information.
    Cite your sources (e.g., TEP-001).

    POLICY SNIPPETS:
    {context}

    QUESTION: {question.question}
    """
    
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    
    citations = []
    for i in range(len(results['documents'][0])):
        citations.append({
            "source": results['metadatas'][0][i]['source'],
            "text": results['documents'][0][i][:200] + "..."
        })

    return {
        "answer": response.choices[0].message.content,
        "citations": citations
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
