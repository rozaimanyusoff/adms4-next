#!/bin/bash

# Production deployment script with PM2
set -e

echo "🚀 Starting ADMS4 Production Deployment with PM2..."

# Create logs directory
mkdir -p logs

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed globally!"
    echo "📦 Please install PM2 globally first:"
    echo "   npm install -g pm2"
    echo ""
    echo "💡 Or install it now:"
    read -p "Install PM2 globally? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm install -g pm2
    else
        exit 1
    fi
fi

# Install dependencies (must happen before build)
echo "📦 Installing dependencies..."
npm ci

# Build the Next.js application
echo "🏗️  Building Next.js application..."
npm run build

# Stop existing PM2 processes (if any)
echo "🛑 Stopping existing processes..."
pm2 stop ecosystem.config.js 2>/dev/null || echo "No existing processes to stop"

# Start services with PM2 (production only)
echo "🚀 Starting services with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration for auto-restart after reboot
echo "💾 Saving PM2 configuration..."
pm2 save

echo "✅ Production deployment complete!"
echo ""
echo "📊 Service Status:"
pm2 status

echo ""
echo "📋 Useful PM2 commands:"
echo "  View logs:    npm run pm2:logs"
echo "  Restart:      npm run pm2:restart"
echo "  Stop:         npm run pm2:stop"
echo "  Status:       npm run pm2:status"
echo "  Monitor:      pm2 monit"
echo ""
echo "🔧 Setup PM2 auto-startup (run once on server):"
echo "  pm2 startup"
echo "  (then follow the displayed command)"