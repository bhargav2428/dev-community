'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { data: session, status } = useSession();

  const connect = useCallback(() => {
    if (socket?.connected) return;
    if (status !== 'authenticated' || !session?.accessToken) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    
    const newSocket = io(wsUrl, {
      auth: {
        token: session.accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
    });

    setSocket(newSocket);
  }, [socket, session, status]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken && !socket) {
      connect();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [status, session, socket, connect]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connect, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

// Hook for real-time notifications
export function useNotifications() {
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!socket) return;

    // Get initial unread count
    socket.emit('notifications:count');

    // Listen for count updates
    socket.on('notifications:count', (count: number) => {
      setUnreadCount(count);
    });

    // Listen for new notifications
    socket.on('notification:new', (notification: any) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.off('notifications:count');
      socket.off('notification:new');
    };
  }, [socket]);

  const markAsRead = useCallback((notificationId: string) => {
    if (!socket) return;
    socket.emit('notification:read', notificationId);
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [socket]);

  const markAllAsRead = useCallback(() => {
    if (!socket) return;
    socket.emit('notifications:readAll');
    setUnreadCount(0);
  }, [socket]);

  return {
    unreadCount,
    notifications,
    markAsRead,
    markAllAsRead,
  };
}

// Hook for real-time messaging
export function useMessaging(conversationId?: string) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!socket || !conversationId) return;

    // Join conversation room
    socket.emit('join:conversation', conversationId);

    // Listen for new messages
    socket.on('message:new', (message: any) => {
      setMessages((prev) => [...prev, message]);
    });

    // Listen for typing indicators
    socket.on('typing:user', (data: { userId: string; username: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (data.isTyping) {
          next.set(data.userId, data.username);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    });

    // Listen for read receipts
    socket.on('message:seen', (data: { messageId: string; seenBy: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, reads: [...(msg.reads || []), { userId: data.seenBy }] }
            : msg
        )
      );
    });

    return () => {
      socket.emit('leave:conversation', conversationId);
      socket.off('message:new');
      socket.off('typing:user');
      socket.off('message:seen');
    };
  }, [socket, conversationId]);

  const sendMessage = useCallback((content: string, messageType = 'TEXT') => {
    if (!socket || !conversationId) return;
    socket.emit('message:send', { conversationId, content, messageType });
  }, [socket, conversationId]);

  const startTyping = useCallback(() => {
    if (!socket || !conversationId) return;
    socket.emit('typing:start', conversationId);
  }, [socket, conversationId]);

  const stopTyping = useCallback(() => {
    if (!socket || !conversationId) return;
    socket.emit('typing:stop', conversationId);
  }, [socket, conversationId]);

  const markAsRead = useCallback((messageId: string) => {
    if (!socket || !conversationId) return;
    socket.emit('message:read', { conversationId, messageId });
  }, [socket, conversationId]);

  return {
    messages,
    typingUsers: Array.from(typingUsers.values()),
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
  };
}

// Hook for presence/online status
export function usePresence(userIds: string[]) {
  const { socket } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket || userIds.length === 0) return;

    // Check initial presence
    socket.emit('presence:check', userIds);

    // Listen for presence updates
    socket.on('presence:status', (statuses: { userId: string; online: boolean }[]) => {
      setOnlineUsers(new Set(statuses.filter(s => s.online).map(s => s.userId)));
    });

    socket.on('presence:update', (data: { userId: string; online: boolean }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (data.online) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    });

    return () => {
      socket.off('presence:status');
      socket.off('presence:update');
    };
  }, [socket, userIds]);

  const isOnline = useCallback((userId: string) => onlineUsers.has(userId), [onlineUsers]);

  return { onlineUsers, isOnline };
}
