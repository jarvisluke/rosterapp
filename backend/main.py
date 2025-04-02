from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import create_db_and_tables
from routes import (
    account, 
    user, 
    character, 
    guild, 
    roster, 
    item,
    simc,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(account.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(character.router, prefix="/api")
app.include_router(guild.router, prefix="/api")
app.include_router(roster.router, prefix="/api")
app.include_router(item.router, prefix="/api")
app.include_router(simc.router, prefix="/api")
[app.include_router(i.router, prefix="/api") for i in [account, user, character, guild, roster, item]]