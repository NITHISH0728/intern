# worker.py
import subprocess
import os
import uuid
import sys  # 👈 Added sys import
from celery_config import celery_app
from dotenv import load_dotenv

load_dotenv()

# Map your Frontend Language IDs to terminal commands
# 71: Python, 63: Node.js, 54: C++, 62: Java
LANGUAGE_CONFIG = {
    71: {
        "extension": ".py",
        # 🟢 FIX: Use sys.executable. 
        # This forces the worker to use the currently running Python (e.g., inside your venv)
        # instead of the system 'python3' command which triggers the Windows Store error.
        "command": [sys.executable] 
    },
    63: {
        "extension": ".js",
        "command": ["node"]
    },
    54: {
        "extension": ".cpp",
        "compile": ["g++", "-o", "output_binary"],
        "run": ["./output_binary"]
    }
}

@celery_app.task(name="worker.run_code_task", bind=True)
def run_code_task(self, source_code, language_id, stdin):
    """
    Executes code locally using subprocess.
    """
    
    # 1. Validation
    if language_id not in LANGUAGE_CONFIG:
        return {"status": "error", "output": "Language not supported yet."}
    
    config = LANGUAGE_CONFIG[language_id]
    
    # 2. Create a temporary file
    unique_id = str(uuid.uuid4())
    filename = f"temp_{unique_id}{config['extension']}"
    
    try:
        # Write code to disk
        with open(filename, "w", encoding="utf-8") as f:
            f.write(source_code)
            
        # 3. Execution Logic
        # Python & Node
        if language_id in [71, 63]:
            command = config["command"] + [filename]
            
            process = subprocess.run(
                command,
                input=stdin, 
                capture_output=True,
                text=True,
                timeout=5
            )
            
            output = process.stdout if process.returncode == 0 else process.stderr

        # C++
        elif language_id == 54:
            # A. Compile
            compile_cmd = config["compile"] + [filename]
            compile_proc = subprocess.run(compile_cmd, capture_output=True, text=True)
            
            if compile_proc.returncode != 0:
                output = f"Compilation Error:\n{compile_proc.stderr}"
            else:
                # B. Run
                # On Windows, ./output_binary might fail. We check OS.
                run_cmd = config["run"]
                if os.name == 'nt': # If Windows
                    run_cmd = ["output_binary.exe"]

                run_proc = subprocess.run(
                    run_cmd, 
                    input=stdin, 
                    capture_output=True, 
                    text=True, 
                    timeout=3
                )
                output = run_proc.stdout if run_proc.returncode == 0 else run_proc.stderr
                
                # Cleanup binary
                if os.path.exists("output_binary.exe"): os.remove("output_binary.exe")
                if os.path.exists("output_binary"): os.remove("output_binary")

        # 4. Return Result (Correct Key for Frontend)
        return {
            "status": "success", 
            "output": output if output else "Execution finished with no output."
        }

    except subprocess.TimeoutExpired:
        return {"status": "error", "output": "❌ Time Limit Exceeded (5s)"}
    
    except Exception as e:
        return {"status": "error", "output": f"System Error: {str(e)}"}
    
    finally:
        # 5. Cleanup
        if os.path.exists(filename):
            os.remove(filename)