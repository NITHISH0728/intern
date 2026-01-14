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
    """
    LeetCode-Style Batch Executor.
    Accepts: 
      - source_code: The user's function (e.g., def solve()...)
      - language_id: 71 (Python), 62 (Java), etc.
      - test_cases_json: A JSON string or list of inputs/outputs to validate against.
    
    Returns:
      - A structured JSON report of which tests passed/failed.
    """
    
    if not API_KEY:
        return {"status": "error", "output": "Server Config Error: JUDGE0_API_KEY is missing."}

    # 1. GENERATE DRIVER CODE (The "Wrapper")
    # This logic wraps the user's code to run against ALL test cases in one go.
    # Currently implementing for PYTHON (ID 71). You can expand for others later.
    
    final_source_code = source_code
    
    if language_id == 71: # Python
        # We inject a script that:
        # 1. Imports json/sys
        # 2. Defines the user's function
        # 3. Loops through test cases
        # 4. Prints a JSON report at the end
        
        driver_template = f"""
import sys
import json
import time

# --- USER CODE START ---
{source_code}
# --- USER CODE END ---

def run_tests():
    test_cases = {test_cases_json}
    results = []
    
    start_total = time.time()
    
    for i, case in enumerate(test_cases):
        inp = case.get("input")
        expected = case.get("output")
        
        # Capture stdout to prevent user print() from breaking our JSON report
        # (In a real pro environment, we'd redirect stdout, but for now we ignore it)
        
        start_case = time.time()
        try:
            # ⚠️ ASSUMPTION: User must define a function named 'solution' or similar.
            # For simplicity in this v1, we assume the user code runs procedurally 
            # or we call a specific function if we enforce a signature.
            
            # For this "LeetCode Lite" version, we will assume the user code
            # defines a function named 'solve' that takes the input.
            
            if 'solve' not in globals():
                results.append({{"id": i, "status": "Error", "error": "Function 'solve' not found"}})
                continue
                
            actual = solve(inp)
            
            # Simple equality check (can be improved for arrays/floats)
            passed = str(actual).strip() == str(expected).strip()
            
            results.append({{
                "id": i,
                "status": "Passed" if passed else "Failed",
                "input": inp,
                "expected": expected,
                "actual": actual
            }})
            
        except Exception as e:
            results.append({{"id": i, "status": "Runtime Error", "error": str(e)}})
            
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
    
    # We print ONLY the JSON report to stdout so the worker can parse it
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

    # 2. SEND TO JUDGE0
    url = f"https://{API_HOST}/submissions"
    querystring = {"base64_encoded": "true", "wait": "true"}
    
    payload = {
        "source_code": encode_b64(final_source_code),
        "language_id": language_id,
        "stdin": "" # We baked inputs into the source code!
    }
    
    headers = {
        "content-type": "application/json",
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": API_HOST
    }

    try:
        response = requests.post(url, json=payload, headers=headers, params=querystring, timeout=10)
        data = response.json()
        
        # 3. PARSE RESULTS
        status_id = data.get("status", {}).get("id", 0)
        
        if status_id == 3: # Accepted
            raw_output = decode_b64(data.get("stdout"))
            
            # Extract our JSON report
            if "---JSON_START---" in raw_output:
                json_str = raw_output.split("---JSON_START---")[1].split("---JSON_END---")[0]
                return {"status": "success", "data": json.loads(json_str)}
            else:
                # Fallback if user print() messed up the output
                return {"status": "error", "output": raw_output}
                
        elif status_id == 6: # Compilation Error
            return {"status": "compilation_error", "output": decode_b64(data.get("compile_output"))}
            
        else: # Runtime Error / TLE
            return {"status": "runtime_error", "output": decode_b64(data.get("stderr")) or data.get("status", {}).get("description")}

    except Exception as e:
        return {"status": "system_error", "output": str(e)}