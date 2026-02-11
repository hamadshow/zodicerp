#!/bin/bash

# ==============================================================================
# Laravel Rollback Script
# ==============================================================================
# Usage: ./rollback.sh
# ==============================================================================

DOMAIN="zodicsys.com"
BASE_DIR="$HOME"
WEB_ROOT="$BASE_DIR/domains/$DOMAIN/public_html"
BACKUP_DIR="$BASE_DIR/backups"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔄 STARTING ROLLBACK...${NC}"

# 1. Find latest backup
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ No backup directory found at $BACKUP_DIR${NC}"
    exit 1
fi

# Get the most recent backup folder
LATEST_BACKUP=$(ls -td "$BACKUP_DIR"/zodicerp_* 2>/dev/null | head -1)

# Fallback to check for other naming patterns if needed (deploy.sh uses backup_YYYYMMDD)
if [ -z "$LATEST_BACKUP" ]; then
    LATEST_BACKUP=$(ls -td "$BACKUP_DIR"/backup_* 2>/dev/null | head -1)
fi

if [ -z "$LATEST_BACKUP" ]; then
    echo -e "${RED}❌ No backups found to restore!${NC}"
    exit 1
fi

echo -e "Found backup: ${BLUE}$LATEST_BACKUP${NC}"

# 2. Move current broken deploy aside
BROKEN_DIR="$BACKUP_DIR/broken_$(date +%Y%m%d_%H%M%S)"
echo "Moving current public_html to $BROKEN_DIR..."
mv "$WEB_ROOT" "$BROKEN_DIR"

# 3. Restore backup
echo "Restoring $LATEST_BACKUP to public_html..."
mv "$LATEST_BACKUP" "$WEB_ROOT"

echo -e "${GREEN}✅ ROLLBACK COMPLETE!${NC}"
echo "Previous state restored."
