#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Claude Code Web Interface with Cloudflare Tunnels ===${NC}\n"

# Check if the setup script exists
if [ ! -f "./setup-cloudflare-tunnel.sh" ]; then
    echo -e "${RED}Setup script not found. Please run this script from the project root directory.${NC}"
    exit 1
fi

# Make sure the setup script is executable
chmod +x ./setup-cloudflare-tunnel.sh
chmod +x ./extract-tunnel-urls.sh

# Check if dependencies are installed
echo -e "${YELLOW}Checking dependencies...${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install Node.js and npm first.${NC}"
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}node is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo -e "${YELLOW}cloudflared not found. It will be installed by the setup script.${NC}"
fi

# Install dependencies if needed
echo -e "${YELLOW}Installing project dependencies...${NC}"
npm run install-deps

# Run the setup script
echo -e "\n${YELLOW}Setting up Cloudflare tunnels...${NC}"
./setup-cloudflare-tunnel.sh

# Check if the setup was successful by looking for the tunnel URL files
TUNNEL_INFO_DIR="$(pwd)/.cloudflare"
SETUP_SUCCESS=true

if [ ! -f "${TUNNEL_INFO_DIR}/frontend_tunnel_url.txt" ] || [ ! -f "${TUNNEL_INFO_DIR}/backend_tunnel_url.txt" ]; then
    echo -e "${YELLOW}Tunnel setup may have failed to extract URLs. Trying alternative extraction...${NC}"
    
    # Run the extraction script to try to get the URLs from the log files
    ./extract-tunnel-urls.sh
    
    # Check if extraction was successful
    if [ ! -f "${TUNNEL_INFO_DIR}/frontend_tunnel_url.txt" ] || [ ! -f "${TUNNEL_INFO_DIR}/backend_tunnel_url.txt" ]; then
        echo -e "${RED}Failed to extract tunnel URLs. Please check the log files manually.${NC}"
        SETUP_SUCCESS=false
    else
        echo -e "${GREEN}Successfully extracted tunnel URLs using alternative method.${NC}"
    fi
else
    echo -e "\n${GREEN}Setup completed successfully!${NC}"
fi

# Display tunnel URLs
if [ "$SETUP_SUCCESS" = true ] && [ -f "${TUNNEL_INFO_DIR}/frontend_tunnel_url.txt" ]; then
    FRONTEND_URL=$(cat "${TUNNEL_INFO_DIR}/frontend_tunnel_url.txt")
    echo -e "${GREEN}Frontend URL: ${FRONTEND_URL}${NC}"
    echo -e "${BLUE}Access your Claude Code Web Interface at: ${FRONTEND_URL}${NC}"
    
    # Open the URL in the default browser
    echo -e "${YELLOW}Opening the frontend URL in your default browser...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "${FRONTEND_URL}"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        xdg-open "${FRONTEND_URL}"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        # Windows
        start "${FRONTEND_URL}"
    else
        echo -e "${YELLOW}Could not open the URL automatically. Please open it manually.${NC}"
    fi
fi

echo -e "\n${YELLOW}To stop the tunnels and servers, run: ./stop-cloudflare-tunnel.sh${NC}"
echo -e "${BLUE}Enjoy using Claude Code Web Interface from anywhere!${NC}"

# Keep the script running to maintain the tunnels
echo -e "\n${YELLOW}Press Ctrl+C to stop the tunnels and servers...${NC}"
while true; do
    sleep 60
done 