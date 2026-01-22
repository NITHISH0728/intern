# worker.py
import os
import requests
import base64
import json
import time
from celery_config import celery_app
from dotenv import load_dotenv
import backup_manager
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

def execute_judge0(source_code, language_id, stdin):
    """
    Helper to run a single execution on Judge0
    """
    url = f"https://{API_HOST}/submissions"
    querystring = {"base64_encoded": "true", "wait": "true"}
    
    payload = {
        "source_code": encode_b64(source_code),
        "language_id": language_id,
        "stdin": encode_b64(stdin)
    }
    
    headers = {
        "content-type": "application/json",
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": API_HOST
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, params=querystring, timeout=10)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

@celery_app.task(name="worker.run_code_task", bind=True)
def run_code_task(self, source_code, language_id, test_cases_json):
    
    if not API_KEY:
        return {"status": "error", "output": "Server Config Error: JUDGE0_API_KEY is missing."}

    # Parse Test Cases
    try:
        if isinstance(test_cases_json, str):
            test_cases = json.loads(test_cases_json)
        else:
            test_cases = test_cases_json
    except:
        return {"status": "error", "output": "Invalid Test Cases Format"}

    results = []
    total_start = time.time()
    
    # ---------------------------------------------------------
    # STRATEGY 1: PYTHON (Smart Driver Injection)
    # ---------------------------------------------------------
    if language_id == 71: 
        driver_template = f"""
import sys
import json
import time
import inspect
import io

# --- USER CODE START ---
{source_code}
# --- USER CODE END ---

def get_user_function():
    all_funcs = [
        obj for name, obj in globals().items() 
        if inspect.isfunction(obj) 
        and name not in ['get_user_function', 'run_tests', 'encode_b64', 'decode_b64']
        and obj.__module__ == '__main__'
    ]
    if all_funcs: return all_funcs[-1]
    return None

def run_tests():
    test_cases = {test_cases} 
    results = []
    
    user_func = get_user_function()
    
    if not user_func:
        print("---JSON_START---")
        print(json.dumps({{"stats": {{"total": 0, "passed": 0}}, "error": "No function found."}}))
        print("---JSON_END---")
        return

    start_total = time.time()
    
    for i, case in enumerate(test_cases):
        inp = case.get("input")
        expected = str(case.get("output")).strip()
        
        # 1. SETUP PRINT CAPTURE
        capture = io.StringIO()
        original_stdout = sys.stdout
        sys.stdout = capture
        
        try:
            # 2. SMART ARGUMENT UNPACKING
            actual = None
            
            # If input is a list [1, 2], try unpacking to func(1, 2)
            if isinstance(inp, list):
                try:
                    actual = user_func(*inp)
                except TypeError:
                    # If function expects a single list argument, pass as is
                    actual = user_func(inp)
            else:
                # Single value input
                actual = user_func(inp)
            
            # 3. HANDLE PRINT vs RETURN
            # Restore stdout to read what was printed
            sys.stdout = original_stdout
            printed_output = capture.getvalue().strip()
            
            # If function returned None but printed something, use the print output
            if actual is None and printed_output:
                actual = printed_output
            
            # Convert to string for comparison
            actual_str = str(actual).strip()
            
            passed = actual_str == expected
            
            results.append({{
                "id": i,
                "status": "Passed" if passed else "Failed",
                "input": str(inp),
                "expected": expected,
                "actual": actual_str
            }})
            
        except Exception as e:
            sys.stdout = original_stdout # Ensure stdout is reset on error
            results.append({{"id": i, "status": "Runtime Error", "error": str(e), "input": str(inp)}})
            
    end_total = time.time()
    
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
    try: run_tests()
    except Exception as e: print(f"Driver Error: {{e}}")
"""
        # Run Python Driver
        data = execute_judge0(driver_template, language_id, "")
        
        # Parse Python Result
        status_id = data.get("status", {}).get("id", 0)
        if status_id == 3:
            raw_output = decode_b64(data.get("stdout"))
            if "---JSON_START---" in raw_output:
                json_str = raw_output.split("---JSON_START---")[1].split("---JSON_END---")[0]
                return {"status": "success", "data": json.loads(json_str)}
            return {"status": "error", "output": raw_output}
        elif status_id == 6:
            return {"status": "compilation_error", "output": decode_b64(data.get("compile_output"))}
        else:
            return {"status": "runtime_error", "output": decode_b64(data.get("stderr"))}

    # ---------------------------------------------------------
    # STRATEGY 2: JAVA / C++ (Standard IO Loop)
    # ---------------------------------------------------------
    else: 
        passed_count = 0
        for i, case in enumerate(test_cases):
            inp = case.get("input")
            expected = str(case.get("output")).strip()
            
            # For Java/C++, input MUST be string. 
            # If it's a list like [1, 2], convert to space-separated string "1 2"
            if isinstance(inp, list):
                stdin_input = " ".join(map(str, inp))
            else:
                stdin_input = str(inp)

            data = execute_judge0(source_code, language_id, stdin_input)
            
            status_id = data.get("status", {}).get("id", 0)
            
            if status_id == 3: # Accepted
                actual = decode_b64(data.get("stdout")).strip()
                passed = actual == expected
                if passed: passed_count += 1
                results.append({ "id": i, "status": "Passed" if passed else "Failed", "input": stdin_input, "expected": expected, "actual": actual })
            
            elif status_id == 6: 
                return {"status": "compilation_error", "output": decode_b64(data.get("compile_output"))}
            
            else: 
                err_msg = decode_b64(data.get("stderr")) or data.get("status", {}).get("description")
                results.append({ "id": i, "status": "Runtime Error", "error": err_msg, "input": stdin_input })

        total_end = time.time()
        report = {
            "stats": {
                "total": len(test_cases),
                "passed": passed_count,
                "runtime_ms": round((total_end - total_start) * 1000, 2)
            },
            "results": results
        }
        return {"status": "success", "data": report}
    
    
@celery_app.task(name="worker.run_backup_task")
def run_backup_task():
    print("Executing Daily Backup...")
    
    # Run the backup logic
    try:
        # Option 1: Run via command line (safest to ensure independent execution)
        os.system("python backup_manager.py")
        return "Backup Completed"
    except Exception as e:
        return f"Backup Failed: {str(e)}"    