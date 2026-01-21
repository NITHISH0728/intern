from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload 
from sqlalchemy import delete
from pydantic import BaseModel
import bcrypt 
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import models
from database import engine, get_db # Importing the Async engine and dependency
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from celery_config import celery_app        # <--- Ensure this is here
from celery.result import AsyncResult
import requests
import io
import json
import os
import smtplib
import random
import string
import pandas as pd     
import requests 
import razorpay
import google.generativeai as genai 
import re  
import schemas
import random
import ssl
import backup_manager
from dotenv import load_dotenv
from pydantic import BaseModel
# --- 📄 PDF GENERATION IMPORTS ---
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from celery.result import AsyncResult
from database import engine, get_db, redis_client
# 🟢 GOOGLE DRIVE IMPORTS
from google.auth.transport.requests import Request as GoogleRequest  # 👈 Rename this
from fastapi import Request  # 👈 Add this explicitly for FastAPI
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from sqlalchemy import text



        
# Load environment variables
load_dotenv()

# 1. Initialize Database Tables (Async approach is slightly different, but for now we keep sync creation for simplicity or use Alembic in prod)
# For this setup, we will rely on the sync engine for table creation if needed, or assume tables exist.
# Ideally, use Alembic for migrations. For now, we will create tables using a temporary sync connection if not exists.
import asyncio
async def init_models():
    async with engine.begin() as conn:
        # 1. Create tables if they don't exist
        await conn.run_sync(models.Base.metadata.create_all)
        
        # 2. ✅ AUTO-MIGRATION: Update existing tables
        print("🔄 Checking for Database Migrations...")
        try:
            # Existing migrations
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();"))
            await conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;"))
            
            # 🆕 FIX FOR YOUR ERROR: Add last_login column
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;"))
            
            print("✅ Database Migrations Applied Successfully!")
        except Exception as e:
            print(f"⚠️ Migration Note: {e}")
            
            
app = FastAPI(title="iQmath Pro - Military Grade API")
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# Run DB Init on Startup
@app.on_event("startup")
async def on_startup():
    await init_models()

# 2. CONFIG: CORS POLICY (Restricted for Security in Prod)
app.add_middleware(
    CORSMiddleware,
    # 🔒 SECURITY: In production, change "*" to ["https://your-frontend-domain.com"]
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# --- 🔐 SECURITY & AUTH CONFIG ---
SECRET_KEY = os.getenv("SECRET_KEY", "fallback_secret_change_me_in_prod")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/login") 

# --- 💳 RAZORPAY ---
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# --- ✨ GEMINI AI ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# --- 📋 DATA MODELS ---
# (Keeping your existing Pydantic models)
class UserCreate(BaseModel):
    email: str; password: str; name: str; role: str; phone_number: str

class ModuleCreate(BaseModel):
    title: str; order: int

class ContentCreate(BaseModel):
    title: str; type: str; data_url: Optional[str] = None; duration: Optional[int] = None; 
    is_mandatory: bool = False; instructions: Optional[str] = None; test_config: Optional[str] = None; module_id: int
    # ✅ NEW
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

class ViolationReport(BaseModel):
    lesson_id: int
    
class StatusUpdate(BaseModel):
    status: str 

class Token(BaseModel):
    access_token: str; token_type: str; role: str
    
class AssignmentSubmission(BaseModel):
    link: str; lesson_id: int

class AdmitStudentRequest(BaseModel):
    full_name: str; email: str; course_ids: List[int]; password: Optional[str] = None 

class EnrollmentRequest(BaseModel):
    type: str 

class PasswordChange(BaseModel):
    new_password: str

# Code Test Models
class ProblemSchema(BaseModel):
    title: str; description: str; difficulty: str; test_cases: str 

class CodeTestCreate(BaseModel):
    title: str; pass_key: str; time_limit: int; problems: List[ProblemSchema]

class TestSubmission(BaseModel):
    test_id: int; score: int; problems_solved: int; time_taken: str

class ContentUpdate(BaseModel):
    title: Optional[str] = None; url: Optional[str] = None

class CodeExecutionRequest(BaseModel):
    source_code: str; stdin: str; language_id: int = 71
    
class AIGenerateRequest(BaseModel):
    title: str

class LiveSessionRequest(BaseModel):
    youtube_url: str; topic: str

class CourseCreate(BaseModel):
    title: str; description: str; price: int; image_url: Optional[str] = None
    course_type: str = "standard"; language: Optional[str] = None

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    image_url: Optional[str] = None
    language: Optional[str] = None
    # If your DB has a duration column, add it here. If not, remove this line.
    # duration: Optional[str] = None

class ChallengeCreate(BaseModel):
    title: str; description: str; difficulty: str; test_cases: str
 
class ConfirmationRequest(BaseModel):
    lesson_title: str; file_name: str

class CodePayload(BaseModel):
    source_code: str
    language_id: int
    stdin: Optional[str] = None       # ✅ Keeps Old Frontend working
    test_cases: Optional[Any] = None  #

class OTPLoginRequest(BaseModel):
    phone_number: str
    
    
class ModuleUpdate(BaseModel):
    title: str

class NotificationRequest(BaseModel):
    target_type: str  # "all", "course", "student"
    target_id: Optional[int] = None # course_id or user_id
    message: str

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime
        
# --- 🔑 AUTH LOGIC ---
def verify_password(plain_password, hashed_password):
    if isinstance(hashed_password, str): hashed_password = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password)

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# 🔒 ASYNC AUTH DEPENDENCY
async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise HTTPException(status_code=401, detail="Invalid session")
    except JWTError: raise HTTPException(status_code=401, detail="Session expired")
    
    result = await db.execute(select(models.User).where(models.User.email == email))
    user = result.scalars().first()
    
    if user is None: raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_instructor(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "instructor":
        raise HTTPException(status_code=403, detail="⛔ Access Forbidden: Instructors Only")
    return current_user

async def require_student(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="⛔ Access Forbidden: Students Only")
    return current_user

def generate_random_password(length=8):
    characters = string.ascii_letters + string.digits + "!@#$"
    return ''.join(random.choice(characters) for i in range(length))

# --- UTILITIES ---
# backend/main.py

# In backend/main.py

def send_credentials_email(to_email: str, name: str, password: str = None, subject: str = None, body: str = None):
    # 1. Get Config
    api_key = os.getenv("BREVO_API_KEY")
    sender_email = os.getenv("EMAIL_SENDER")
    
    print(f"🚀 [BREVO API] Preparing to send to: {to_email}")

    if not api_key or not sender_email:
        print("❌ ERROR: BREVO_API_KEY or EMAIL_SENDER missing.")
        return

    # 2. Define the URL (Port 443 - Bypasses Render Firewall)
    url = "https://api.brevo.com/v3/smtp/email"

    # 3. Construct Content
    if not subject:
        subject = "Welcome to iQmath! Your Credentials"
    
    if not body:
        html_content = f"""
        <html>
        <body>
            <h1>Welcome {name}!</h1>
            <p>You have been admitted to iQmath Pro.</p>
            <p><strong>User ID:</strong> {to_email}</p>
            <p><strong>Password:</strong> {password}</p>
            <br/>
            <p>Happy Learning!</p>
        </body>
        </html>
        """
    else:
        # If body is passed from OTP logic
        html_content = f"<p>{body}</p>".replace("\n", "<br>")

    # 4. Create Payload
    payload = {
        "sender": {"name": "iQmath Admin", "email": sender_email},
        "to": [{"email": to_email, "name": name}],
        "subject": subject,
        "htmlContent": html_content
    }

    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }

    # 5. Send Request
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 201:
            print(f"✅ [BREVO API] SUCCESS: Email sent! ID: {response.json().get('messageId')}")
        else:
            print(f"❌ [BREVO API] FAILED: {response.status_code} - {response.text}")
            # Raise exception so the calling function knows it failed
            raise Exception(f"API Error: {response.text}")
            
    except Exception as e:
        print(f"❌ [BREVO API] NETWORK ERROR: {str(e)}")
        raise e  
def upload_file_to_drive(file_obj, filename, folder_link):
    # (Drive logic remains mostly same, executed in thread pool usually by FastAPI)
    try:
        folder_id = folder_link
        if "drive.google.com" in folder_link: folder_id = folder_link.split("/")[-1].split("?")[0]
        
        creds = None
        if os.path.exists('token.json'): creds = Credentials.from_authorized_user_file('token.json', ['https://www.googleapis.com/auth/drive.file'])
        
        if not creds or not creds.valid:
           if creds and creds.expired and creds.refresh_token:
               creds.refresh(GoogleRequest())
        else: return None

        service = build('drive', 'v3', credentials=creds)
        file_metadata = { 'name': filename, 'parents': [folder_id] }
        media = MediaIoBaseUpload(file_obj, mimetype='application/pdf', resumable=True)
        uploaded_file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
        return uploaded_file.get('id')
    except Exception as e:
        print(f"Drive Error: {e}")
        return None

def create_certificate_pdf(student_name: str, course_name: str, date_str: str):
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)
    BRAND_BLUE = colors.Color(0/255, 94/255, 184/255)
    c.setStrokeColor(BRAND_BLUE); c.setLineWidth(5); c.rect(20, 20, width-40, height-40)
    c.setFont("Helvetica-Bold", 40); c.setFillColor(BRAND_BLUE); c.drawCentredString(width/2, height - 180, "CERTIFICATE")
    c.setFont("Helvetica", 16); c.setFillColor(colors.black); c.drawCentredString(width/2, height - 210, "OF COMPLETION")
    c.setFont("Helvetica-BoldOblique", 32); c.drawCentredString(width/2, height - 310, student_name)
    c.setFont("Helvetica-Bold", 24); c.setFillColor(BRAND_BLUE); c.drawCentredString(width/2, height - 400, course_name)
    c.showPage(); c.save(); buffer.seek(0); return buffer

# --- 🔄 ASYNC LOGIC HELPERS ---
# --- 🔄 UPDATED LOGIC: Strict 100% Completion Check ---
async def check_progress_status(user_id: int, course_id: int, db: AsyncSession):
    """
    Returns (completed_count, total_count, is_fully_completed)
    """
    # 1. Get ALL items in the course
    # We join Course -> Module -> ContentItem to get the total list
    result = await db.execute(
        select(models.ContentItem.id)
        .join(models.Module, models.ContentItem.module_id == models.Module.id)
        .where(models.Module.course_id == course_id)
    )
    all_item_ids = result.scalars().all()
    total_items = len(all_item_ids)
    
    if total_items == 0:
        return 0, 0, False

    # 2. Get User's Completed Items
    # We filter LessonProgress for this user and these specific items
    progress_res = await db.execute(
        select(models.LessonProgress.content_item_id)
        .where(
            models.LessonProgress.user_id == user_id, 
            models.LessonProgress.is_completed == True,
            models.LessonProgress.content_item_id.in_(all_item_ids)
        )
    )
    completed_ids = progress_res.scalars().all()
    completed_count = len(completed_ids)

    # 3. Check if 100% complete
    is_fully_completed = completed_count == total_items
    
    return completed_count, total_items, is_fully_completed

async def generate_certificate_record(user_id: int, course_id: int, db: AsyncSession):
    # Check if cert already exists
    cert_check = await db.execute(select(models.UserCertificate).where(
        models.UserCertificate.user_id == user_id, 
        models.UserCertificate.course_id == course_id
    ))
    if cert_check.scalars().first():
        return True # Already exists

    # Create new cert
    import uuid
    new_cert = models.UserCertificate(
        user_id=user_id, 
        course_id=course_id, 
        certificate_id=str(uuid.uuid4())[:8].upper()
    )
    db.add(new_cert)
    await db.commit()
    return True
# --- 🚀 ASYNC API ENDPOINTS ---

@app.post("/api/v1/users", status_code=201)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # 1. Check if user exists
    result = await db.execute(select(models.User).where(models.User.email == user.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Create User
    new_user = models.User(
        email=user.email, 
        hashed_password=get_password_hash(user.password), 
        full_name=user.name, 
        role=user.role,
        phone_number=user.phone_number
    )
    db.add(new_user)
    await db.commit()

    # 3. 📧 SEND OTP EMAIL
    otp_code = str(random.randint(100000, 999999))
    custom_subject = "Welcome to iQmath! Verify your account"
    custom_body = f"Hello {user.name},\n\nWelcome to iQmath Pro!\n\nYour Account Status: ACTIVE\n\n(If you need an OTP for verification, here it is: {otp_code})\n\nHappy Learning!"

    try:
        # Run in thread so it doesn't block
        await asyncio.to_thread(
            send_credentials_email, 
            to_email=user.email, 
            name=user.name, 
            password=None, 
            subject=custom_subject, 
            body=custom_body
        )
    except Exception as e:
        print(f"❌ Email Failed: {e}")
        # 🚨 Raise 500 error so Frontend shows RED
        raise HTTPException(status_code=500, detail=f"User created, but Email Failed: {str(e)}")

    return {"message": "User created successfully"}

@app.post("/api/v1/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.email == form_data.username))
    user = result.scalars().first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # ✅ CHECK 1: Password Verification
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # ✅ CHECK 2: Is the User Active? (Soft Delete Check)
    if user.is_active is False:  # explicitly check for False
        raise HTTPException(status_code=403, detail="Account deactivated. Contact support.")
    
    
    
    token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role}
@app.post("/api/v1/admin/admit-student")
async def admit_single_student(req: AdmitStudentRequest, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    # 1. Check if student exists
    result = await db.execute(select(models.User).where(models.User.email == req.email))
    student = result.scalars().first()
    
    final_password = req.password if req.password else generate_random_password()
    is_new_user = False
    email_status = "skipped"

    # 2. Create User if New
    if not student:
        is_new_user = True
        
        # ✅ CRITICAL: Send Email FIRST. If this fails, we want to know immediately.
        # Running in a thread to keep it non-blocking but synchronous for the logic flow.
        try:
            await asyncio.to_thread(send_credentials_email, req.email, req.full_name, final_password)
            email_status = "sent"
        except Exception as e:
            # If email fails, we STOP here. We do NOT create the user. 
            # This forces you to fix the email issue instead of creating "broken" users.
            print(f"❌ Aborting User Creation because Email Failed: {e}")
            raise HTTPException(status_code=500, detail=f"Email failed: {str(e)}")

        # If email succeeded, NOW create the user
        student = models.User(
            email=req.email, 
            full_name=req.full_name, 
            hashed_password=get_password_hash(final_password), 
            role="student",
        )
        db.add(student)
        await db.commit()
        await db.refresh(student)
    
    # 3. Enroll in Courses
    enrolled = []
    for cid in req.course_ids:
        check = await db.execute(select(models.Enrollment).where(models.Enrollment.user_id == student.id, models.Enrollment.course_id == cid))
        if not check.scalars().first():
            db.add(models.Enrollment(user_id=student.id, course_id=cid))
            enrolled.append(cid)
    
    await db.commit()

    if is_new_user:
        return {"message": f"User created & Email Sent! Enrolled in {len(enrolled)} courses.", "email_status": email_status}
    else:
        return {"message": f"Existing user enrolled.", "email_status": email_status}
    
@app.post("/api/v1/admin/bulk-admit")
async def bulk_admit_students(file: UploadFile = File(...), course_id: int = Form(...), db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents)) if file.filename.endswith('.csv') else pd.read_excel(io.BytesIO(contents))
    except: 
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload CSV or Excel.")
    
    # Normalize headers
    df.columns = [c.lower().strip() for c in df.columns]
    if "email" not in df.columns: 
        raise HTTPException(status_code=400, detail="Missing 'email' column in file.")
    
    count = 0
    email_tasks = [] # Store email tasks to run later

    for _, row in df.iterrows():
        email = str(row["email"]).strip()
        name = str(row.get("name", "Student"))
        
        if not email or email.lower() == "nan": continue
        
        # 1. Check if user exists
        res = await db.execute(select(models.User).where(models.User.email == email))
        student = res.scalars().first()
        
        if not student:
            # Create new student
            bulk_password = generate_random_password()
            student = models.User(
                email=email, 
                full_name=name, 
                hashed_password=get_password_hash(bulk_password), 
                role="student"
            )
            db.add(student)
            await db.commit()
            await db.refresh(student)
            
            # ✅ OPTIMIZATION: Add email to a task list (don't block the loop)
            email_tasks.append((email, name, bulk_password))
        
        # 2. Enroll in Course
        enrol_check = await db.execute(select(models.Enrollment).where(
            models.Enrollment.user_id == student.id, 
            models.Enrollment.course_id == course_id
        ))
        
        if not enrol_check.scalars().first():
            db.add(models.Enrollment(user_id=student.id, course_id=course_id))
            count += 1
    
    await db.commit()

    # 3. 🚀 Send Emails in Background (Non-blocking)
    # This prevents the request from timing out if you upload 100 students
    for email, name, password in email_tasks:
        try:
            # Run each email in a thread
            await asyncio.to_thread(send_credentials_email, email, name, password)
        except Exception as e:
            print(f"Failed to email {email}: {e}")

    return {"message": f"Successfully enrolled {count} students. Emails are being sent."}

@app.post("/api/v1/ai/generate-challenge") # 👈 Changed from "/generate" to match Frontend
async def generate_problem_content(req: AIGenerateRequest):
    if not GEMINI_API_KEY: raise HTTPException(status_code=500, detail="API Key missing")
    try:
        prompt = f"""Create a programming challenge on "{req.title}". OUTPUT JSON ONLY: {{ "description": "...", "test_cases": [ {{"input": "...", "output": "...", "hidden": false}} ] }}"""
        response = await asyncio.to_thread(model.generate_content, prompt)
        text = response.text.strip()
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if not match: raise ValueError("Invalid JSON")
        ai_data = json.loads(match.group())
        return { "description": ai_data.get("description"), "test_cases": json.dumps(ai_data.get("test_cases", [])) }
    except Exception as e: raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

@app.post("/api/v1/code-tests")
async def create_code_test(test: CodeTestCreate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    new_test = models.CodeTest(title=test.title, pass_key=test.pass_key, time_limit=test.time_limit, instructor_id=current_user.id)
    db.add(new_test)
    await db.commit()
    await db.refresh(new_test)
    
    for prob in test.problems:
        new_prob = models.Problem(test_id=new_test.id, title=prob.title, description=prob.description, difficulty=prob.difficulty, test_cases=prob.test_cases)
        db.add(new_prob)
    await db.commit()
    students = await db.execute(select(models.User.id).where(models.User.role == "student"))
    for uid in students.scalars().all():
        db.add(models.Notification(user_id=uid, title="New Code Arena!", message=f"Challenge '{test.title}' is live. Test your skills now!", created_at=datetime.utcnow()))
    await db.commit()
    return {"message": "Test Created Successfully!"}

@app.get("/api/v1/courses/{course_id}")
async def get_course_details(course_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Course).where(models.Course.id == course_id))
    course = result.scalars().first()
    if not course: raise HTTPException(status_code=404, detail="Course not found")
    return course

@app.get("/api/v1/code-tests")
async def get_code_tests(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role == "instructor": 
        res = await db.execute(select(models.CodeTest).where(models.CodeTest.instructor_id == current_user.id))
        return res.scalars().all()
    
    res = await db.execute(select(models.CodeTest))
    tests = res.scalars().all()
    response_data = []
    for t in tests:
        sub_res = await db.execute(select(models.TestResult).where(models.TestResult.test_id == t.id, models.TestResult.user_id == current_user.id))
        submission = sub_res.scalars().first()
        # Eager load problems if needed or fetch separately. For summary list, maybe not needed.
        # But frontend might expect 'problems' list structure? Keeping it lightweight here.
        response_data.append({ "id": t.id, "title": t.title, "time_limit": t.time_limit, "completed": True if submission else False })
    return response_data

@app.post("/api/v1/code-tests/{test_id}/start")
async def start_code_test(test_id: int, pass_key: str = Form(...), db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Verify not submitted
    res = await db.execute(select(models.TestResult).where(models.TestResult.test_id == test_id, models.TestResult.user_id == current_user.id))
    if res.scalars().first(): raise HTTPException(status_code=403, detail="Test already submitted.")
    
    # Eager load problems
    res_test = await db.execute(select(models.CodeTest).options(selectinload(models.CodeTest.problems)).where(models.CodeTest.id == test_id))
    test = res_test.scalars().first()
    
    if not test: raise HTTPException(status_code=404)
    if test.pass_key != pass_key: raise HTTPException(status_code=403, detail="Invalid Key")
    
    return { "id": test.id, "title": test.title, "time_limit": test.time_limit, "problems": [{"id": p.id, "title": p.title, "description": p.description, "test_cases": p.test_cases} for p in test.problems] }

@app.post("/api/v1/code-tests/submit")
async def submit_test_result(sub: TestSubmission, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = models.TestResult(test_id=sub.test_id, user_id=current_user.id, score=sub.score, problems_solved=sub.problems_solved, time_taken=sub.time_taken)
    db.add(result)
    await db.commit()
    return {"message": "Submitted"}

@app.get("/api/v1/code-tests/{test_id}/results")
async def get_test_results(test_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    # Eager load student details
    res = await db.execute(select(models.TestResult).options(selectinload(models.TestResult.student)).where(models.TestResult.test_id == test_id))
    results = res.scalars().all()
    return [{"student_name": r.student.full_name, "email": r.student.email, "score": r.score, "problems_solved": r.problems_solved, "time_taken": r.time_taken, "submitted_at": r.submitted_at.strftime("%Y-%m-%d %H:%M")} for r in results]

# Judge0 Execution (Async Request)

@app.get("/api/v1/courses")
async def get_courses(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role == "instructor":
        res = await db.execute(select(models.Course).where(models.Course.instructor_id == current_user.id))
        return res.scalars().all()
    res = await db.execute(select(models.Course).where(models.Course.is_published == True))
    return res.scalars().all()

@app.post("/api/v1/courses")
# 👇 CHANGE: Remove "schemas." prefix to use the local class
async def create_course(course: CourseCreate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    new_course = models.Course(
        title=course.title, 
        description=course.description, 
        price=course.price, 
        image_url=course.image_url, 
        instructor_id=current_user.id, 
        course_type=course.course_type, 
        language=course.language
    )
    db.add(new_course)
    await db.commit()
    await db.refresh(new_course)
    students = await db.execute(select(models.User.id).where(models.User.role == "student"))
    for uid in students.scalars().all():
        db.add(models.Notification(user_id=uid, title="New Course Alert!", message=f"New course '{new_course.title}' is now available.", created_at=datetime.utcnow()))
    await db.commit()
    return new_course

@app.post("/api/v1/courses/{course_id}/modules")
async def create_module(course_id: int, module: ModuleCreate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    new_module = models.Module(**module.dict(), course_id=course_id)
    db.add(new_module)
    await db.commit()
    await db.refresh(new_module)
    return new_module

@app.get("/api/v1/courses/{course_id}/modules")
async def get_modules(course_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.Module).where(models.Module.course_id == course_id).order_by(models.Module.order))
    return res.scalars().all()

@app.post("/api/v1/content")
async def add_content(content: ContentCreate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    new_content = models.ContentItem(
        title=content.title, 
        type=content.type, 
        content=content.data_url, 
        order=0, 
        module_id=content.module_id, 
        duration=content.duration, 
        is_mandatory=content.is_mandatory, 
        instructions=content.instructions, 
        test_config=content.test_config,
        # ✅ Save Times
        start_time=content.start_time,
        end_time=content.end_time
    )
    db.add(new_content)
    await db.commit()
    return {"message": "Content added"}

@app.patch("/api/v1/courses/{course_id}/publish")
async def publish_course(course_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    res = await db.execute(select(models.Course).where(models.Course.id == course_id))
    course = res.scalars().first()
    if course:
        course.is_published = True
        await db.commit()
    return {"message": "Published"}

@app.patch("/api/v1/courses/{course_id}/details")
async def update_course_details(
    course_id: int, 
    update: CourseUpdate, 
    db: AsyncSession = Depends(get_db), 
    current_user: models.User = Depends(require_instructor)
):
    # 1. Fetch Course
    result = await db.execute(select(models.Course).where(models.Course.id == course_id))
    course = result.scalars().first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # 2. Verify Ownership
    if course.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this course")

    # 3. Update Fields if provided
    if update.title: course.title = update.title
    if update.description: course.description = update.description
    if update.price is not None: course.price = update.price
    if update.image_url: course.image_url = update.image_url
    if update.language: course.language = update.language
    
    # 4. Save
    await db.commit()
    await db.refresh(course)
    
    return {"message": "Course updated successfully", "course": course}

@app.get("/api/v1/courses/{course_id}/player")
async def get_course_player(course_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # ⚡ OPTIMIZED EAGER LOADING: Fetch Course + Modules + Items in 1 Go
    result = await db.execute(
        select(models.Course)
        .options(selectinload(models.Course.modules).selectinload(models.Module.items))
        .where(models.Course.id == course_id)
    )
    course = result.scalars().first()
    if not course: raise HTTPException(status_code=404)

    # Check Enrollment
    enrol_res = await db.execute(select(models.Enrollment).where(models.Enrollment.user_id == current_user.id, models.Enrollment.course_id == course_id))
    enrollment = enrol_res.scalars().first()
    
    if not enrollment and current_user.role != "instructor": raise HTTPException(status_code=403)
    if enrollment and enrollment.enrollment_type == "trial" and enrollment.expiry_date and datetime.utcnow() > enrollment.expiry_date:
        raise HTTPException(status_code=402, detail="Trial Expired")

    # Fetch Progress
    prog_res = await db.execute(select(models.LessonProgress).where(models.LessonProgress.user_id == current_user.id))
    progress_records = prog_res.scalars().all()
    progress_map = {p.content_item_id: p for p in progress_records}
    completed_ids = {p.content_item_id for p in progress_records if p.is_completed}

    return {
        "id": course.id, 
        "title": course.title, 
        "course_type": course.course_type,
        "language": course.language,
        "modules": [
            {
                "id": m.id, 
                "title": m.title, 
                "is_completed": any(item.type == 'assignment' and item.id in completed_ids for item in m.items),
                "lessons": [
                    {
                        "id": c.id, 
                        "title": c.title, 
                        "type": c.type, 
                        "url": c.content, 
                        "test_config": c.test_config, 
                        "instructions": c.instructions, 
                        "duration": c.duration, 
                        "is_mandatory": c.is_mandatory, 
                        "is_completed": c.id in completed_ids, 

                        # ✅ INSERT THE NEW LINES EXACTLY HERE (After "is_completed")
                        "start_time": c.start_time,
                        "end_time": c.end_time,
                        "is_terminated": progress_map.get(c.id).is_terminated if c.id in progress_map else False,
                        "violation_count": progress_map.get(c.id).violation_count if c.id in progress_map else 0
                        
                    } for c in m.items
                ]
            } for m in course.modules
        ]
    }

@app.post("/api/v1/enroll/{course_id}")
async def enroll_student(course_id: int, req: EnrollmentRequest, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    res = await db.execute(select(models.Enrollment).where(models.Enrollment.user_id == current_user.id, models.Enrollment.course_id == course_id))
    existing = res.scalars().first()
    if existing:
        if existing.enrollment_type == "trial" and req.type == "paid":
            existing.enrollment_type = "paid"; existing.expiry_date = None; await db.commit(); return {"message": "Upgraded"}
        return {"message": "Already enrolled"}
    
    new_enrollment = models.Enrollment(user_id=current_user.id, course_id=course_id, enrollment_type=req.type, expiry_date=(datetime.utcnow() + timedelta(days=7)) if req.type == "trial" else None)
    db.add(new_enrollment)
    await db.commit()
    return {"message": "Enrolled"}

@app.get("/api/v1/generate-pdf/{course_id}")
async def generate_pdf_endpoint(course_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 1. ✅ SECURITY CHECK: Verify if the certificate record exists in DB
    # This ensures they have passed the "100% completion" check in the claim endpoint first.
    cert_res = await db.execute(select(models.UserCertificate).where(
        models.UserCertificate.user_id == current_user.id, 
        models.UserCertificate.course_id == course_id
    ))
    certificate = cert_res.scalars().first()

    if not certificate:
        raise HTTPException(status_code=403, detail="Certificate not yet earned. Please complete the course and click 'Claim Certificate' first.")

    # 2. Fetch Course Details
    res = await db.execute(select(models.Course).where(models.Course.id == course_id))
    course = res.scalars().first()
    
    # 3. Generate PDF
    # We use the date they actually earned it (certificate.issued_at) rather than current time
    formatted_date = certificate.issued_at.strftime("%B %d, %Y")
    
    pdf = await asyncio.to_thread(create_certificate_pdf, current_user.full_name, course.title, formatted_date)
    return StreamingResponse(pdf, media_type="application/pdf")

@app.get("/api/v1/my-courses")
async def get_my_courses(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    res = await db.execute(select(models.Enrollment).options(selectinload(models.Enrollment.course)).where(models.Enrollment.user_id == current_user.id))
    enrollments = res.scalars().all()
    
    # 🟢 FIX: Filter out None values if a course was deleted
    valid_courses = [e.course for e in enrollments if e.course is not None]
    
    return valid_courses

@app.post("/api/v1/user/change-password")
async def change_password(req: PasswordChange, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    current_user.hashed_password = get_password_hash(req.new_password)
    await db.commit()
    return {"message": "Password updated"}

# In backend/main.py

@app.delete("/api/v1/content/{content_id}")
async def delete_content(content_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    # 1. Fetch the item
    res = await db.execute(select(models.ContentItem).where(models.ContentItem.id == content_id))
    item = res.scalars().first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    try:
        # 2. ✅ CRITICAL FIX: Delete related dependencies first!
        
        # Delete related Progress records (Proctoring/Completion data)
        await db.execute(
            delete(models.LessonProgress).where(models.LessonProgress.content_item_id == content_id)
        )

        # Delete related Submissions (if it was an assignment)
        await db.execute(
            delete(models.Submission).where(models.Submission.content_item_id == content_id)
        )

        # 3. Now delete the actual item
        await db.delete(item)
        await db.commit()
        return {"message": "Deleted successfully"}

    except Exception as e:
        await db.rollback()
        print(f"Delete Error: {str(e)}") # This prints to your backend terminal for debugging
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")

@app.patch("/api/v1/content/{content_id}")
async def update_content(content_id: int, update: ContentUpdate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    res = await db.execute(select(models.ContentItem).where(models.ContentItem.id == content_id))
    item = res.scalars().first()
    if item: 
        if update.title: item.title = update.title
        if update.url: item.content = update.url
        await db.commit()
        return {"message": "Updated"}
    raise HTTPException(status_code=404)

@app.post("/api/v1/create-order")
async def create_payment_order(data: dict = Body(...)):
    # Razorpay client is sync, use thread
    amount = data.get("amount") 
    order_data = { "amount": amount * 100, "currency": "INR", "payment_capture": 1 }
    order = await asyncio.to_thread(client.order.create, data=order_data)
    return order

@app.post("/api/v1/submit-assignment")
async def submit_assignment(file: UploadFile = File(...), lesson_title: str = Form(...), db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    res = await db.execute(select(models.ContentItem).where(models.ContentItem.title == lesson_title, models.ContentItem.type == "assignment"))
    assignment_data = res.scalars().first()
    
    content = await file.read()
    safe_filename = f"{current_user.full_name}_{file.filename}"
    drive_status = "Not Uploaded"

    if assignment_data and assignment_data.content:
        file_stream = io.BytesIO(content)
        # Run sync drive upload in thread
        file_id = await asyncio.to_thread(upload_file_to_drive, file_stream, safe_filename, assignment_data.content)
        if file_id: drive_status = "Uploaded"
    
    # Local Backup
    os.makedirs("assignments_backup", exist_ok=True)
    with open(f"assignments_backup/{safe_filename}", "wb") as f: f.write(content)
    
    return {"message": "Submitted", "drive_status": drive_status}

@app.post("/api/v1/confirm-submission")
async def confirm_submission(req: ConfirmationRequest, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    res = await db.execute(select(models.ContentItem).options(selectinload(models.ContentItem.module)).where(models.ContentItem.title == req.lesson_title, models.ContentItem.type == "assignment"))
    assignment = res.scalars().first()
    if not assignment: raise HTTPException(status_code=404)

    # 1. Create Submission Record
    new_sub = models.Submission(user_id=current_user.id, content_item_id=assignment.id, drive_link=f"Uploaded: {req.file_name}", status="Submitted")
    db.add(new_sub)

    # 2. Mark Lesson as Complete (Green Tick)
    prog_res = await db.execute(select(models.LessonProgress).where(models.LessonProgress.user_id == current_user.id, models.LessonProgress.content_item_id == assignment.id))
    if not prog_res.scalars().first():
        db.add(models.LessonProgress(user_id=current_user.id, content_item_id=assignment.id, is_completed=True))
    
    await db.commit()
    
    # ✅ Removed certificate logic. Certificate is now only claimed via the "Claim Certificate" button.
    return {"message": "Submitted"}
# In main.py

@app.get("/api/v1/admin/students")
async def get_all_students(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    # 1. REMOVED THE BROAD TRY/EXCEPT BLOCK so real errors raise 500 instead of returning []
    
    # Optimized: Fetch students + enrollments + course names
    res = await db.execute(
        select(models.User)
        .options(selectinload(models.User.enrollments).selectinload(models.Enrollment.course))
        .where(models.User.role == "student")
    )
    students = res.scalars().all()
    
    real_data = []
    for s in students:
        # 2. Safely get course names (Handle missing relationships)
        course_names = []
        # Check if 'enrollments' exists safely
        user_enrollments = getattr(s, "enrollments", [])
        if user_enrollments:
            course_names = [e.course.title for e in user_enrollments if e.course]

        # 3. Safely format Date (Fixes the crash if created_at is missing/None)
        join_date = "N/A"
        # Check if 'created_at' exists on the model and is not None
        created_at_val = getattr(s, "created_at", None)
        
        if created_at_val:
            try:
                # If it's already a string, use it; otherwise format datetime
                if isinstance(created_at_val, str):
                    join_date = created_at_val
                else:
                    join_date = created_at_val.strftime("%Y-%m-%d")
            except Exception:
                join_date = str(created_at_val)

        real_data.append({ 
            "id": s.id, 
            "full_name": s.full_name, 
            "email": s.email, 
            "joined_at": join_date, 
            "enrolled_courses": course_names 
        })
        
    return real_data

@app.delete("/api/v1/admin/students/{user_id}")
async def delete_student(user_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    # 1. Find the student
    res = await db.execute(select(models.User).where(models.User.id == user_id))
    student = res.scalars().first()
    
    if not student: 
        raise HTTPException(status_code=404, detail="Student not found")
    
    # 2. ✅ SOFT DELETE LOGIC (Safe Mode)
    # instead of db.delete(student), we simply turn them off.
    student.is_active = False 
    
    # Optional: You can append a suffix to the email if you want to allow them to re-register later with the same email.
    # student.email = f"archived_{student.id}_{student.email}"

    await db.commit()
    
    return {"message": "Student deactivated successfully. Data has been archived safely."}


@app.delete("/api/v1/courses/{course_id}")
async def delete_course(course_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    res = await db.execute(select(models.Course).where(models.Course.id == course_id))
    course = res.scalars().first()
    if course:
        await db.delete(course)
        await db.commit()
    return {"message": "Deleted"}

# Live Sessions
@app.post("/api/v1/live/start")
async def start_live_session(req: LiveSessionRequest, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    # Deactivate old
    old_res = await db.execute(select(models.LiveSession).where(models.LiveSession.instructor_id == current_user.id, models.LiveSession.is_active == True))
    for s in old_res.scalars().all(): s.is_active = False
    
    new_session = models.LiveSession(instructor_id=current_user.id, youtube_url=req.youtube_url, topic=req.topic, is_active=True)
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return {"message": "Started", "session_id": new_session.id}

@app.get("/api/v1/live/active")
async def get_active_live_sessions(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(models.LiveSession).where(models.LiveSession.is_active == True))
    return res.scalars().all()

@app.post("/api/v1/live/end/{session_id}")
async def end_live_session(session_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    res = await db.execute(select(models.LiveSession).where(models.LiveSession.id == session_id))
    session = res.scalars().first()
    if session:
        session.is_active = False
        await db.commit()
    return {"message": "Ended"}

# Dashboard optimized
@app.get("/api/v1/instructor/assignments")
async def get_assignment_dashboard(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    # ⚡ OPTIMIZED DASHBOARD QUERY
    # Fetch Courses + Modules + Items(Assignment) + Submissions + Student
    # This prevents the 10,000 query crash loop.
    result = await db.execute(
        select(models.Course)
        .options(
            selectinload(models.Course.modules)
            .selectinload(models.Module.items)
           # Assuming relationship back to submission exists? 
            # Actually better to just load course structure and then fetch submissions in batch
        )
        .where(models.Course.instructor_id == current_user.id)
    )
    courses = result.scalars().all()
    
    # Batch fetch all students
    all_students_res = await db.execute(select(models.User).where(models.User.role == "student"))
    all_students = all_students_res.scalars().all()
    student_map = {s.id: s for s in all_students}

    # Batch fetch enrollments
    enroll_res = await db.execute(select(models.Enrollment))
    all_enrollments = enroll_res.scalars().all()
    
    # Process in memory (Fast Python is better than N+1 DB calls)
    dashboard_data = []
    
    for course in courses:
        course_data = { "course_id": course.id, "course_title": course.title, "assignment_tasks": [] }
        
        # Get students for this course
        enrolled_ids = [e.user_id for e in all_enrollments if e.course_id == course.id]
        
        for module in course.modules:
            for item in module.items:
                if item.type == "assignment":
                    # Get submissions for this item (Need a relationship or separate query. For strictness, separate query is safer here if relationship missing)
                    # To keep it async safe:
                    sub_res = await db.execute(select(models.Submission).where(models.Submission.content_item_id == item.id))
                    submissions = sub_res.scalars().all()
                    
                    submitted_list = []
                    submitted_ids = set()
                    
                    for sub in submissions:
                        student = student_map.get(sub.user_id)
                        if not student: continue
                        submitted_ids.add(sub.user_id)
                        clean_name = sub.drive_link.replace("Uploaded: ", "").strip()
                        smart_link = f"https://drive.google.com/drive/search?q=name contains '{clean_name}'"
                        submitted_list.append({
                            "submission_id": sub.id, "student_name": student.full_name, 
                            "file_name": clean_name, "drive_search_link": smart_link, 
                            "status": sub.status, "submitted_at": sub.submitted_at.strftime("%Y-%m-%d")
                        })
                    
                    pending_list = []
                    for sid in enrolled_ids:
                        if sid not in submitted_ids and sid in student_map:
                            s = student_map[sid]
                            pending_list.append({"student_id": s.id, "student_name": s.full_name, "email": s.email})
                    
                    course_data["assignment_tasks"].append({
                        "task_id": item.id, "task_title": item.title, 
                        "submitted": submitted_list, "pending": pending_list
                    })
        
        dashboard_data.append(course_data)
        
    return dashboard_data

@app.post("/api/v1/instructor/verify-assignment/{submission_id}")
async def verify_assignment(submission_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    res = await db.execute(select(models.Submission).where(models.Submission.id == submission_id))
    sub = res.scalars().first()
    if not sub: raise HTTPException(status_code=404)
    
    # 1. Update Status
    sub.status = "Verified"
    
    # 2. Ensure Progress is Marked Complete
    prog_res = await db.execute(select(models.LessonProgress).where(models.LessonProgress.user_id == sub.user_id, models.LessonProgress.content_item_id == sub.content_item_id))
    progress = prog_res.scalars().first()
    if not progress:
        db.add(models.LessonProgress(user_id=sub.user_id, content_item_id=sub.content_item_id, is_completed=True))
    else:
        progress.is_completed = True
        
    await db.commit()
    
    # ✅ Removed certificate logic.
    return {"message": "Verified"}

@app.post("/api/v1/execute")
async def execute_code(payload: CodePayload):
    # Logic: If 'test_cases' is provided, we use that (Batch Mode).
    # If not, we fall back to 'stdin' (Single Mode).
    
    input_data = ""
    mode = "single"

    if payload.test_cases:
        mode = "batch"
        # Ensure it is a JSON string for the worker
        if isinstance(payload.test_cases, str):
            input_data = payload.test_cases
        else:
            input_data = json.dumps(payload.test_cases)
    else:
        # Fallback for old frontend
        input_data = payload.stdin or ""

    # Send to Worker with a 'mode' flag so it knows what to do
    # We pack the mode into the input string with a separator, or handle it in the worker
    # SIMPLEST WAY: We rely on the worker to detect if it's a JSON list or raw text.
    
    task = celery_app.send_task(
        "worker.run_code_task", 
        args=[payload.source_code, payload.language_id, input_data, mode] 
    )
    
    return {"task_id": task.id, "message": "Execution Queued"}

# 1. Toggle Item Completion (The Green Tick)
@app.post("/api/v1/content/{item_id}/complete")
async def mark_item_complete(item_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Check if progress record exists
    res = await db.execute(select(models.LessonProgress).where(
        models.LessonProgress.user_id == current_user.id, 
        models.LessonProgress.content_item_id == item_id
    ))
    progress = res.scalars().first()

    if not progress:
        # Create new record as completed
        progress = models.LessonProgress(user_id=current_user.id, content_item_id=item_id, is_completed=True)
        db.add(progress)
    else:
        # If it exists, ensure it is true (or toggle if you prefer, but usually 'mark as read' is one-way or explicit)
        progress.is_completed = True
        
    await db.commit()
    return {"message": "Marked as complete", "status": "success"}


# 2. Final Course Completion (The "Complete Course" Button)
@app.post("/api/v1/courses/{course_id}/claim-certificate")
async def claim_course_certificate(course_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 1. Verify strict 100% completion
    completed, total, is_done = await check_progress_status(current_user.id, course_id, db)
    
    if not is_done:
        return {
            "status": "error", 
            "message": f"Course incomplete. You have finished {completed}/{total} items. Please complete all modules first."
        }

    # 2. Generate Certificate
    await generate_certificate_record(current_user.id, course_id, db)
    
    return {"status": "success", "message": "Certificate Generated!", "certificate_ready": True}
    
   

# 2. STATUS CHECK ENDPOINT
@app.get("/api/v1/result/{task_id}")
async def get_result(task_id: str):
    task_result = AsyncResult(task_id)
    
    if task_result.state == 'PENDING':
        return {"status": "processing"}
    elif task_result.state == 'SUCCESS':
        return {"status": "completed", "data": task_result.result}
    elif task_result.state == 'FAILURE':
        return {"status": "failed", "error": str(task_result.result)}
 
@app.get("/api/v1/courses/{course_id}/challenges")
async def get_course_challenges(course_id: int, db: AsyncSession = Depends(get_db)):
    # 1. define Key
    cache_key = f"course_{course_id}_challenges"

    # 2. Check Redis (Fast Path)
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            print("⚡ Serving Challenges from Redis Cache")
            return json.loads(cached_data)
    except Exception as e:
        print(f"Redis Error (Ignored): {e}")

    # 3. DB Query (Slow Path)
    result = await db.execute(select(models.CourseChallenge).where(models.CourseChallenge.course_id == course_id))
    challenges = result.scalars().all()
    
    # 4. Serialize Data (Convert SQLAlchemy Objects to Dicts for JSON)
    challenges_data = []
    for c in challenges:
        challenges_data.append({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "difficulty": c.difficulty,
            "test_cases": c.test_cases, # Assuming this is JSON string or Dict
            "course_id": c.course_id
        })

    # 5. Save to Redis (Expire in 1 hour)
    try:
        await redis_client.setex(cache_key, 3600, json.dumps(challenges_data))
    except Exception as e:
        print(f"Failed to cache data: {e}")

    print("🐢 Serving Challenges from Database")
    return challenges_data

# 3️⃣ ADD CREATE CHALLENGE
@app.post("/api/v1/courses/{course_id}/challenges")
async def create_course_challenge(course_id: int, challenge: ChallengeCreate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    new_challenge = models.CourseChallenge(
        title=challenge.title,
        description=challenge.description,
        difficulty=challenge.difficulty,
        test_cases=challenge.test_cases,
        course_id=course_id
    )
    db.add(new_challenge)
    await db.commit()
    cache_key = f"course_{course_id}_challenges"
    await redis_client.delete(cache_key)
    print(f"🗑️ Cache cleared for {cache_key}")
    return {"message": "Challenge added"}

@app.post("/api/v1/login-otp")
async def login_otp(req: OTPLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.phone_number == req.phone_number))
    # ... logic continues
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found with this phone number")
    
    # 2. Since Firebase already verified the OTP on frontend, 
    # we trust the request and issue a JWT
    token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role}

@app.post("/api/v1/proctoring/violation")
async def record_violation(report: ViolationReport, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_student)):
    res = await db.execute(select(models.LessonProgress).where(models.LessonProgress.user_id == current_user.id, models.LessonProgress.content_item_id == report.lesson_id))
    progress = res.scalars().first()
    
    if not progress:
        progress = models.LessonProgress(user_id=current_user.id, content_item_id=report.lesson_id, is_completed=False, violation_count=1)
        db.add(progress)
    else:
        if progress.is_terminated:
            return {"status": "terminated", "message": "Already terminated", "violation_count": progress.violation_count}
            
        progress.violation_count += 1
        
        # ✅ FIX 1: Strict Logic. If count is 2 or more, Terminate.
        if progress.violation_count > 2: 
            progress.is_terminated = True
            progress.is_completed = False
            
    await db.commit()
    
    return {
        "status": "terminated" if progress.is_terminated else "warning", 
        "violation_count": progress.violation_count,
        # ✅ FIX 2: Correct math for frontend display (Max 2)
        "remaining_attempts": max(0, 2 - progress.violation_count) 
    }
    
# ✅ NEW: Helper to refresh status instantly on frontend mount
@app.get("/api/v1/proctoring/status/{lesson_id}")
async def get_lesson_status(lesson_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    res = await db.execute(select(models.LessonProgress).where(
        models.LessonProgress.user_id == current_user.id, 
        models.LessonProgress.content_item_id == lesson_id
    ))
    progress = res.scalars().first()
    
    if not progress:
        return {"is_terminated": False, "violation_count": 0}
        
    return {
        "is_terminated": progress.is_terminated,
        "violation_count": progress.violation_count
    }    
    
@app.patch("/api/v1/modules/{module_id}")
async def update_module(module_id: int, update: ModuleUpdate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    res = await db.execute(select(models.Module).where(models.Module.id == module_id))
    module = res.scalars().first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    module.title = update.title
    await db.commit()
    return {"message": "Module renamed"}

# 2. Delete Module (Cascade)
@app.delete("/api/v1/modules/{module_id}")
async def delete_module(module_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    # Fetch module with items to delete dependencies
    res = await db.execute(select(models.Module).options(selectinload(models.Module.items)).where(models.Module.id == module_id))
    module = res.scalars().first()
    
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    try:
        # Delete dependencies for ALL items in this module
        for item in module.items:
            await db.execute(delete(models.LessonProgress).where(models.LessonProgress.content_item_id == item.id))
            await db.execute(delete(models.Submission).where(models.Submission.content_item_id == item.id))
        
        # Now delete items
        await db.execute(delete(models.ContentItem).where(models.ContentItem.module_id == module_id))
        
        # Finally delete module
        await db.delete(module)
        await db.commit()
        return {"message": "Module deleted"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# 3. Reorder Items
class ReorderRequest(BaseModel):
    item_ids: List[int] # List of IDs in the new order

@app.put("/api/v1/modules/{module_id}/reorder")
async def reorder_module_items(module_id: int, req: ReorderRequest, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    # Update the 'order' field for each item based on its index in the list
    for index, item_id in enumerate(req.item_ids):
        await db.execute(
            models.ContentItem.__table__.update()
            .where(models.ContentItem.id == item_id)
            .values(order=index)
        )
    await db.commit()
    return {"message": "Order updated"}    

@app.post("/api/v1/notifications/send")
async def send_notification(req: NotificationRequest, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    recipients = []
    
    # Logic 1: Send to All Students
    if req.target_type == "all":
        res = await db.execute(select(models.User.id).where(models.User.role == "student"))
        recipients = res.scalars().all()
    
    # Logic 2: Send to Students in Specific Course
    elif req.target_type == "course":
        res = await db.execute(select(models.Enrollment.user_id).where(models.Enrollment.course_id == req.target_id))
        recipients = res.scalars().all()
        
    # Logic 3: Send to Single Student
    elif req.target_type == "student":
        recipients = [req.target_id]

    # Bulk Insert
    for uid in recipients:
        new_notif = models.Notification(
            user_id=uid,
            title="Message from Instructor",
            message=req.message,
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(new_notif)
    
    await db.commit()
    return {"message": f"Sent to {len(recipients)} students."}

# 2. Student Gets Notifications
@app.get("/api/v1/notifications")
async def get_notifications(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_student)):
    res = await db.execute(
        select(models.Notification)
        .where(models.Notification.user_id == current_user.id)
        .order_by(models.Notification.created_at.desc())
    )
    return res.scalars().all()

# 3. Mark as Read (Optional, happens when they open the page)
@app.patch("/api/v1/notifications/read")
async def mark_notifications_read(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_student)):
    await db.execute(
        models.Notification.__table__.update()
        .where(models.Notification.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "Marked read"}

# 4. Delete Notification
@app.delete("/api/v1/notifications/{notif_id}")
async def delete_notification(notif_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_student)):
    await db.execute(delete(models.Notification).where(models.Notification.id == notif_id, models.Notification.user_id == current_user.id))
    await db.commit()
    return {"message": "Deleted"}

@app.get("/api/v1/users/me")
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "phone_number": current_user.phone_number
    }

@app.post("/api/v1/admin/trigger-backup")
async def manual_backup(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(require_instructor)):
    # Run the backup synchronously
    backup_path = backup_manager.create_local_backup()
    if backup_path:
        backup_manager.upload_to_drive(backup_path)
        backup_manager.cleanup_old_backups()
        return {"message": "Backup triggered successfully!"}
    return {"message": "Backup failed."}
    
@app.get("/")
def read_root(): return {"status": "online", "message": "iQmath Military Grade API Active 🟢"}
