# worker.py
import os
import requests
import base64
import json
from celery_config import celery_app
from dotenv import load_dotenv

load_dotenv()

# ✅ LOAD CONFIGURATION
API_KEY = os.getenv("JUDGE0_API_KEY")
API_HOST = os.getenv("JUDGE0_API_HOST", "judge0-ce.p.rapidapi.com")

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
def run_code_task(self, source_code, language_id, test_cases_json):
    
    if not API_KEY:
        return {"status": "error", "output": "Server Config Error: JUDGE0_API_KEY is missing."}

    final_source_code = source_code
    
    if language_id == 71: # Python
        # 🔥 SMART DRIVER: Finds the user's function automatically
        driver_template = f"""
import sys
import json
import time
import inspect

# --- USER CODE START ---
{source_code}
# --- USER CODE END ---

def get_user_function():
    # Get all functions in the global scope
    # Filter out system imports and our own driver functions
    all_funcs = [
        obj for name, obj in globals().items() 
        if inspect.isfunction(obj) 
        and name not in ['get_user_function', 'run_tests', 'encode_b64', 'decode_b64']
        and obj.__module__ == '__main__'
    ]
    
    # Return the last defined function (most likely the user's solution)
    if all_funcs:
        return all_funcs[-1]
    return None

def run_tests():
    test_cases = {test_cases_json}
    results = []
    
    # 1. FIND USER FUNCTION DYNAMICALLY
    user_func = get_user_function()
    
    if not user_func:
        print("---JSON_START---")
        print(json.dumps({{"stats": {{"total": 0, "passed": 0, "runtime_ms": 0}}, "results": [], "error": "No function found. Please define a function."}}))
        print("---JSON_END---")
        return

    start_total = time.time()
    
    for i, case in enumerate(test_cases):
        inp = case.get("input")
        expected = case.get("output")
        
        try:
            # 2. CALL THE DISCOVERED FUNCTION
            # Note: We assume single argument input for simplicity in this version.
            # If input is meant to be multiple args (e.g. "1, 2"), parsing logic would go here.
            
            # Auto-convert input type if possible (naive check)
            if isinstance(inp, str) and inp.isdigit():
                inp = int(inp)
            
            actual = user_func(inp)
            
            # Equality Check
            passed = str(actual).strip() == str(expected).strip()
            
            results.append({{
                "id": i,
                "status": "Passed" if passed else "Failed",
                "input": str(inp),
                "expected": str(expected),
                "actual": str(actual)
            }})
            
        except Exception as e:
            results.append({{"id": i, "status": "Runtime Error", "error": str(e), "input": str(inp)}})
            
    end_total = time.time()
    
    # FINAL REPORT
    report = {{
        "stats": {{
            "total": len(test_cases),
            "passed": len([r for r in results if r["status"] == "Passed"]),
            "runtime_ms": round((end_total - start_total) * 1000, 2)
        }},
        "results": results
    }}
    
    print("---JSON_START---")
    print(json.dumps(report))
    print("---JSON_END---")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"Driver Error: {{e}}")
"""
        final_source_code = driver_template

    # 2. SEND TO JUDGE0 (Same as before)
    url = f"https://{API_HOST}/submissions"
    querystring = {"base64_encoded": "true", "wait": "true"}
    
    payload = {
        "source_code": encode_b64(final_source_code),
        "language_id": language_id,
        "stdin": "" 
    }
    
    headers = {
        "content-type": "application/json",
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": API_HOST
    }

    try:
        response = requests.post(url, json=payload, headers=headers, params=querystring, timeout=10)
        data = response.json()
        
        status_id = data.get("status", {}).get("id", 0)
        
        if status_id == 3: # Accepted
            raw_output = decode_b64(data.get("stdout"))
            if "---JSON_START---" in raw_output:
                json_str = raw_output.split("---JSON_START---")[1].split("---JSON_END---")[0]
                return {"status": "success", "data": json.loads(json_str)}
            else:
                return {"status": "error", "output": raw_output}
                
        elif status_id == 6: # Compilation Error
            return {"status": "compilation_error", "output": decode_b64(data.get("compile_output"))}
            
        else: # Runtime Error
            return {"status": "runtime_error", "output": decode_b64(data.get("stderr")) or data.get("status", {}).get("description")}

    except Exception as e:
        return {"status": "system_error", "output": str(e)}