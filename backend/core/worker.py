"""import redis
import time
import json
import os
from datetime import datetime
from core.simc import SimcClient
from base64 import b64decode

# Get Redis configuration from environment
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)
simc_client = SimcClient()"""
import redis
import time
import json
from datetime import datetime
from core.simc import SimcClient
from base64 import b64decode

r = redis.Redis(host='localhost', port=6379, db=0)
simc_client = SimcClient()

def process_queue():
    while True:
        # Get job from queue, blocking until one is available
        job_id_bytes = r.blpop("simulation_queue", timeout=1)
        if not job_id_bytes:
            time.sleep(1)
            continue
        
        job_id = job_id_bytes[1].decode()
        print(f"Processing job: {job_id}")
        
        # Update status
        r.hset(f"job:{job_id}", "status", "PROCESSING")
        r.hset(f"job:{job_id}", "started_at", datetime.now().isoformat())
        
        try:
            # Get job data
            job_data = {k.decode(): v.decode() for k, v in r.hgetall(f"job:{job_id}").items()}
            decoded_input = b64decode(job_data["input"]).decode("utf-8")
            
            # Run simulation
            output_file = simc_client.run_simulation(decoded_input)
            
            # Update job with result
            r.hset(f"job:{job_id}", "status", "COMPLETED")
            r.hset(f"job:{job_id}", "completed_at", datetime.now().isoformat())
            r.hset(f"job:{job_id}", "result_path", output_file)
            
            # Calculate duration
            start = datetime.fromisoformat(job_data["started_at"])
            end = datetime.fromisoformat(datetime.now().isoformat())
            duration = (end - start).total_seconds()
            r.hset(f"job:{job_id}", "duration", str(duration))
            
        except Exception as e:
            # Handle errors
            r.hset(f"job:{job_id}", "status", "FAILED")
            r.hset(f"job:{job_id}", "error", str(e))
            print(f"Error processing job {job_id}: {e}")

if __name__ == "__main__":
    print("Worker starting...")
    process_queue()