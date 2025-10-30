#!/bin/bash

# SolenceAiPay SDK - Quick Start Script
# This script helps you get started quickly

set -e

echo "🚀 SolenceAiPay SDK Quick Start"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Install dependencies
echo -e "${BLUE}Step 1: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Build the SDK
echo -e "${BLUE}Step 2: Building SDK...${NC}"
npm run build
echo -e "${GREEN}✓ SDK built successfully${NC}"
echo ""

# Step 3: Run tests (if they exist)
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    echo -e "${BLUE}Step 3: Running tests...${NC}"
    npm test || echo -e "${YELLOW}⚠ Tests not configured yet${NC}"
    echo ""
fi

# Step 4: Link locally for testing
echo -e "${BLUE}Step 4: Linking SDK locally...${NC}"
npm link
echo -e "${GREEN}✓ SDK linked. You can now use 'npm link @solenceai/payment-sdk' in your project${NC}"
echo ""

# Success message
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✨ SDK is ready to use!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

echo "Next steps:"
echo "1. Test locally:"
echo "   cd /path/to/your/project"
echo "   npm link @solenceai/payment-sdk"
echo ""
echo "2. Publish to NPM:"
echo "   npm login"
echo "   npm publish --access public"
echo ""
echo "3. Read the documentation:"
echo "   - README.md - Getting started"
echo "   - IMPLEMENTATION.md - Complete guide"
echo "   - DEPLOYMENT.md - Publishing guide"
echo ""
echo "Need help? Check SUMMARY.md for overview"
