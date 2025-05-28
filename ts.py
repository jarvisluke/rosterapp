import asyncio
import websockets
import json
import time

async def test_websocket():
    uri = "ws://localhost:8000/api/test-socket"
    
    try:
        print(f"Connecting to {uri}...")
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            
            # Wait for welcome message
            response = await websocket.recv()
            print(f"Received: {response}")
            
            # Send a test message
            test_message = {
                "type": "test",
                "message": "Hello from test script",
                "timestamp": time.time()
            }
            await websocket.send(json.dumps(test_message))
            print(f"Sent: {test_message}")
            
            # Wait for echo
            response = await websocket.recv()
            print(f"Received echo: {response}")
            
            # Send another message
            await websocket.send("Plain text message")
            print("Sent plain text message")
            
            # Wait for echo
            response = await websocket.recv()
            print(f"Received echo: {response}")
            
            print("Test completed successfully!")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())