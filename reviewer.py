import os
from openai import AsyncOpenAI
from policy_engine import query_policies
import json
from dotenv import load_dotenv
import time
import asyncio

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def review_line_item(employee_data, trip_context, receipt_data):
    """
    Reviews a single line item against company policies.
    """
    # 1. Retrieve relevant policies (offload blocking query to thread)
    query_text = f"Policy for {receipt_data.get('category')} {receipt_data.get('vendor')} {receipt_data.get('description')}"
    policy_results = await asyncio.to_thread(query_policies, query_text, 4)
    
    context_docs = "\n---\n".join(policy_results['documents'][0])
    
    # 2. Prepare the prompt
    prompt = f"""
    You are an expert corporate expense auditor for Northwind Logistics.
    Review the following expense line item against the provided company policies.

    EMPLOYEE CONTEXT:
    - Name: {employee_data['name']}
    - Grade: {employee_data['grade']}
    - Title: {employee_data['title']}
    - Home Base: {employee_data['home_base']}

    TRIP CONTEXT:
    - Purpose: {trip_context['purpose']}
    - Dates: {trip_context['dates']}
    - Destination: {trip_context.get('destination', 'Unknown')}

    RECEIPT DATA:
    {json.dumps(receipt_data, indent=2)}

    RELEVANT POLICY SECTIONS:
    {context_docs}

    INSTRUCTIONS:
    1. Determine if the expense is Compliant, Flagged, or Rejected.
    2. Provide a detailed reasoning for your verdict.
    3. Cite the specific policy clauses (e.g., TEP-002 §2.1) and provide the exact quote from the policy that supports your verdict.
    4. Assign a confidence score (0.0 to 1.0) for your analysis.
    5. If the policy is ambiguous or missing information, mark as Flagged and explain what is needed.
    6. Be strict but fair.

    Return the result as a JSON object with the following structure:
    {{
        "verdict": "Compliant" | "Flagged" | "Rejected",
        "reasoning": "...",
        "policy_citations": [
            {{"clause": "TEP-XXX §X.X", "quote": "..."}}
        ],
        "confidence": 0.95
    }}
    """

    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a strict and accurate expense auditor."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            if "rate_limit_exceeded" in str(e) and attempt < max_retries - 1:
                await asyncio.sleep(2 ** (attempt + 1))
                continue
            raise e
