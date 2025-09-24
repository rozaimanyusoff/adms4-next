# ADMS4 Production Deployment Guide

This guide explains how to run the ADMS4 Next.js application and Socket.IO server as separate services.

## 🏗️ Architecture

The application consists of two separate services:

1. **Next.js App** - Main web application (port 3033)
2. **Socket.IO Server** - WebSocket server for real-time notifications (port 4000)

## 🚀 Quick Start

### Development Mode (No PM2)
```bash
# Start both services in development
npm run dev:all

# Or start separately in different terminals:
npm run dev          # Next.js app (port 3000)
npm run socket:dev   # Socket server (port 4000)

# Or use the dev script:
./scripts/dev.sh
```

### Production Mode (PM2 Only)
```bash
# Install PM2 globally (one time setup)
npm install -g pm2

# Deploy with PM2
./scripts/deploy.sh

# Or manually:
npm run build
npm run pm2:start
```

## ⚙️ Configuration

### Environment Variables

Create `.env.production` for production settings:

```bash
# Next.js App
NODE_ENV=production
PORT=3033

# Socket Server  
SOCKET_PORT=4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
ALLOWED_ORIGINS=http://localhost:3033,https://your-domain.com
NOTIFICATION_INTERVAL=30000
SERVER_ID=socket-server-prod
```

### PM2 Configuration (Production Only)

The `ecosystem.config.js` file defines both services for PM2:

- **adms4-next-app**: Next.js application
- **adms4-socket-server**: Socket.IO server

Logs are stored in the `./logs/` directory.

## 🔧 Service Management

### Development
```bash
# Start both services with live reload
npm run dev:all

# Or start individually:
npm run dev          # Next.js (auto-reload)
npm run socket:dev   # Socket server (manual restart needed)
```

### Production (PM2)
```bash
# Deploy
./scripts/deploy.sh

# PM2 commands
npm run pm2:status   # Check status
npm run pm2:logs     # View logs
npm run pm2:restart  # Restart services
npm run pm2:stop     # Stop services

# Advanced PM2 commands
pm2 monit           # Resource monitoring
pm2 save            # Save current process list
pm2 startup         # Setup auto-start on boot
```

## 🌐 Production Considerations

### Reverse Proxy Setup

For production, use Nginx as a reverse proxy:

1. The included `nginx.conf` routes:
   - `/` → Next.js app (port 3033)
   - `/socket.io/` → Socket.IO server (port 4000)

2. Benefits:
   - SSL termination
   - Rate limiting
   - Load balancing
   - Security headers

### Security

1. **CORS Configuration**: Update `ALLOWED_ORIGINS` to include only your domains
2. **Firewall**: Only expose ports 80/443 publicly; keep 3033/4000 internal
3. **SSL**: Configure HTTPS in Nginx for production
4. **Process Isolation**: Services run as separate processes/containers

### Monitoring

1. **PM2 Monitoring**: Built-in process monitoring and auto-restart
2. **Health Checks**: Docker health checks for service availability
3. **Logs**: Structured logging with timestamps in production
4. **Metrics**: Consider adding metrics collection (Prometheus, etc.)

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if socket server is running: `pm2 status`
   - Verify `NEXT_PUBLIC_SOCKET_URL` matches socket server URL
   - For HTTPS sites, use `wss://` protocol

2. **Port Already in Use**
   - Change ports in environment variables
   - Kill existing processes: `pm2 delete all`

3. **CORS Errors**
   - Update `ALLOWED_ORIGINS` in production environment
   - Restart socket server after changes

### Logs Location

- **PM2**: `./logs/` directory
- **Docker**: `docker-compose logs -f`
- **Manual**: stdout/stderr

## 📊 Performance

### Scaling Options

1. **Horizontal Scaling**: 
   - Multiple app instances behind load balancer
   - Socket.IO clustering with Redis adapter

2. **Vertical Scaling**:
   - Increase memory limits in PM2/Docker config
   - Optimize notification intervals

### Resource Usage

- **Next.js App**: ~1GB memory limit
- **Socket Server**: ~512MB memory limit
- **Auto-restart**: On memory threshold or crashes

## 🔄 Deployment Pipeline

1. **Development**: `npm run dev:all`
2. **Build**: `npm run build`
3. **Deploy**: `./scripts/deploy.sh` or Docker
4. **Monitor**: PM2 dashboard or Docker logs
5. **Update**: Restart services after changes

---

For additional help, check the logs or contact the development team.