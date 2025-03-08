#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

TUNNEL_INFO_DIR="$(pwd)/.cloudflare"

echo -e "${GREEN}Stopping Cloudflare tunnels and servers...${NC}"

# Function to kill process by PID file
kill_process() {
    local pid_file=$1
    local process_name=$2
    
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            echo -e "${GREEN}Stopped $process_name (PID: $pid)${NC}"
        else
            echo -e "${RED}$process_name process (PID: $pid) is not running${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "${RED}PID file for $process_name not found${NC}"
    fi
}

# Kill backend processes
kill_process "${TUNNEL_INFO_DIR}/backend_tunnel_pid.txt" "backend tunnel"
kill_process "${TUNNEL_INFO_DIR}/backend_server_pid.txt" "backend server"

# Kill frontend processes
kill_process "${TUNNEL_INFO_DIR}/frontend_tunnel_pid.txt" "frontend tunnel"
kill_process "${TUNNEL_INFO_DIR}/frontend_server_pid.txt" "frontend server"

echo -e "${GREEN}All tunnels and servers stopped.${NC}"
