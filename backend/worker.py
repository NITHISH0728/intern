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
        "Content-Type": "application/json",
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": API_HOST
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, params=querystring, timeout=10)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

@celery_app.task(name="worker.run_code_task", bind=True)
def run_code_task(self, source_code, language_id, input_data, mode="single"):
    """
    Universal Task: Handles both Single execution and Batch (LeetCode) execution.
    """
    
    if not API_KEY:
        return {"status": "error", "output": "Server Config Error: JUDGE0_API_KEY is missing."}

    # =========================================================
    # 🟢 CASE 1: SINGLE EXECUTION (Code Arena / Standard Lessons)
    # =========================================================
    if mode == "single":
        # Run once, return simple output string
        data = execute_judge0(source_code, language_id, input_data)
        
        status_id = data.get("status", {}).get("id", 0)
        output = ""

        if status_id == 3: # Accepted
            output = decode_b64(data.get("stdout"))
        elif status_id == 6: # Compilation Error
            output = "❌ Compilation Error:\n" + decode_b64(data.get("compile_output"))
        else: # Runtime Error
            output = decode_b64(data.get("stderr")) or decode_b64(data.get("message"))
            
        return {
            "status": "success" if status_id == 3 else "completed_with_error", 
            "output": output if output else "Execution finished with no output."
        }

    # =========================================================
    # 🔵 CASE 2: BATCH EXECUTION (Coding Course / LeetCode)
    # =========================================================
    elif mode == "batch":
        test_cases = []
        try:
            if isinstance(input_data, str):
                test_cases = json.loads(input_data)
            else:
                test_cases = input_data
        except:
            return {"status": "error", "output": "Invalid Test Cases JSON Format"}

        results = []
        total_start = time.time()
        
        # --- STRATEGY A: PYTHON (Driver Injection - Fast) ---
        if language_id == 71: 
            driver_template = f"""
import sys
import json
import time
import inspect

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
    test_cases = {json.dumps(test_cases)} 
    results = []
    
    user_func = get_user_function()
    
    if not user_func:
        print("---JSON_START---")
        print(json.dumps({{"stats": {{"total": 0, "passed": 0}}, "error": "No function found. Please define a function."}}))
        print("---JSON_END---")
        return

    start_total = time.time()
    
    for i, case in enumerate(test_cases):
        inp = case.get("input")
        expected = case.get("output")
        
        try:
            # Basic Type Conversion (String to Int/Float if needed)
            arg = inp
            if isinstance(inp, str):
                if inp.isdigit(): arg = int(inp)
                elif inp.replace('.', '', 1).isdigit(): arg = float(inp)
            
            actual = user_func(arg)
            passed = str(actual).strip() == str(expected).strip()
            
            results.append({{
                "id": i,
                "status": "Passed" if passed else "Failed",
                "input": str(inp),
                "expected": str(expected),
                "actual": str(actual)
            }})
        except Exception as e:
            results.append({{"id": i, "status": "Runtime Error", "error": str(e), "input": str(inp), "expected": str(expected), "actual": "Error"}})
            
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
            # Run the Python Driver once
            data = execute_judge0(driver_template, language_id, "")
            
            status_id = data.get("status", {}).get("id", 0)
            
            if status_id == 3:
                raw_output = decode_b64(data.get("stdout"))
                if "---JSON_START---" in raw_output:
                    try:
                        json_str = raw_output.split("---JSON_START---")[1].split("---JSON_END---")[0]
                        return {"status": "success", "data": json.loads(json_str)}
                    except:
                        return {"status": "error", "output": "Failed to parse driver output."}
                return {"status": "error", "output": raw_output}
            elif status_id == 6:
                return {"status": "success", "data": {"error": "Compilation Error:\n" + decode_b64(data.get("compile_output")), "stats": {"passed":0, "total": len(test_cases)}, "results": []}}
            else:
                return {"status": "success", "data": {"error": "Runtime Error:\n" + decode_b64(data.get("stderr")), "stats": {"passed":0, "total": len(test_cases)}, "results": []}}

        # --- STRATEGY B: JAVA / C++ / JS (Loop Execution) ---
        else: 
            passed_count = 0
            
            for i, case in enumerate(test_cases):
                inp = case.get("input")
                expected = str(case.get("output")).strip()
                
                # Execute individual test case
                data = execute_judge0(source_code, language_id, inp)
                
                status_id = data.get("status", {}).get("id", 0)
                
                if status_id == 3: # Accepted
                    actual = decode_b64(data.get("stdout")).strip()
                    passed = actual == expected
                    if passed: passed_count += 1
                    
                    results.append({
                        "id": i,
                        "status": "Passed" if passed else "Failed",
                        "input": inp,
                        "expected": expected,
                        "actual": actual
                    })
                
                elif status_id == 6: # Compilation Error
                    # Fail fast on compilation error
                    err = decode_b64(data.get("compile_output"))
                    return {"status": "success", "data": {"error": f"Compilation Error:\n{err}", "stats": {"passed": 0, "total": len(test_cases)}, "results": []}}
                
                else: # Runtime Error
                    err_msg = decode_b64(data.get("stderr")) or data.get("status", {}).get("description")
                    results.append({
                        "id": i,
                        "status": "Runtime Error",
                        "error": err_msg,
                        "input": inp,
                        "expected": expected,
                        "actual": "Error"
                    })

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
    try:
        # Assuming backup_manager is imported correctly
        backup_manager.run_backup_routine() # Or whatever your backup entry point is
        return "Backup Completed"
    except Exception as e:
        return f"Backup Failed: {str(e)}"