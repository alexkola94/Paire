#!/bin/bash
# ====================================
# You & Me Expenses - Automated Setup Script
# ====================================
# Bash setup script for Mac/Linux

echo "========================================"
echo "You & Me Expenses - Setup Script"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${YELLOW}Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found! Please install from nodejs.org${NC}"
    exit 1
fi

# Check npm
echo -e "${YELLOW}Checking npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found!${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Setting up Frontend...${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Navigate to frontend
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Check if .env exists
echo ""
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << 'EOF'
# Supabase Configuration
# Get these from: https://app.supabase.com/project/_/settings/api

VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here

# Optional: Backend API URL (only needed if using .NET backend)
# VITE_API_URL=http://localhost:5000/api
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
    echo ""
    echo -e "${RED}IMPORTANT: Edit frontend/.env and add your Supabase credentials!${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Setup Complete!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Edit frontend/.env with your Supabase credentials"
echo "2. Setup Supabase database (see SUPABASE_SETUP.md)"
echo "3. Run: cd frontend && npm run dev"
echo ""

# Offer to open .env file
read -p "Open .env file now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v code &> /dev/null; then
        code .env
    elif command -v nano &> /dev/null; then
        nano .env
    else
        vi .env
    fi
fi

echo ""
echo -e "${GREEN}Ready to start development!${NC}"

