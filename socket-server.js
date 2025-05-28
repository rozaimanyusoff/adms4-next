// socket-server.js
const { Server } = require("socket.io");

const io = new Server(4000, {
    cors: {
        origin: "*", // For dev only! Restrict in production.
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Example: send a notification every 10 seconds
    setInterval(() => {
        socket.emit("notification", {
            title: "New Notification",
            message: "This is a test notification from the server.",
            time: new Date().toLocaleTimeString()
        });
    }, 10000);

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

console.log("Socket.IO server running on port 4000");