import uuid
import dotenv
import os
import subprocess
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
            subprocess.run(args=command, capture_output=True)
            return output_file
        except subprocess.CalledProcessError as e:
            # Handle simulation errors
            error_file = f"{self.simulations_dir}/error_{timestamp}_{unique_id}.txt"
            with open(error_file, 'w') as f:
                f.write(f"Command: {' '.join(command)}\n")
                f.write(f"Error: {e.stderr}")
            return error_file
        finally:
            os.remove(input_file)