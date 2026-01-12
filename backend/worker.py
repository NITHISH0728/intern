# worker.py
import os
import requests
import base64
from celery_config import celery_app
from dotenv import load_dotenv

load_dotenv()

# ✅ 1. LOAD CONFIGURATION FROM YOUR ENV
# We use the exact names from your .env file
API_KEY = os.getenv("JUDGE0_API_KEY")
API_HOST = os.getenv("JUDGE0_API_HOST", "judge0-ce.p.rapidapi.com")

# --- Helper Functions for Base64 (Required by Judge0) ---
def encode_b64(text):
    if not text: return ""
    return base64.b64encode(text.encode('utf-8')).decode('utf-8')

def decode_b64(text):
    if not text: return ""
    try:
        return base64.b64decode(text).decode('utf-8')
    except:
        return text

@celery_app.task(name="worker.run_code_task", bind=True)
def run_code_task(self, source_code, language_id, stdin):
    """
    Executes code remotely using Judge0 API (via RapidAPI).
    This keeps your server CPU load near 0% and prevents crashes.
    """
    
    # 1. Validation
    if not API_KEY:
        return {"status": "error", "output": "Server Config Error: JUDGE0_API_KEY is missing."}

    url = f"https://{API_HOST}/submissions"

    # 2. Prepare the Request
    # We use base64_encoded=true to handle special characters safely
    querystring = {"base64_encoded": "true", "wait": "true"}
    
    payload = {
        "source_code": encode_b64(source_code),
        "language_id": language_id,
        "stdin": encode_b64(stdin)
    }
    
    headers = {
        "content-type": "application/json",
        "Content-Type": "application/json",
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": API_HOST
    }

    try:
        # 3. Send Code to Judge0 Cloud
        response = requests.post(url, json=payload, headers=headers, params=querystring, timeout=10)
        
        # 4. Handle Network/API Errors
        if response.status_code not in [200, 201]:
            return {"status": "error", "output": f"Judge0 API Error ({response.status_code}): {response.text}"}

        data = response.json()

        # 5. Process the Result
        output = ""
        # Judge0 status IDs: 3=Accepted, 6=Compilation Error, 11=Runtime Error
        status_id = data.get("status", {}).get("id", 0)

        # Success (ID 3)
        if status_id == 3:
            output = decode_b64(data.get("stdout"))
        
        # Compilation Error (ID 6)
        elif status_id == 6:
            output = "❌ Compilation Error:\n" + decode_b64(data.get("compile_output"))
        
        # Runtime Error or Time Limit Exceeded
        else:
            err = decode_b64(data.get("stderr")) or decode_b64(data.get("message"))
            status_desc = data.get("status", {}).get("description", "Error")
            output = f"❌ {status_desc}:\n{err}"

        # 6. Return strictly structured data for Frontend
        return {
            "status": "success" if status_id == 3 else "completed_with_error",
            "output": output if output else "Execution finished with no output."
        }

    except requests.exceptions.Timeout:
        return {"status": "error", "output": "⚠️ Time Limit Exceeded: The external compiler took too long."}
    
    except Exception as e:
        return {"status": "error", "output": f"System Error: {str(e)}"}