import uuid
import dotenv
import os
import asyncio
from datetime import datetime
from typing import Optional

from core.cache import cache_simc_result

dotenv.load_dotenv()

simc = os.getenv("SIMC")

class SimcClient:
    def __init__(self):
        self.simulations_dir = "simulations"
        os.makedirs(self.simulations_dir, exist_ok=True)
        self.inputs_dir = "inputs"
        os.makedirs(self.inputs_dir, exist_ok=True)

    @cache_simc_result
    async def run_simulation(self, input: str):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        filename = f"simc_{timestamp}_{unique_id}"

        input_file = f"{self.inputs_dir}/{filename}.simc"
        with open(input_file, "w") as f:
            f.write(input)

        output_file = f"{self.simulations_dir}/{filename}.html"
        
        command = [simc, input_file, f"html={output_file}"]

        try:
            # Run subprocess asynchronously
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_message = stderr.decode() if stderr else 'No error message provided'
                raise Exception(f"SimC exited with code {process.returncode}: {error_message}")
                
            # Check if output file was created
            if not os.path.exists(output_file):
                raise Exception(f"SimC did not create output file: {output_file}")
                
            return output_file
        except Exception as e:
            # Handle simulation errors
            error_file = f"{self.simulations_dir}/error_{timestamp}_{unique_id}.txt"
            with open(error_file, 'w') as f:
                f.write(f"Command: {' '.join(command)}\n")
                f.write(f"Error: {str(e)}")
            # Raise error instead of returning error file for proper error handling
            raise e
        finally:
            # Clean up input file
            if os.path.exists(input_file):
                os.remove(input_file)