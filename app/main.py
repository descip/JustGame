from fastapi import FastAPI
from sqlalchemy import text
from app.db.session import engine, Base
from app.api.routes import auth, machines, bookings, sessions, health

app = FastAPI(title="PC Club CRM API", version="0.1.0")

# Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(machines.router)
app.include_router(bookings.router)
app.include_router(sessions.router)

@app.on_event("startup")
async def on_startup():
    # Create tables automatically for dev/demo
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
