from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os
from dotenv import load_dotenv
import redis.asyncio as redis

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL is missing in .env file!")

# Ensure Async Driver
if "postgresql+asyncpg" not in DATABASE_URL:
    ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
else:
    ASYNC_DATABASE_URL = DATABASE_URL

# 🟢 FIX: OPTIMIZED FOR FREE TIER
engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    # ⚠️ CRITICAL CHANGE: Reduced to prevent "Too many clients" error
    pool_size=5,            # Keep only 5 connections open (Safe for Free Tier)
    max_overflow=10,        # Allow 10 max during traffic spikes
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True      # Check connection before using
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379") 
redis_client = redis.from_url(REDIS_URL, decode_responses=True)