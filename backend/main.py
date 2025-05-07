from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import create_db_and_tables
from core.bliz import BlizzardAPIClient
from core.simc import SimcClient
from core.websocket import WebSocketManager
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
    """FastAPI lifespan events for startup and shutdown."""
    # Startup: Create database tables and initialize clients
    create_db_and_tables()
    
    # Create singleton instances that will be shared across all requests
    app.state.blizzard_client = BlizzardAPIClient()
    app.state.simc_client = SimcClient()
    app.state.websocket_manager = WebSocketManager()
    
    yield  # Application is running
    
    # Shutdown: Clean up resources
    await app.state.blizzard_client.close()

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