// socket-server.js
const { Server } = require("socket.io");

// Environment configuration
const PORT = process.env.SOCKET_PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    (NODE_ENV === 'production' ? [] : ["*"]);

// Notification interval (configurable)
const NOTIFICATION_INTERVAL = parseInt(process.env.NOTIFICATION_INTERVAL) || 10000;

const io = new Server(PORT, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Store connected clients for potential cleanup
const connectedClients = new Map();

io.on("connection", (socket) => {
    console.log(`[${new Date().toISOString()}] Client connected: ${socket.id}`);
    
    // Store client connection time
    connectedClients.set(socket.id, {
        connectedAt: new Date(),
        lastActivity: new Date()
    });

    // Send periodic notifications (configurable interval)
    const notificationTimer = setInterval(() => {
        socket.emit("notification", {
            title: "System Notification",
            message: `Server notification at ${new Date().toLocaleTimeString()}`,
            time: new Date().toISOString(),
            serverId: process.env.SERVER_ID || 'socket-server-1'
        });
    }, NOTIFICATION_INTERVAL);

    // Handle custom events from client
    socket.on("ping", (data) => {
        connectedClients.get(socket.id).lastActivity = new Date();
        socket.emit("pong", { 
            ...data, 
            serverTime: new Date().toISOString() 
        });
    });

    socket.on("disconnect", (reason) => {
        console.log(`[${new Date().toISOString()}] Client disconnected: ${socket.id}, reason: ${reason}`);
        
        // Cleanup
        clearInterval(notificationTimer);
        connectedClients.delete(socket.id);
    });

    socket.on("error", (error) => {
        console.error(`[${new Date().toISOString()}] Socket error for ${socket.id}:`, error);
    });
});

// Health check endpoint (for load balancers)
io.engine.on("connection_error", (err) => {
    console.error(`[${new Date().toISOString()}] Connection error:`, err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log(`[${new Date().toISOString()}] SIGTERM received, shutting down gracefully`);
    io.close(() => {
        console.log(`[${new Date().toISOString()}] Socket.IO server closed`);
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log(`[${new Date().toISOString()}] SIGINT received, shutting down gracefully`);
    io.close(() => {
        console.log(`[${new Date().toISOString()}] Socket.IO server closed`);
        process.exit(0);
    });
});

console.log(`[${new Date().toISOString()}] Socket.IO server running on port ${PORT} (${NODE_ENV} mode)`);
console.log(`[${new Date().toISOString()}] Allowed origins:`, ALLOWED_ORIGINS);
console.log(`[${new Date().toISOString()}] Notification interval: ${NOTIFICATION_INTERVAL}ms`);