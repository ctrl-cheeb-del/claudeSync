#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Claude Code Web Interface - Cloudflare Tunnel Setup ===${NC}\n"

# Debug mode - set to true to enable additional debugging output
DEBUG=true

# Debug logging function
debug_log() {
    if [ "$DEBUG" = true ]; then
        echo -e "${YELLOW}[DEBUG] $1${NC}"
    fi
}

# Function to wait for a port to be ready
wait_for_port() {
    local port=$1
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Waiting for port ${port} to be ready...${NC}"
    
    while ! nc -z localhost $port 2>/dev/null; do
        if [ $attempt -ge $max_attempts ]; then
            echo -e "${RED}Timeout waiting for port ${port}${NC}"
            return 1
        fi
        debug_log "Attempt $attempt: Port $port not ready yet"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${GREEN}Port ${port} is ready!${NC}"
    return 0
}

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo -e "${YELLOW}Cloudflared not found. Installing...${NC}"
    
    # Check OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install cloudflare/cloudflare/cloudflared
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared.deb
        rm cloudflared.deb
    else
        echo -e "${RED}Unsupported OS. Please install cloudflared manually:${NC}"
        echo -e "${YELLOW}https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Cloudflared is installed.${NC}"

# Create a directory to store tunnel information
mkdir -p .cloudflare
TUNNEL_INFO_DIR="$(pwd)/.cloudflare"

# Function to start a server and create tunnel
start_server_with_tunnel() {
    local server_name=$1
    local start_command=$2
    local port=$3
    local log_file="${TUNNEL_INFO_DIR}/${server_name}_tunnel.log"
    local url_file="${TUNNEL_INFO_DIR}/${server_name}_url.txt"
    
    echo -e "\n${BLUE}Starting ${server_name} server...${NC}"
    
    # Start the server in the background
    echo -e "${YELLOW}Running: ${start_command}${NC}"
    eval "$start_command" &
    local server_pid=$!
    debug_log "Server PID: $server_pid"
    
    # Wait for the server to be ready
    if ! wait_for_port $port; then
        echo -e "${RED}Failed to start ${server_name} server${NC}"
        return 1
    fi
    
    # Save server PID
    echo "${server_pid}" > "${TUNNEL_INFO_DIR}/${server_name}_server_pid.txt"
    
    echo -e "\n${BLUE}Creating tunnel for ${server_name}...${NC}"
    
    # Start cloudflared tunnel
    echo -e "${YELLOW}Creating Cloudflare tunnel for ${server_name} (port ${port})...${NC}"
    cloudflared tunnel --url http://localhost:${port} --logfile ${log_file} > ${url_file} 2>&1 &
    local tunnel_pid=$!
    debug_log "Tunnel PID: $tunnel_pid"
    
    # Wait for the tunnel URL to be available
    echo -e "${YELLOW}Waiting for tunnel URL...${NC}"
    sleep 10
    
    # Check if the tunnel process is running
    if ! kill -0 $tunnel_pid 2>/dev/null; then
        echo -e "${RED}Tunnel process for ${server_name} is not running!${NC}"
        debug_log "Checking log file for errors..."
        if [ -f ${log_file} ]; then
            debug_log "Last 10 lines of log file:"
            tail -n 10 ${log_file} | while read -r line; do
                debug_log "  $line"
            done
        fi
        return 1
    else
        debug_log "Tunnel process is running with PID $tunnel_pid"
        echo "${tunnel_pid}" > "${TUNNEL_INFO_DIR}/${server_name}_tunnel_pid.txt"
    fi
    
    # Extract and display the tunnel URL
    if [ -f ${url_file} ]; then
        debug_log "URL file exists, checking content..."
        if [ "$DEBUG" = true ]; then
            debug_log "URL file content:"
            cat ${url_file} | while read -r line; do
                debug_log "  $line"
            done
        fi
        
        # Try to extract the URL using a more specific pattern
        local tunnel_url=$(grep -A 2 "Your quick Tunnel has been created" ${url_file} | grep -o "https://[a-zA-Z0-9.-]*\.trycloudflare\.com")
        
        # If the above fails, try a more general pattern
        if [ -z "$tunnel_url" ]; then
            debug_log "First extraction method failed, trying alternative pattern..."
            tunnel_url=$(grep -o "https://[a-zA-Z0-9.-]*\.trycloudflare\.com" ${url_file} | head -1)
        fi
        
        # If we found a URL, save it
        if [ -n "$tunnel_url" ]; then
            echo -e "${GREEN}${server_name} tunnel created: ${tunnel_url}${NC}"
            echo "${server_name}_tunnel_url=${tunnel_url}" >> "${TUNNEL_INFO_DIR}/tunnel_urls.env"
            echo "${tunnel_url}" > "${TUNNEL_INFO_DIR}/${server_name}_tunnel_url.txt"
            return 0
        fi
        
        # If URL not found in url_file, check log file
        if [ -f ${log_file} ]; then
            tunnel_url=$(grep -o "https://[a-zA-Z0-9.-]*\.trycloudflare\.com" ${log_file} | head -1)
            if [ -n "$tunnel_url" ]; then
                echo -e "${GREEN}${server_name} tunnel created (from log file): ${tunnel_url}${NC}"
                echo "${server_name}_tunnel_url=${tunnel_url}" >> "${TUNNEL_INFO_DIR}/tunnel_urls.env"
                echo "${tunnel_url}" > "${TUNNEL_INFO_DIR}/${server_name}_tunnel_url.txt"
                return 0
            fi
        fi
        
        echo -e "${RED}Failed to extract tunnel URL for ${server_name}${NC}"
        return 1
    else
        echo -e "${RED}URL file not created for ${server_name}${NC}"
        return 1
    fi
}

# Clean up previous tunnel information
rm -f "${TUNNEL_INFO_DIR}/tunnel_urls.env"
touch "${TUNNEL_INFO_DIR}/tunnel_urls.env"

# Start backend server and create tunnel
start_server_with_tunnel "backend" "cd server && npm start" 3000

# Start frontend server and create tunnel
start_server_with_tunnel "frontend" "cd frontend && npm run dev" 3001

echo -e "\n${GREEN}=== Tunnel Setup Complete ===${NC}"
echo -e "${YELLOW}Tunnel URLs are saved in ${TUNNEL_INFO_DIR}/tunnel_urls.env${NC}"

# Display tunnel URLs
if [ -f "${TUNNEL_INFO_DIR}/backend_tunnel_url.txt" ]; then
    BACKEND_URL=$(cat "${TUNNEL_INFO_DIR}/backend_tunnel_url.txt")
    echo -e "${GREEN}Backend URL: ${BACKEND_URL}${NC}"
fi

if [ -f "${TUNNEL_INFO_DIR}/frontend_tunnel_url.txt" ]; then
    FRONTEND_URL=$(cat "${TUNNEL_INFO_DIR}/frontend_tunnel_url.txt")
    echo -e "${GREEN}Frontend URL: ${FRONTEND_URL}${NC}"
    echo -e "${BLUE}Access your Claude Code Web Interface at: ${FRONTEND_URL}${NC}"
fi

echo -e "\n${YELLOW}To stop the tunnels and servers, run: ./stop-cloudflare-tunnel.sh${NC}"

# Create stop script
cat > stop-cloudflare-tunnel.sh << 'EOF'
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
EOF

chmod +x stop-cloudflare-tunnel.sh

echo -e "\n${BLUE}Setup complete! Your Claude Code Web Interface is now accessible from anywhere.${NC}" 