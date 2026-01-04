# worker.py
import subprocess
import os
import uuid
import sys
import tempfile # 👈 Added tempfile for safe cloud file creation
import shutil   # 👈 Added for safer file cleanup
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
        "command": [sys.executable] 
    },
    63: {
        "extension": ".js",
        "command": ["node"]
    },
    54: {
        "extension": ".cpp",
        "compile": ["g++", "-o"], # logic slightly adjusted below
        "run": []
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
    
    # 2. Create a temporary file safely
    # This finds the correct 'temp' folder for the OS (Windows or Linux/Render)
    temp_dir = tempfile.gettempdir()
    unique_id = str(uuid.uuid4())
    filename = os.path.join(temp_dir, f"temp_{unique_id}{config['extension']}")
    
    # Output binary path (for C++)
    binary_name = os.path.join(temp_dir, f"output_{unique_id}")
    if os.name == 'nt': binary_name += ".exe"

    try:
        # Write code to disk
        with open(filename, "w", encoding="utf-8") as f:
            f.write(source_code)
            
        # 3. Execution Logic
        output = ""

        # Python & Node
        if language_id in [71, 63]:
            command = config["command"] + [filename]
            
            # Check if Node exists before running (Prevent crash if Node missing)
            if language_id == 63 and shutil.which("node") is None:
                return {"status": "error", "output": "Node.js is not installed on this server."}

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
            # Check if G++ exists
            if shutil.which("g++") is None:
                return {"status": "error", "output": "G++ compiler is not installed on this server."}

            # A. Compile
            # Command: g++ -o /tmp/output_uuid /tmp/temp_uuid.cpp
            compile_cmd = ["g++", "-o", binary_name, filename]
            compile_proc = subprocess.run(compile_cmd, capture_output=True, text=True)
            
            if compile_proc.returncode != 0:
                output = f"Compilation Error:\n{compile_proc.stderr}"
            else:
                # B. Run
                run_cmd = [binary_name]
                
                run_proc = subprocess.run(
                    run_cmd, 
                    input=stdin, 
                    capture_output=True, 
                    text=True, 
                    timeout=3
                )
                output = run_proc.stdout if run_proc.returncode == 0 else run_proc.stderr

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
        # 5. Cleanup (Delete temp files)
        if os.path.exists(filename):
            try: os.remove(filename)
            except: pass
            
        if os.path.exists(binary_name):
            try: os.remove(binary_name)
            except: pass