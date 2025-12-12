const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users
const users = new Map();

// Helper function to sanitize text
function sanitizeText(text) {
    if (typeof text !== 'string') return '';

    // Basic HTML entity encoding to prevent XSS
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

// Handle new connections
io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    // Handle user joining
    socket.on('join', (username) => {
        // Validate username
        if (!username || typeof username !== 'string' || username.length < 2 || username.length > 20) {
            socket.emit('error', { message: 'Invalid username. Must be 2-20 characters.' });
            return;
        }

        // Sanitize username
        username = sanitizeText(username.trim());

        // Check for duplicate usernames
        if ([...users.values()].includes(username)) {
            socket.emit('error', { message: 'Username already taken. Please choose another.' });
            return;
        }

        users.set(socket.id, username);
        socket.broadcast.emit('user-joined', username);
        io.emit('user-list', Array.from(users.values()));

        console.log(`User ${username} joined the chat`);
    });

    // Handle incoming messages
    socket.on('chat-message', (data) => {
        if (!data || typeof data.message !== 'string') {
            return;
        }

        const username = users.get(socket.id);
        if (!username) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
        }

        // Validate message length
        if (data.message.length > 500) {
            socket.emit('error', { message: 'Message too long. Maximum 500 characters.' });
            return;
        }

        // Sanitize message
        const sanitizedMessage = sanitizeText(data.message.trim());

        io.emit('chat-message', {
            username: username,
            message: sanitizedMessage,
            timestamp: new Date().toLocaleTimeString()
        });
    });

    // Handle typing indicator
    socket.on('typing', (isTyping) => {
        const username = users.get(socket.id);
        if (username) {
            socket.broadcast.emit('typing', {
                username: username,
                isTyping: Boolean(isTyping)
            });
        }
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        const username = users.get(socket.id);
        if (username) {
            users.delete(socket.id);
            socket.broadcast.emit('user-left', username);
            io.emit('user-list', Array.from(users.values()));
            console.log(`User ${username} left the chat`);
        }
        console.log('User disconnected:', socket.id);
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});