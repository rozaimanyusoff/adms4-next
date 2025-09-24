#!/bin/bash

# Development startup script
set -e

echo "🚀 Starting ADMS4 Development Environment..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if concurrently is available
if ! npm list concurrently &> /dev/null; then
    echo "📦 Installing concurrently for parallel execution..."
    npm install --save-dev concurrently
fi

# Start both services in development mode (no PM2)
echo "🚀 Starting Next.js app and Socket.IO server in development..."
echo "📊 Next.js app will be on http://localhost:3000"
echo "🔌 Socket.IO server will be on http://localhost:4000"
echo ""
npm run dev:all