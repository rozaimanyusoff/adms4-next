const { io } = require('socket.io-client');

const socketUrl = process.env.SOCKET_URL || 'http://localhost:4000';
console.log('Connecting to', socketUrl);

const socket = io(socketUrl, { transports: ['websocket'], reconnectionAttempts: 2, timeout: 5000 });

socket.on('connect', () => {
  console.log('connected, id=', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('connect_error:', err && err.message ? err.message : err);
  process.exit(1);
});

socket.on('notification', (data) => {
  console.log('notification:', data);
  socket.close();
  process.exit(0);
});

setTimeout(() => {
  console.error('timeout: no events received');
  process.exit(2);
}, 8000);
