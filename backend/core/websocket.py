from typing import Dict, Any
from fastapi import WebSocket, Request
from uuid import uuid4

class WebSocketManager:
    """Singleton manager for WebSocket connections with lifecycle management"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        
    async def connect(self, websocket: WebSocket) -> str:
        """Connect and accept a websocket connection, returning a unique client_id"""
        await websocket.accept()
        client_id = str(uuid4())
        self.active_connections[client_id] = websocket
        return client_id
        
    def disconnect(self, client_id: str) -> None:
        """Disconnect a client and remove from active connections"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            
    async def send_message(self, client_id: str, message: Dict[str, Any]) -> bool:
        """Send message to specific client, returns success status"""
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(message)
            return True
        return False
        
    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients"""
        disconnected_clients = []
        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception as e:
                self.logger.error(f"Error broadcasting to client {client_id}: {e}")
                disconnected_clients.append(client_id)
                
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            self.disconnect(client_id)
    
    def get_connection_count(self) -> int:
        """Return the number of active connections"""
        return len(self.active_connections)
        
    def is_connected(self, client_id: str) -> bool:
        """Check if a client is still connected"""
        return client_id in self.active_connections

# Create a global instance
websocket_manager = WebSocketManager()

# Dependency injection function
async def get_websocket_manager(websocket: WebSocket) -> WebSocketManager:
    """
    Dependency injection function for WebSocketManager.
    """
    if not hasattr(websocket.app.state, 'websocket_manager'):
        websocket.app.state.websocket_manager = WebSocketManager()
    return websocket.app.state.websocket_manager