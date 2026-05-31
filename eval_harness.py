import os
import json
import requests
import time
import argparse

BASE_URL = "http://localhost:8000"

def run_eval(expected_file=None):
    print("Starting Evaluation Harness...")
    
    expected_data = {}
    if expected_file and os.path.exists(expected_file):
        with open(expected_file, "r") as f:
            expected_data = json.load(f)
        print(f"Loaded expected outcomes from {expected_file}")

    submissions_dir = "submissions"
    results = []
    
    metrics = {
        "total_items": 0,
        "correct_verdicts": 0,
        "total_citations": 0,
        "valid_citations": 0,
        "refusals": 0,
        "out_of_scope_queries": 0
    }

    try:
        employees = requests.get(f"{BASE_URL}/employees").json()
    except Exception as e:
        print(f"Error connecting to backend: {e}")
        print("Make sure the FastAPI server is running at http://localhost:8000")
        return

    for folder in sorted(os.listdir(submissions_dir)):
        folder_path = os.path.join(submissions_dir, folder)
        if not os.path.isdir(folder_path):
            continue
            
        print(f"\nProcessing submission: {folder}")
        
        with open(os.path.join(folder_path, "employee_info.json"), "r") as f:
            emp_info = json.load(f)
        
        receipts_dir = os.path.join(folder_path, "receipts")
        files = []
        receipt_names = sorted(os.listdir(receipts_dir))
        for receipt in receipt_names:
            file_path = os.path.join(receipts_dir, receipt)
            files.append(("files", (receipt, open(file_path, "rb"))))
            
        data = {
            "employee_id": emp_info["employee_id"],
            "trip_purpose": emp_info["trip_purpose"],
            "trip_start_date": emp_info["trip_dates"].split(" to ")[0],
            "trip_end_date": emp_info["trip_dates"].split(" to ")[1]
        }
        
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/submissions", data=data, files=files)
        end_time = time.time()
        
        if response.status_code == 200:
            submission = response.json()
            print(f"Successfully processed {len(submission['line_items'])} items in {end_time - start_time:.2f}s")
            
            for i, item in enumerate(submission['line_items']):
                metrics["total_items"] += 1
                verdict = item['verdict']
                vendor = item['vendor']
                
                # Check against expected if available
                if folder in expected_data and i < len(expected_data[folder]):
                    expected = expected_data[folder][i]
                    if verdict.lower() == expected['verdict'].lower():
                        metrics["correct_verdicts"] += 1
                
                # Check citations (basic check: do they exist and have content)
                if item['policy_citations']:
                    metrics["total_citations"] += len(item['policy_citations'])
                    for cit in item['policy_citations']:
                        if cit.get('clause') and cit.get('quote'):
                            metrics["valid_citations"] += 1

                print(f"  - {vendor}: {verdict} ({item['confidence']:.2f})")
            
            results.append({
                "folder": folder,
                "status": "success",
                "item_count": len(submission['line_items']),
                "duration": end_time - start_time
            })
        else:
            print(f"Failed to process {folder}: {response.text}")

    # Test Policy Chat Refusal
    print("\nTesting Policy Chat Refusal...")
    out_of_scope_q = "What is the meaning of life?"
    chat_res = requests.post(f"{BASE_URL}/policy/chat", json={"question": out_of_scope_q}).json()
    metrics["out_of_scope_queries"] += 1
    if "I'm sorry" in chat_res['answer'] or "don't have information" in chat_res['answer']:
        metrics["refusals"] += 1
        print(f"  - Out-of-scope query correctly refused.")
    else:
        print(f"  - Out-of-scope query NOT refused: {chat_res['answer'][:50]}...")

    print("\n" + "="*30)
    print("EVALUATION SUMMARY")
    print("="*30)
    if metrics["total_items"] > 0:
        if expected_data:
            print(f"Verdict Accuracy: {metrics['correct_verdicts']/metrics['total_items']:.2%}")
        print(f"Citation Quality: {metrics['valid_citations']/max(1, metrics['total_citations']):.2%}")
    print(f"Refusal Rate: {metrics['refusals']/max(1, metrics['out_of_scope_queries']):.2%}")
    print(f"Total Items Processed: {metrics['total_items']}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--expected", help="Path to JSON file with expected outcomes")
    args = parser.parse_args()
    run_eval(args.expected)
