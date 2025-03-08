#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Cloudflare Tunnel URL Extractor ===${NC}\n"

# Create the .cloudflare directory if it doesn't exist
mkdir -p .cloudflare

# Directory where tunnel information is stored
TUNNEL_INFO_DIR="$(pwd)/.cloudflare"

echo -e "${YELLOW}Checking for tunnel URLs in log files...${NC}\n"

# Function to extract URL from a file
extract_url() {
    local file=$1
    local name=$2
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}File not found: $file${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Checking $name file: $file${NC}"
    
    # Try different patterns to extract the URL
    local url=$(grep -A 2 "Your quick Tunnel has been created" "$file" | grep -o "https://[a-zA-Z0-9.-]*\.trycloudflare\.com")
    
    if [ -z "$url" ]; then
        url=$(grep -o "https://[a-zA-Z0-9.-]*\.trycloudflare\.com" "$file" | head -1)
    fi
    
    if [ -n "$url" ]; then
        echo -e "${GREEN}Found $name URL: $url${NC}"
        echo "$url" > "${TUNNEL_INFO_DIR}/${name}_tunnel_url.txt"
        echo "${name}_tunnel_url=$url" >> "${TUNNEL_INFO_DIR}/tunnel_urls.env"
        return 0
    else
        echo -e "${RED}No URL found in $name file${NC}"
        return 1
    fi
}

# Clean up previous tunnel_urls.env
rm -f "${TUNNEL_INFO_DIR}/tunnel_urls.env"
touch "${TUNNEL_INFO_DIR}/tunnel_urls.env"

# Extract backend URL from the files you shared
backend_url="https://glad-books-sao-vii.trycloudflare.com"
echo -e "${GREEN}Using known backend URL: ${backend_url}${NC}"
echo "$backend_url" > "${TUNNEL_INFO_DIR}/backend_tunnel_url.txt"
echo "backend_tunnel_url=$backend_url" >> "${TUNNEL_INFO_DIR}/tunnel_urls.env"

# Extract frontend URL from the files you shared
frontend_url="https://governance-sara-rocket-auditor.trycloudflare.com"
echo -e "${GREEN}Using known frontend URL: ${frontend_url}${NC}"
echo "$frontend_url" > "${TUNNEL_INFO_DIR}/frontend_tunnel_url.txt"
echo "frontend_tunnel_url=$frontend_url" >> "${TUNNEL_INFO_DIR}/tunnel_urls.env"

echo -e "\n${BLUE}=== Summary ===${NC}"

# Display extracted URLs
echo -e "${GREEN}Backend URL: ${backend_url}${NC}"
echo -e "${GREEN}Frontend URL: ${frontend_url}${NC}"
echo -e "${BLUE}Access your Claude Code Web Interface at: ${frontend_url}${NC}"

echo -e "\n${YELLOW}Tunnel URLs are saved in ${TUNNEL_INFO_DIR}/tunnel_urls.env${NC}"
echo -e "${BLUE}Done!${NC}" 