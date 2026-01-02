import requests
import os
import sys
from celery_config import celery_app
from dotenv import load_dotenv

load_dotenv()

@celery_app.task(name="worker.run_code_task", bind=True)
def run_code_task(self, source_code, language_id, stdin):
    # 1. Prepare Judge0 API Data
    url = f"https://{os.getenv('JUDGE0_API_HOST')}/submissions?base64_encoded=false&wait=true"
    
    payload = { 
        "source_code": source_code, 
        "language_id": language_id, 
        "stdin": stdin 
    }
    
    headers = { 
        "content-type": "application/json", 
        "X-RapidAPI-Key": os.getenv("JUDGE0_API_KEY"), 
        "X-RapidAPI-Host": os.getenv("JUDGE0_API_HOST") 
    }

    try:
        # 2. Call Judge0 (Done in background now)
        response = requests.post(url, json=payload, headers=headers)
        result = response.json()

        output = result.get("stdout") or result.get("stderr") or result.get("compile_output") or "No output"
        status_id = result.get("status", {}).get("id", 0)
        
        if status_id == 3:
            return {"status": "success", "output": output}
        else:
            return {"status": "error", "output": output}

    except Exception as e:
        return {"status": "error", "output": f"Judge0 Error: {str(e)}"}