import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinMatch(matchId) {
    if (this.socket) {
      this.socket.emit('join_match', matchId);
    }
  }

  leaveMatch(matchId) {
    if (this.socket) {
      this.socket.emit('leave_match', matchId);
    }
  }

  sendMessage(matchId, content) {
    if (this.socket) {
      this.socket.emit('send_message', { matchId, content });
    }
  }

  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  onMessageNotification(callback) {
    if (this.socket) {
      this.socket.on('message_notification', callback);
    }
  }

  typing(matchId) {
    if (this.socket) {
      this.socket.emit('typing', { matchId });
    }
  }

  stopTyping(matchId) {
    if (this.socket) {
      this.socket.emit('stop_typing', { matchId });
    }
  }

  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  onUserStopTyping(callback) {
    if (this.socket) {
      this.socket.on('user_stop_typing', callback);
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

const socketService = new SocketService();
export default socketService;
