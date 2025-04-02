from typing import Annotated
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from base64 import b64decode

from pydantic import BaseModel

from core.simc import SimcClient
from core.log import log

router = APIRouter()
simc_client = SimcClient()

class SimulationInput(BaseModel):
    simc_input: str

@router.post("/simulate", response_class=HTMLResponse)
async def run_simulation(simulation: SimulationInput):
    log.info(simulation)
    try:
        # Decode the base64 input
        decoded_input = b64decode(simulation.simc_input).decode("utf-8")
        log.info(decoded_input)
        # Run simulation and return html
        output_file = await simc_client.run_simulation(decoded_input)
        with open(output_file, "r") as f:
            content = f.read()
        return HTMLResponse(content=content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
