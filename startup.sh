#!/bin/bash

# run.sh - Unified script for running services in dev or prod mode

# Define colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default mode
MODE="dev"

# Parse command line args
for arg in "$@"; do
    case $arg in
        --dev)
            MODE="dev"
            ;;
        --prod)
            MODE="prod"
            ;;
        -h|--help)
            echo "Usage: $0 [--dev|--prod]"
            echo "  --dev    Run services in development mode (default)"
            echo "  --prod   Run services in production mode"
            echo "  -h/--help Show this help message"
            exit 0
            ;;
    esac
done

echo -e "${GREEN}Starting services in ${MODE} mode...${NC}"

# PID file location based on mode
PID_FILE="./.service_pids_${MODE}.txt"

# Check if we're in the correct directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}Error: This script must be run from the root project directory${NC}"
    echo -e "${YELLOW}Current directory: $(pwd)${NC}"
    exit 1
fi

# Function to add service label while preserving ANSI colors
prefix_output() {
    local prefix=$1
    local color=$2
    
    if [ "$MODE" = "prod" ]; then
        # Simpler output for production
        while IFS= read -r line; do
            echo -e "[${prefix}] ${line}"
        done
    else
        # Colorized output for development
        while IFS= read -r line; do
            printf "\033[${color}m[${prefix}]\033[0m %s\n" "${line}"
        done
    fi
}

# Function to clean up on exit
cleanup() {
    echo
    echo -e "${GREEN}Initiating shutdown...${NC}"
    
    # Call cleanup script with appropriate mode
    bash ./cleanup.sh --${MODE}
    
    # Deactivate virtual environment if we activated it
    if [ "$VENV_ACTIVATED_BY_SCRIPT" = true ]; then
        deactivate 2>/dev/null || true
        echo -e "${YELLOW}Virtual environment deactivated${NC}"
    fi
    
    exit 0
}

# Check and activate virtual environment
activate_venv() {
    local venv_path="./.venv"
    
    # Check if virtual environment exists
    if [ ! -d "$venv_path" ]; then
        echo -e "${RED}Error: Virtual environment not found at ${venv_path}${NC}"
        exit 1
    fi
    
    # Check if virtual environment is already active
    if [ -z "$VIRTUAL_ENV" ]; then
        echo -e "${YELLOW}Activating virtual environment at ${venv_path}...${NC}"
        source "$venv_path/bin/activate"
        VENV_ACTIVATED_BY_SCRIPT=true
    else
        echo -e "${GREEN}Virtual environment is already active: ${VIRTUAL_ENV}${NC}"
        VENV_ACTIVATED_BY_SCRIPT=false
    fi
}

# Clean up any existing PID file
rm -f "$PID_FILE"
echo "# Service PIDs (${MODE} mode) - Created $(date)" > "$PID_FILE"
echo "# Do not modify this file manually" >> "$PID_FILE"

# Trap signals to call cleanup
trap cleanup SIGINT SIGTERM

# Activate virtual environment
activate_venv

# Handle dependencies based on mode
if [ "$MODE" = "prod" ]; then
    # Install backend dependencies
    echo -e "${BLUE}Checking backend dependencies...${NC}"
    cd backend
    pip install -q -r requirements.txt
    cd ..
    
    # Build frontend for production
    echo -e "${BLUE}Building frontend for production...${NC}"
    cd frontend
    npm install
    npm run build
    cd ..
fi

# Start Redis
echo -e "${BLUE}Starting Redis...${NC}"
redis-server 2>&1 | prefix_output "Redis" "0;31" &
REDIS_PID=$!
echo "$REDIS_PID" >> "$PID_FILE"

sleep 2  # Give Redis time to start

# Start backend based on mode
if [ "$MODE" = "dev" ]; then
    # Dev mode - FastAPI development server
    echo -e "${BLUE}Starting FastAPI backend in dev mode...${NC}"
    (cd backend && fastapi dev 2>&1 | prefix_output "Backend" "0;35") &
    BACKEND_PID=$!
else
    # Prod mode - uvicorn with workers
    echo -e "${BLUE}Starting FastAPI backend in production mode...${NC}"
    (cd backend && python -u -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4 2>&1 | prefix_output "Backend" "0;35") &
    BACKEND_PID=$!
fi
echo "$BACKEND_PID" >> "$PID_FILE"

# Start Worker (same in both modes)
echo -e "${BLUE}Starting Worker...${NC}"
(cd backend && python -u -m core.worker 2>&1 | prefix_output "Worker" "0;33") &
WORKER_PID=$!
echo "$WORKER_PID" >> "$PID_FILE"

# Start Frontend based on mode
if [ "$MODE" = "dev" ]; then
    # Dev mode - npm development server
    echo -e "${BLUE}Starting React frontend in dev mode...${NC}"
    (cd frontend && npm run dev 2>&1 | prefix_output "Frontend" "0;36") &
    FRONTEND_PID=$!
else
    # Prod mode - serve built static files
    echo -e "${BLUE}Starting frontend static server...${NC}"
    (cd frontend && npx serve -s build -l 3000 2>&1 | prefix_output "Frontend" "0;36") &
    FRONTEND_PID=$!
fi
echo "$FRONTEND_PID" >> "$PID_FILE"

echo
echo -e "${GREEN}All services started in ${MODE} mode. Press Ctrl+C to stop all services.${NC}"
echo -e "${YELLOW}Service PIDs recorded in ${PID_FILE}${NC}"

# Wait for all background processes
wait