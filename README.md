# Northwind Logistics - AI Expense Review System

This system automates the pre-review of employee expenses by comparing receipts against company policies using a high-performance RAG (Retrieval-Augmented Generation) architecture.

## Architecture

The system is built with a decoupled frontend and backend, optimized for speed and auditability.

```text
[ Finance Reviewer ] <--> [ React Frontend (Vite) ]
                                  |
                                  v
                        [ FastAPI Backend ]
                                  |
        +-------------------------+-------------------------+
        |                         |                         |
        v                         v                         v
[ SQLite (SQLAlchemy) ]   [ ChromaDB (Vector) ]    [ OpenAI API (GPT-4o-mini) ]
(Submissions & Overrides) (Policy Library Index)   (Extraction & Auditing)
```

### The Workflow
1.  **Ingestion**: Policies are parsed, chunked by paragraph, and indexed into ChromaDB using OpenAI embeddings.
2.  **Parallel Extraction**: When a user uploads receipts, the backend processes them in parallel. GPT-4o-mini extracts structured data (vendor, amount, category, etc.) from PDFs, images, and text.
3.  **Contextual Retrieval**: For each receipt, the system queries ChromaDB for the most relevant policy clauses based on the expense category.
4.  **AI Audit**: The auditor combines employee context, trip purpose, and policy snippets to generate a verdict (Compliant, Flagged, or Rejected) with reasoning and exact quotes.
5.  **Human Review**: Verdicts are presented in the UI, where a human can override them with auditable comments.

## Design Choices & Tradeoffs

### Model Selection: The "Mini" Advantage
Initially, I used GPT-4o for everything. However, I found that for high-volume receipt extraction and policy chat, it was both slower and more prone to rate limits. I switched to **GPT-4o-mini** for these tasks. It provides near-instant responses and handles the "messiness" of receipts (like rotated images or complex tables) with surprising accuracy, while keeping costs extremely low.

### Retrieval vs. Long Context
While the policy library is small (~100 pages), I chose a **RAG approach with ChromaDB** instead of feeding the whole library into every prompt. This ensures the system remains fast as the policy library grows and, more importantly, allows us to provide **precise citations** (exact quotes) which are critical for trust and auditability.

### Flagging vs. Rejecting
The system is designed to be a "pre-reviewer." I set the threshold for "Compliant" high. If there is any ambiguity (e.g., a missing itemized receipt for a meal or a potential solo-travel alcohol violation), the system is instructed to **Flag** the item. This draws the human reviewer's eye to the problem without making a final, potentially incorrect, rejection.

### Performance Optimization
To solve the "stuck" processing issue, I implemented:
- **Asynchronous I/O**: Using `asyncio` and `aiofiles` to handle file uploads and AI requests without blocking.
- **Parallel Processing**: Processing all receipts in a submission simultaneously.
- **Concurrency Control**: Using semaphores to prevent hitting OpenAI's TPM (Tokens Per Minute) limits during parallel bursts.

## Cost & Scaling

### Rough Cost per Submission
- **Extraction & Chat**: ~$0.002 per receipt (GPT-4o-mini).
- **Auditing**: ~$0.01 per line item (GPT-4o-mini + RAG context).
- **Total**: A typical 5-receipt submission costs roughly **$0.06**.

### Scaling to 10,000 Submissions/Day
1.  **Background Workers**: Move the AI processing logic to a task queue like **Celery with Redis**. This would allow the API to return immediately while the "heavy lifting" happens in the background.
2.  **Database**: Swap SQLite for a managed **PostgreSQL** instance to handle concurrent writes and larger datasets.
3.  **Batch API**: For non-urgent submissions, use OpenAI's Batch API to reduce costs by another 50%.

## Evaluation Harness

The `eval_harness.py` script is designed to measure the system's performance against known outcomes.

### Metrics Chosen
- **Verdict Accuracy**: Percentage of AI verdicts that match the expected "Compliant/Flagged/Rejected" status.
- **Citation Quality**: Verifies that every verdict is supported by a non-empty policy clause and quote.
- **Refusal Rate**: Ensures the system correctly refuses out-of-scope questions (e.g., "What is the meaning of life?") instead of fabricating answers.

## Next Steps
- **Duplicate Detection**: Use image hashing to flag if the same receipt is uploaded twice.
- **Manager Workflow**: Add a portal for managers to approve their team's expenses before they reach Finance.
- **Fine-tuning**: As human reviewers provide overrides, we can use that data to fine-tune a model to better match Northwind's specific cultural nuances.

---

## Setup & Running

### 1. Prerequisites
- Python 3.10+
- Node.js & npm
- OpenAI API Key

### 2. Installation
```bash
pip install -r requirements.txt
cd frontend && npm install
```

### 3. Configuration
Add your `OPENAI_API_KEY` to the `.env` file in the root directory.

### 4. Initialize & Run
```bash
# Terminal 1: Backend
python seed_db.py
python policy_engine.py
python main.py

# Terminal 2: Frontend
cd frontend
npm run dev
```
Access the UI at `http://localhost:5173`.
