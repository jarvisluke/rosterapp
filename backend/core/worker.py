import redis
import time
import json
import asyncio
import logging
from datetime import datetime
from core.simc import SimcClient
from base64 import b64decode
import inspect

# Set up logging
logging.basicConfig(level=logging.INFO, format='[Worker] %(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

r = redis.Redis(host='localhost', port=6379, db=0)
simc_client = SimcClient()

async def process_job(job_id):
    """Process a single simulation job asynchronously"""
    logger.info(f"Starting processing of job: {job_id}")
    r.hset(f"job:{job_id}", "status", "PROCESSING")
    r.hset(f"job:{job_id}", "started_at", datetime.now().isoformat())
    
    try:
        # Get job data
        job_data = {k.decode(): v.decode() for k, v in r.hgetall(f"job:{job_id}").items()}
        decoded_input = b64decode(job_data["input"]).decode("utf-8")
        logger.info(f"Decoded input for job {job_id} (first 50 chars): {decoded_input[:50]}...")
        
        # IMPORTANT: Explicitly handle coroutine
        logger.info("Calling run_simulation...")
        result_or_coro = simc_client.run_simulation(decoded_input)
        logger.info(f"Result type: {type(result_or_coro)}")
        
        # If it's a coroutine, await it
        if asyncio.iscoroutine(result_or_coro):
            logger.info("Result is a coroutine, awaiting it...")
            output_file = await result_or_coro
        else:
            logger.info("Result is not a coroutine")
            output_file = result_or_coro
        
        logger.info(f"Simulation completed for job {job_id}: {output_file}")
        
        # Update job with result
        r.hset(f"job:{job_id}", "status", "COMPLETED")
        r.hset(f"job:{job_id}", "completed_at", datetime.now().isoformat())
        r.hset(f"job:{job_id}", "result_path", output_file)
        
        # Calculate duration
        start = datetime.fromisoformat(job_data["started_at"])
        end = datetime.fromisoformat(datetime.now().isoformat())
        duration = (end - start).total_seconds()
        r.hset(f"job:{job_id}", "duration", str(duration))
        
        logger.info(f"Job {job_id} completed successfully in {duration:.2f} seconds")
        
    except Exception as e:
        logger.error(f"Error processing job {job_id}: {e}", exc_info=True)
        r.hset(f"job:{job_id}", "status", "FAILED")
        r.hset(f"job:{job_id}", "error", str(e))

async def process_queue_async():
    """Process the queue asynchronously"""
    logger.info("Worker starting...")
    
    while True:
        # Get job from queue, non-blocking
        job_id_bytes = r.lpop("simulation_queue")  
        if not job_id_bytes:
            await asyncio.sleep(1)
            continue
        
        job_id = job_id_bytes.decode()
        logger.info(f"Processing job: {job_id}")
        
        # Process the job
        await process_job(job_id)

def main():
    """Main entry point for the worker"""
    try:
        asyncio.run(process_queue_async())
    except KeyboardInterrupt:
        logger.info("Worker shutting down...")
    except Exception as e:
        logger.error(f"Worker crashed: {e}", exc_info=True)

if __name__ == "__main__":
    main()