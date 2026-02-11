#!/bin/bash

# ==============================================================================
# Laravel Enterprise Deployment Script (Shared Hosting Compatible)
# ==============================================================================
# Usage: ./deploy.sh
# Make sure to make this executable: chmod +x deploy.sh
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Configuration
# ------------------------------------------------------------------------------
DOMAIN="zodicsys.com"
REPO_URL="https://github.com/hamadshow/zodicerp.git"
BRANCH="main"

# Paths
BASE_DIR="$HOME"
WEB_ROOT="$BASE_DIR/domains/$DOMAIN/public_html"
BACKUP_DIR="$BASE_DIR/backups"
DATE_STAMP=$(date +%Y%m%d_%H%M%S)
CURRENT_BACKUP="$BACKUP_DIR/zodicerp_$DATE_STAMP"

# Colors for professional output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}   🚀 STARTING DEPLOYMENT FOR $DOMAIN ${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "📅 Date: $DATE_STAMP"
echo -e "📂 Target: $WEB_ROOT"

# Exit immediately if a command exits with a non-zero status
set -e

# Error Handling
handle_error() {
    echo -e "${RED}❌ DEPLOYMENT FAILED AT LINE $1 ${NC}"
    echo -e "${YELLOW}💡 To rollback, run the rollback script provided in the documentation.${NC}"
    exit 1
}
trap 'handle_error $LINENO' ERR

# ------------------------------------------------------------------------------
# 2. Preparation & Backup
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[1/8] 🛡️  Backing up existing public_html...${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

if [ -d "$WEB_ROOT" ]; then
    # Check if directory is empty
    if [ -z "$(ls -A $WEB_ROOT)" ]; then
       echo "Directory is empty, skipping backup."
    else
       echo "Moving current public_html to $CURRENT_BACKUP..."
       mv "$WEB_ROOT" "$CURRENT_BACKUP"
    fi
else
    echo "public_html does not exist. Creating it..."
fi

# Re-create empty public_html
mkdir -p "$WEB_ROOT"

# ------------------------------------------------------------------------------
# 3. Clone Repository
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[2/8] 📥 Cloning repository...${NC}"
git clone -b "$BRANCH" "$REPO_URL" "$WEB_ROOT"

# ------------------------------------------------------------------------------
# 4. Environment Setup
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[3/8] ⚙️  Configuring environment...${NC}"
cd "$WEB_ROOT"

if [ -f "$CURRENT_BACKUP/.env" ]; then
    echo "Restoring .env from backup..."
    cp "$CURRENT_BACKUP/.env" .env
else
    echo "⚠️  No existing .env found. Creating from example..."
    cp .env.example .env
    
    echo "🔑 Generating Application Key..."
    # We need to install composer dependencies first to run artisan
fi

# ------------------------------------------------------------------------------
# 5. Dependency Installation
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[4/8] 📦 Installing Composer dependencies...${NC}"
# Check if composer exists
if ! command -v composer &> /dev/null; then
    echo -e "${RED}❌ Composer could not be found. Please install Composer.${NC}"
    exit 1
fi

composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

# Now we can generate key if needed
if [ ! -f "$CURRENT_BACKUP/.env" ]; then
     php artisan key:generate
fi

# ------------------------------------------------------------------------------
# 6. Frontend Assets (No NPM on Server)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[5/8] 🎨 Checking frontend assets...${NC}"
if [ -d "public/build" ]; then
    echo -e "${GREEN}✅ public/build directory exists.${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: public/build directory is missing!${NC}"
    echo -e "${YELLOW}ℹ️  Since npm is not available, ensure you have committed 'public/build' to GitHub.${NC}"
fi

# ------------------------------------------------------------------------------
# 7. Permissions
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[6/8] 🔒 Setting permissions...${NC}"
chmod -R 775 storage bootstrap/cache
# Attempt to fix ownership if possible (usually not needed on shared hosting if running as user)
# chown -R $USER:$USER storage bootstrap/cache

# ------------------------------------------------------------------------------
# 8. Database Migrations
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[7/8] 🗄️  Running database migrations...${NC}"
php artisan migrate --force

# ------------------------------------------------------------------------------
# 9. Caching & Optimization
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[8/8] 🧹 Clearing and rebuilding caches...${NC}"
php artisan optimize:clear
php artisan config:cache
php artisan event:cache
php artisan route:cache
php artisan view:cache

echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}   ✅ DEPLOYMENT SUCCESSFUL! ${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "backup stored at: $CURRENT_BACKUP"
