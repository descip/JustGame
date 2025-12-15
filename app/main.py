import asyncio
from fastapi import FastAPI
from sqlalchemy import text

from app.db.session import engine, Base
from app.api.routes import auth, machines, bookings, sessions, health, payments, reports, audit_logs
from app.core.auto_close import auto_close_loop
from app.models import audit_log  # noqa: F401

app = FastAPI(title="PC Club CRM API", version="0.1.0")

# Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(machines.router)
app.include_router(bookings.router)
app.include_router(sessions.router)
app.include_router(payments.router)
app.include_router(reports.router)
app.include_router(audit_logs.router)

@app.on_event("startup")
async def on_startup():
    # Create tables automatically for dev/demo
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start background auto-close loop
    asyncio.create_task(auto_close_loop())

