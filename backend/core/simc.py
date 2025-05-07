import uuid
import dotenv
import os
import asyncio
from datetime import datetime
from typing import Optional, AsyncGenerator

from core.cache import cache_simc_result
from core.output_filter import SafeOutputFilter

dotenv.load_dotenv()

simc = os.getenv("SIMC")

class SimcClient:
    """Singleton client for SimulationCraft operations with streaming support"""
    
    def __init__(self):
        self.simulations_dir = "simulations"
        os.makedirs(self.simulations_dir, exist_ok=True)
        self.inputs_dir = "inputs"
        os.makedirs(self.inputs_dir, exist_ok=True)
        self.output_filter = SafeOutputFilter()

    async def stream_simulation(self, input_text: str) -> AsyncGenerator[dict, None]:
        """Run simulation with streaming output"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        filename = f"simc_{timestamp}_{unique_id}"

        input_file = f"{self.inputs_dir}/{filename}.simc"
        with open(input_file, "w") as f:
            f.write(input_text)

        output_file = f"{self.simulations_dir}/{filename}.html"
        command = [simc, input_file, f"html={output_file}"]

        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            # Stream stdout
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                    
                decoded_line = line.decode().rstrip()
                filtered_line = self.output_filter.filter_line(decoded_line)
                
                # Detect progress
                progress = self._extract_progress(filtered_line)
                
                yield {
                    "type": "stdout",
                    "content": filtered_line,
                    "progress": progress
                }

            # Stream stderr if any
            stderr_output = await process.stderr.read()
            if stderr_output:
                filtered_stderr = self.output_filter.filter_text(stderr_output.decode())
                yield {
                    "type": "stderr",
                    "content": filtered_stderr
                }

            # Wait for process to complete
            return_code = await process.wait()
            
            if return_code != 0:
                yield {
                    "type": "error",
                    "content": f"SimC exited with code {return_code}"
                }
            else:
                yield {
                    "type": "complete",
                    "content": output_file
                }

        except Exception as e:
            yield {
                "type": "error",
                "content": self.output_filter.filter_text(str(e))
            }
        finally:
            if os.path.exists(input_file):
                os.remove(input_file)

    def _extract_progress(self, line: str) -> Optional[float]:
        """Extract progress from SimC output lines"""
        # SimC often outputs progress like: "Generating baseline: 100%"
        progress_patterns = [
            r'(\d+)%',
            r'Progress:\s*(\d+)',
            r'Completed:\s*(\d+)/(\d+)'
        ]
        
        for pattern in progress_patterns:
            import re
            match = re.search(pattern, line)
            if match:
                if len(match.groups()) == 2:  # For completed/total pattern
                    completed = int(match.group(1))
                    total = int(match.group(2))
                    return (completed / total) * 100
                else:  # For percentage pattern
                    return float(match.group(1))
        return None

    @cache_simc_result
    async def run_simulation(self, input: str):
        """Existing method for backward compatibility"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        filename = f"simc_{timestamp}_{unique_id}"

        input_file = f"{self.inputs_dir}/{filename}.simc"
        with open(input_file, "w") as f:
            f.write(input)

        output_file = f"{self.simulations_dir}/{filename}.html"
        command = [simc, input_file, f"html={output_file}"]

        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_message = stderr.decode() if stderr else 'No error message provided'
                filtered_error = self.output_filter.filter_text(error_message)
                raise Exception(f"SimC exited with code {process.returncode}: {filtered_error}")
                
            if not os.path.exists(output_file):
                raise Exception(f"SimC did not create output file: {output_file}")
                
            return output_file
        except Exception as e:
            error_file = f"{self.simulations_dir}/error_{timestamp}_{unique_id}.txt"
            with open(error_file, 'w') as f:
                f.write(f"Command: {' '.join(command)}\n")
                f.write(f"Error: {self.output_filter.filter_text(str(e))}")
            raise e
        finally:
            if os.path.exists(input_file):
                os.remove(input_file)

# Create a global instance
simc_client = SimcClient()

# Dependency injection function
from fastapi import Request

async def get_simc_client(request: Request) -> SimcClient:
    """
    Dependency injection function for SimcClient.
    
    This retrieves the SimcClient instance from the app state
    that was created during startup.
    """
    if not hasattr(request.app.state, 'simc_client'):
        request.app.state.simc_client = SimcClient()
    return request.app.state.simc_client