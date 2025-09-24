# ADMS4 Next.js - Quick Setup Guide

## 🚀 Development Setup

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Quick Start
```bash
# Install dependencies
npm install

# Start development (both app + socket server)
npm run dev:all

# Or use the convenience script
./scripts/dev.sh
```

### Individual Services (Development)
```bash
# Terminal 1: Next.js app (port 3000)
npm run dev

# Terminal 2: Socket.IO server (port 4000)  
npm run socket:dev
```

## 🏭 Production Deployment

### Prerequisites for Production
```bash
# Install PM2 globally (one-time setup)
npm install -g pm2
```

### Deploy to Production
```bash
# Build and deploy with PM2
./scripts/deploy.sh

# Or manually
npm run build
npm run pm2:start
```

### Production Management
```bash
# Check services status
npm run pm2:status

# View logs
npm run pm2:logs

# Restart services
npm run pm2:restart

# Stop services
npm run pm2:stop
```

## 🔧 Configuration

### Environment Variables
- Development: Uses defaults (localhost:3000, localhost:4000)
- Production: Configure in `.env.production`

### Key URLs
- **Development App**: http://localhost:3000
- **Production App**: http://localhost:3033
- **Socket Server**: http://localhost:4000 (both dev/prod)

## 📁 Key Files
- `socket-server.js` - WebSocket server
- `ecosystem.config.js` - PM2 configuration
- `scripts/dev.sh` - Development startup
- `scripts/deploy.sh` - Production deployment
- `.env.production` - Production environment

## 🐛 Troubleshooting

### WebSocket Connection Issues
1. Ensure socket server is running: `npm run pm2:status`
2. Check NEXT_PUBLIC_SOCKET_URL matches socket server
3. For HTTPS sites, use wss:// protocol

### Port Already in Use
```bash
# Kill processes on port 4000
lsof -ti:4000 | xargs kill -9

# Or change ports in .env files
```

### Manual Socket Server Management
```bash
# Start socket server
node socket-server.js

# Locate service
lsof -nP -iTCP:4000 -sTCP:LISTEN

# Locate process
ps -p <PID> -o pid,comm,args

# Kill socket server
kill <PID>
```

For detailed documentation, see [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Original Next.js Info
