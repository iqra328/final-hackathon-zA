import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');
const SOCKET_URL = import.meta.env.VITE_WS_URL || API_URL;

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);