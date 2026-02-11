#!/bin/bash

# ==============================================================================
# Laravel Fresh Install Script (First Time Deployment)
# ==============================================================================
# Usage: ./setup.sh
# ==============================================================================

DOMAIN="zodicsys.com"
REPO_URL="https://github.com/hamadshow/zodicerp.git"
BRANCH="main"

# Paths
BASE_DIR="$HOME"
WEB_ROOT="$BASE_DIR/domains/$DOMAIN/public_html"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}   🚀 STARTING FRESH INSTALL FOR $DOMAIN ${NC}"
echo -e "${BLUE}================================================================${NC}"

# Exit on error
set -e

# ------------------------------------------------------------------------------
# 1. Clean & Clone
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[1/6] 🧹 Preparing directory...${NC}"

# Ensure directory exists
mkdir -p "$WEB_ROOT"

# Check if directory is empty
if [ "$(ls -A $WEB_ROOT)" ]; then
    echo -e "${RED}❌ public_html is not empty! Please clear it manually or backup first.${NC}"
    echo "To clear manually: rm -rf $WEB_ROOT/* $WEB_ROOT/.* 2>/dev/null || true"
    exit 1
fi

echo -e "${YELLOW}[2/6] 📥 Cloning repository...${NC}"
git clone -b "$BRANCH" "$REPO_URL" "$WEB_ROOT"

# ------------------------------------------------------------------------------
# 2. Environment Setup
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[3/6] ⚙️  Configuring environment...${NC}"
cd "$WEB_ROOT"

if [ ! -f .env ]; then
    echo "Creating .env from example..."
    cp .env.example .env
    echo -e "${RED}⚠️  ACTION REQUIRED: Please edit .env file manually later to set DB credentials!${NC}"
else
    echo ".env already exists."
fi

# ------------------------------------------------------------------------------
# 3. Dependency Installation
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[4/6] 📦 Installing Composer dependencies...${NC}"
if ! command -v composer &> /dev/null; then
    echo -e "${RED}❌ Composer not found. Please install composer or use full path.${NC}"
    exit 1
fi

composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

# Generate Key
echo "🔑 Generating Application Key..."
php artisan key:generate --force

# ------------------------------------------------------------------------------
# 4. Permissions
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[5/6] 🔒 Setting permissions...${NC}"
chmod -R 775 storage bootstrap/cache
chmod 644 .env

# ------------------------------------------------------------------------------
# 5. Database & Caches
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[6/6] 🗄️  Finalizing setup...${NC}"

# We can't migrate if DB is not set, so we skip it here and remind user
echo -e "${YELLOW}⚠️  Skipping migrations. Run 'php artisan migrate' after configuring .env.${NC}"

# Clear caches
php artisan optimize:clear
php artisan config:cache
php artisan event:cache
php artisan route:cache
php artisan view:cache

# ------------------------------------------------------------------------------
# 6. Storage Link
# ------------------------------------------------------------------------------
if [ -d "public/storage" ]; then
    rm -rf public/storage
fi
php artisan storage:link

echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}   ✅ FRESH INSTALL COMPLETE! ${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "👉 NEXT STEPS:"
echo -e "1. Edit .env file: ${YELLOW}nano $WEB_ROOT/.env${NC}"
echo -e "2. Run migrations: ${YELLOW}cd $WEB_ROOT && php artisan migrate${NC}"
