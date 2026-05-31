import os
import base64
from openai import AsyncOpenAI
from dotenv import load_dotenv
import pypdf
import json
import asyncio

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

async def extract_receipt_data(file_path):
    """
    Extracts structured data from a receipt file (PDF, Image, or Text).
    Returns a dictionary with category, amount, currency, date, vendor, and description.
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    prompt = """
    Extract the following information from this receipt. 
    Return a JSON object with these exact keys:
    {
        "category": "Meal" | "Airfare" | "Lodging" | "Ground Transportation" | "Other",
        "total_amount": float,
        "currency": "USD",
        "date": "YYYY-MM-DD",
        "vendor": "string",
        "description": "string",
        "is_itemized": boolean,
        "contains_alcohol": boolean
    }
    """

    if ext in [".jpg", ".jpeg", ".png"]:
        base64_image = encode_image(file_path)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        },
                    ],
                }
            ],
            response_format={"type": "json_object"}
        )
    elif ext == ".pdf":
        def get_pdf_text():
            reader = pypdf.PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        
        text = await asyncio.to_thread(get_pdf_text)
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a receipt processing assistant."},
                {"role": "user", "content": f"{prompt}\n\nReceipt Text:\n{text}"}
            ],
            response_format={"type": "json_object"}
        )
    elif ext == ".txt":
        with open(file_path, "r") as f:
            text = f.read()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a receipt processing assistant."},
                {"role": "user", "content": f"{prompt}\n\nReceipt Text:\n{text}"}
            ],
            response_format={"type": "json_object"}
        )
    else:
        raise ValueError(f"Unsupported file format: {ext}")

    return json.loads(response.choices[0].message.content)
