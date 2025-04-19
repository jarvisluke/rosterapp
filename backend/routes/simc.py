import datetime
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from base64 import b64decode

from pydantic import BaseModel
import redis

from core.simc import SimcClient
from core.log import log

router = APIRouter()
simc_client = SimcClient()
r = redis.Redis(host='localhost', port=6379, db=0)

class SimulationInput(BaseModel):
    simc_input: str

@router.post("/simulate", response_class=HTMLResponse)
async def run_simulation(simulation: SimulationInput):
    try:
        # Decode the base64 input
        decoded_input = b64decode(simulation.simc_input).decode("utf-8")
        # Run simulation and return html
        output_file = await simc_client.run_simulation(decoded_input)
        with open(output_file, "r") as f:
            content = f.read()
        return HTMLResponse(content=content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/simulate/async")
async def queue_simulation(simulation: SimulationInput):
    job_id = str(uuid4())
    job = {
        "id": job_id,
        "input": simulation.simc_input,
        "status": "QUEUED",
        "created_at": datetime.now().isoformat()
    }
    
    # Store job details
    r.hset(f"job:{job_id}", mapping=job)
    # Add to queue
    r.rpush("simulation_queue", job_id)
    # Get queue position
    position = r.llen("simulation_queue")
    
    return JSONResponse({
        "job_id": job_id,
        "status": "QUEUED",
        "queue_position": position,
        "estimated_wait": position * 30  # Simple estimate: 30 seconds per job
    })

# Get job status
@router.get("/simulate/status/{job_id}")
async def get_job_status(job_id: str):
    job_data = r.hgetall(f"job:{job_id}")
    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = {k.decode(): v.decode() for k, v in job_data.items()}
    
    # Add queue position if still queued
    if job["status"] == "QUEUED":
        queue = r.lrange("simulation_queue", 0, -1)
        try:
            position = next(i for i, j_id in enumerate(queue) if j_id.decode() == job_id) + 1
            job["queue_position"] = position
            job["estimated_wait"] = position * 30  # Simple estimate
        except StopIteration:
            job["queue_position"] = 0  # Job in system but not in queue
    
    return JSONResponse(job)

# Get job result
@router.get("/simulate/result/{job_id}", response_class=HTMLResponse)
async def get_job_result(job_id: str):
    job_data = r.hgetall(f"job:{job_id}")
    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = {k.decode(): v.decode() for k, v in job_data.items()}
    
    if job["status"] != "COMPLETED":
        raise HTTPException(status_code=400, detail=f"Job is {job['status']}, not complete")
    
    try:
        with open(job["result_path"], "r") as f:
            content = f.read()
        return HTMLResponse(content=content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/queue/status")
async def queue_status():
    queue_length = r.llen("simulation_queue")
    active_jobs = r.keys("job:*")
    active_jobs_count = len(active_jobs)
    
    # Get recent job durations for estimation
    completed_jobs = [
        {k.decode(): v.decode() for k, v in r.hgetall(job_key).items()}
        for job_key in active_jobs  
        if r.hget(job_key, "status").decode() == "COMPLETED"
        and r.hexists(job_key, "duration")
    ]
    
    avg_duration = 30  # Default assumption
    if completed_jobs:
        durations = [float(job["duration"]) for job in completed_jobs[-10:] if "duration" in job]
        if durations:
            avg_duration = sum(durations) / len(durations)
    
    return {
        "queue_length": queue_length,
        "active_jobs": active_jobs_count,
        "avg_job_duration": avg_duration,
        "estimated_wait_for_new_job": queue_length * avg_duration
    }