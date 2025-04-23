#!/bin/bash

# cleanup.sh - Kills all processes started by the run script

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Parse arguments
FORCE=false
CLEAN_DEV=false
CLEAN_PROD=false

for arg in "$@"; do
    case $arg in
        -f|--force)
            FORCE=true
            ;;
        --dev)
            CLEAN_DEV=true
            ;;
        --prod)
            CLEAN_PROD=true
            ;;
    esac
done

# If no mode specified, clean both
if [ "$CLEAN_DEV" = false ] && [ "$CLEAN_PROD" = false ]; then
    CLEAN_DEV=true
    CLEAN_PROD=true
fi

# Function to check if PID is running
is_running() {
    kill -0 "$1" 2>/dev/null
    return $?
}

# Function to clean processes for a specific mode
clean_mode() {
    local MODE=$1
    local PID_FILE="./.service_pids_${MODE}.txt"
    
    # Check if PID file exists
    if [ ! -f "$PID_FILE" ]; then
        echo -e "${YELLOW}No running ${MODE} services found. PID file does not exist.${NC}"
        return
    fi
    
    echo -e "${GREEN}Cleaning up ${MODE} services...${NC}"
    
    # Read PIDs from file
    PIDS=()
    while IFS= read -r line; do
        # Ignore comments and empty lines
        if [[ ! "$line" =~ ^#.*$ ]] && [ -n "$line" ]; then
            PIDS+=("$line")
        fi
    done < "$PID_FILE"
    
    if [ ${#PIDS[@]} -eq 0 ]; then
        echo -e "${YELLOW}No process IDs found in ${MODE} PID file.${NC}"
        rm -f "$PID_FILE"
        return
    fi
    
    # Kill processes
    local killed_count=0
    local skipped_count=0
    
    if [ "$FORCE" = true ]; then
        echo -e "${YELLOW}Forcing immediate termination of ${MODE} services...${NC}"
        for pid in "${PIDS[@]}"; do
            if is_running "$pid"; then
                kill -9 "$pid" 2>/dev/null
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}Killed ${MODE} process $pid (forced)${NC}"
                    ((killed_count++))
                else
                    echo -e "${RED}Failed to kill ${MODE} process $pid${NC}"
                    ((skipped_count++))
                fi
            else
                echo -e "${YELLOW}Process $pid is not running${NC}"
                ((skipped_count++))
            fi
        done
    else
        # Step 1: Try graceful shutdown with SIGTERM
        for pid in "${PIDS[@]}"; do
            if is_running "$pid"; then
                kill "$pid" 2>/dev/null
                echo -e "${GREEN}Sent SIGTERM to ${MODE} process $pid${NC}"
            else
                echo -e "${YELLOW}Process $pid is not running${NC}"
                ((skipped_count++))
            fi
        done
        
        # Step 2: Wait for processes to terminate
        echo -e "${YELLOW}Waiting for ${MODE} services to shut down gracefully...${NC}"
        sleep 3
        
        # Step 3: Check and force kill if needed
        for pid in "${PIDS[@]}"; do
            if is_running "$pid"; then
                echo -e "${YELLOW}Process $pid still running, sending SIGKILL${NC}"
                kill -9 "$pid" 2>/dev/null
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}Killed ${MODE} process $pid (forced)${NC}"
                    ((killed_count++))
                else
                    echo -e "${RED}Failed to kill ${MODE} process $pid${NC}"
                    ((skipped_count++))
                fi
            else
                echo -e "${GREEN}Process $pid terminated gracefully${NC}"
                ((killed_count++))
            fi
        done
    fi
    
    echo -e "${GREEN}${MODE} shutdown summary:${NC}"
    echo -e "  ${GREEN}$killed_count processes terminated${NC}"
    echo -e "  ${YELLOW}$skipped_count processes skipped/already terminated${NC}"
    
    # Remove PID file
    rm -f "$PID_FILE"
    echo -e "${GREEN}${MODE} cleanup complete.${NC}"
    echo
}

# Main execution
echo -e "${GREEN}Starting cleanup process...${NC}"
echo

# Clean up dev processes if requested
if [ "$CLEAN_DEV" = true ]; then
    clean_mode "dev"
fi

# Clean up prod processes if requested
if [ "$CLEAN_PROD" = true ]; then
    clean_mode "prod"
fi

echo -e "${GREEN}All cleanup operations complete.${NC}"