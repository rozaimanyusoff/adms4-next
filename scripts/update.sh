#!/bin/bash

# Production update script
set -e

echo "🔄 Updating ADMS4 Production..."

# Pull latest changes
git pull origin main

# Install/update dependencies
npm install

# Rebuild application
npm run build

# Restart PM2 services
npm run pm2:restart

echo "✅ Update complete!"

# Show status
npm run pm2:status