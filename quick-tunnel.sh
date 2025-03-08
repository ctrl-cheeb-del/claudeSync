#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Quick Cloudflare Tunnel ===${NC}\n"

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

# Get the port from the command line argument or use default
PORT=${1:-3001}

echo -e "${YELLOW}Creating Cloudflare tunnel for port ${PORT}...${NC}"

# Create the tunnel
echo -e "${YELLOW}Running: cloudflared tunnel --url http://localhost:${PORT}${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the tunnel${NC}\n"

# Run the tunnel in the foreground
cloudflared tunnel --url http://localhost:${PORT} 