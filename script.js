// Client-side JavaScript for chat app
const socket = io();

// DOM elements
const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const usernameInput = document.getElementById('usernameInput');
const joinBtn = document.getElementById('joinBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const messagesContainer = document.getElementById('messages');
const usersList = document.getElementById('usersList');
const onlineCount = document.getElementById('onlineCount');
const onlineCountChat = document.getElementById('onlineCountChat');
const typingIndicator = document.getElementById('typingIndicator');
const typingText = document.getElementById('typingText');
const sidebar = document.getElementById('sidebar');
const usersToggle = document.getElementById('usersToggle');
const closeSidebar = document.getElementById('closeSidebar');
const emojiBtn = document.getElementById('emojiBtn');

let currentUser = '';

// Add error handling for socket connection
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    appendSystemMessage('Connection lost. Attempting to reconnect...');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
});

// Handle server errors
socket.on('error', (data) => {
    console.error('Server error:', data.message);
    if (data.message) {
        alert(data.message);
    }
});

// Join the chat room
joinBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (!username) {
        alert('Please enter a username');
        return;
    }

    if (username.length < 2) {
        alert('Username must be at least 2 characters long');
        return;
    }

    if (username.length > 20) {
        alert('Username must be less than 20 characters');
        return;
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        alert('Username can only contain letters, numbers, and underscores');
        return;
    }

    currentUser = username;
    socket.emit('join', username);
    loginScreen.classList.remove('active');
    chatScreen.classList.add('active');
    messageInput.focus();
});

// Send message
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        try {
            socket.emit('chat-message', { message: message });
            messageInput.value = '';
            // Hide typing indicator when sending message
            typingIndicator.classList.remove('show');
        } catch (error) {
            console.error('Error sending message:', error);
            appendSystemMessage('Error sending message. Please try again.');
        }
    }
}

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    } else {
        // Emit typing indicator
        socket.emit('typing', true);

        // Clear typing timeout if exists
        if (window.typingTimeout) {
            clearTimeout(window.typingTimeout);
        }

        // Set typing timeout to stop showing indicator after 1 second of no typing
        window.typingTimeout = setTimeout(() => {
            socket.emit('typing', false);
        }, 1000);
    }
});

// Handle click outside to close sidebar on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) &&
            !usersToggle.contains(e.target) &&
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    }
});

// Toggle sidebar on mobile
usersToggle.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('active');
    }
});

// Close sidebar button
closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('active');
});

// Emoji picker functionality
emojiBtn.addEventListener('click', () => {
    messageInput.focus();

    // Simple emoji insertion - in a real app, you'd have an actual emoji picker
    const emojis = ['😀', '😂', '😍', '🥰', '😎', '🤩', '🥳', '😊', '🤗', '🤔', '👍', '👏', '🙌'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    messageInput.value += randomEmoji;
    messageInput.focus();
});

// Listen for messages
socket.on('chat-message', (data) => {
    appendMessage(data.username, data.message, data.timestamp, data.username === currentUser ? 'own' : 'other');
});

// Listen for user joined event
socket.on('user-joined', (username) => {
    appendSystemMessage(`${username} joined the chat`);
});

// Listen for user left event
socket.on('user-left', (username) => {
    appendSystemMessage(`${username} left the chat`);
});

// Listen for user list updates
socket.on('user-list', (users) => {
    updateUserList(users);
});

// Listen for typing indicator
socket.on('typing', (data) => {
    if (data.isTyping) {
        typingText.textContent = data.username;
        typingIndicator.classList.add('show');
    } else {
        typingIndicator.classList.remove('show');
    }
});

// Append a message to the chat
function appendMessage(username, message, timestamp, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-username">${username}</span>
            <span class="message-timestamp">${timestamp}</span>
        </div>
        <div class="message-text">${formatMessage(escapeHtml(message))}</div>
    `;

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Format message to support links, line breaks, etc.
function formatMessage(text) {
    // Convert URLs to clickable links
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="message-link" style="color: inherit; text-decoration: underline;">$1</a>');

    // Convert line breaks to <br> tags
    text = text.replace(/\n/g, '<br>');

    return text;
}

// Append a system message
function appendSystemMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    messageDiv.textContent = message;

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Update the user list
function updateUserList(users) {
    usersList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.className = 'user-online';
        li.textContent = user;
        usersList.appendChild(li);
    });

    onlineCount.textContent = users.length;
    onlineCountChat.textContent = users.length;
}

// Scroll to bottom of messages
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize with empty user list
updateUserList([]);