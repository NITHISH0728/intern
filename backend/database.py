from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os
from dotenv import load_dotenv

# Load .env to get the secret Database URL
load_dotenv()

# 1. Get the DB URL
# We assume your .env has: DATABASE_URL="postgresql://user:pass@localhost/dbname"
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL is missing in .env file! Cannot start server.")

# 🔒 CONCRETE FIX: Ensure we use the Async Driver (asyncpg)
# If the URL in .env is "postgresql://...", this line forces it to "postgresql+asyncpg://..."
if "postgresql+asyncpg" not in DATABASE_URL:
    ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
else:
    ASYNC_DATABASE_URL = DATABASE_URL

# 2. The Concrete Pillar (Asynchronous Connection Pool)
# This engine handles non-blocking I/O. 
engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,             # Set True only for debugging (logs every SQL query)
    pool_size=20,           # Keep 20 connections open
    max_overflow=40,        # Burst capacity for 1000 users
    pool_timeout=30,        # 30s wait time before error
    pool_recycle=1800,      # Recycle connections every 30 mins
    pool_pre_ping=True      # ✅ SELF-HEALING: Checks connection health before use
)

# 3. The Session Factory (Async)
# This creates sessions that don't block the server thread
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

# 4. Dependency Injection Helper
# You will import this into main.py to get database sessions
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()