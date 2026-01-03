# Real-Time Health Check Implementation

## Overview
Implemented **Option 2: Real-Time Socket.IO Health Broadcast** to provide live backend health status to connected frontend clients every 30 seconds.

## What Changed

### 1. **Updated [src/utils/dbHealthCheck.ts](src/utils/dbHealthCheck.ts)**
   - Added `Server` import from `socket.io`
   - Added new `HealthCheckResponse` interface with status levels: `healthy | degraded | unhealthy`
   - Added `determineHealthStatus()` helper function:
     - **Healthy**: Both pools connected and latency ≤ 1000ms
     - **Degraded**: At least one pool connected
     - **Unhealthy**: Both pools disconnected
   - Updated `startPeriodicHealthCheck()` to:
     - Accept optional `io: Server` parameter
     - Build health response with status, timestamp, uptime, and message
     - **Broadcast to all connected clients**: `io.emit('backend:health', healthResponse)`
     - Continue server logging as before

### 2. **Updated [src/server.ts](src/server.ts)**
   - Pass `io` instance to `startPeriodicHealthCheck(30000, io)`
   - Broadcasts happen every 30 seconds to all authenticated Socket.IO clients

### 3. **Updated [src/app.ts](src/app.ts)**
   - Enhanced `GET /api/health` REST endpoint response to match Socket.IO format
   - Returns same response structure for consistency:
     ```json
     {
       "pool1": { "connected": true, "latency": 5 },
       "pool2": { "connected": true, "latency": 4 },
       "status": "healthy",
       "timestamp": "2026-01-03T10:30:00Z",
       "uptime": 3600.5,
       "message": "All systems operational"
     }
     ```

## Frontend Integration

### Listen for Real-Time Health Updates
```javascript
import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL, {
  auth: {
    token: userToken  // Your JWT token
  }
});

// Listen for health broadcasts (every 30 seconds)
socket.on('backend:health', (healthStatus) => {
  console.log('Backend health:', healthStatus);
  
  // Update UI based on status
  if (healthStatus.status === 'healthy') {
    // Show green indicator
  } else if (healthStatus.status === 'degraded') {
    // Show yellow warning
  } else {
    // Show red error & maintenance notice
  }
});
```

### Display Maintenance Notice
```javascript
// Show user-facing maintenance message if backend is unhealthy
const showMaintenanceNotice = (health) => {
  if (health.status !== 'healthy') {
    const message = health.message || 'System maintenance in progress';
    showAlert(message, 'warning');
  }
};
```

## Benefits

✅ **Live Feedback**: Real-time health status pushed to frontend every 30 seconds  
✅ **User Awareness**: Frontend can display maintenance notices and system status  
✅ **Minimal Overhead**: Uses existing Socket.IO infrastructure  
✅ **Backward Compatible**: REST endpoint still works for polling if needed  
✅ **Status Levels**: Three-tier status (healthy/degraded/unhealthy) for nuanced UI responses  
✅ **Latency Monitoring**: Tracks database pool response times  

## Status Indicators

| Status | Meaning | Action |
|--------|---------|--------|
| **healthy** | Both DB pools connected, latency ≤ 1s | Normal operation |
| **degraded** | One DB pool down or high latency | Show warning |
| **unhealthy** | Both DB pools down | Show maintenance notice |

## Events

- **`backend:health`** (from server) - Broadcasted every 30 seconds
  - Contains full health status including pool details, latency, uptime
  - Can be used to display system status badge or maintenance notices

## Testing

```bash
# 1. Start backend server
npm run dev

# 2. Monitor health broadcasts in Socket.IO console
socket.on('backend:health', console.log);

# 3. Or test REST endpoint directly
curl http://localhost:5000/api/health
```

## Configuration

Change health check interval in [src/server.ts](src/server.ts#L60):
```typescript
startPeriodicHealthCheck(30000, io);  // milliseconds: 30000 = 30 seconds
```

Change latency threshold in [src/utils/dbHealthCheck.ts](src/utils/dbHealthCheck.ts#L50):
```typescript
const pool1Ok = health.pool1.connected && (!health.pool1.latency || health.pool1.latency <= 1000);  // <= 1000ms
```
