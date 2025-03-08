'use client';

import { Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';

interface ConnectionStatusProps {
  socket: Socket | null;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected';
}

export default function ConnectionStatus({ socket, connectionStatus }: ConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // If connectionStatus prop is provided, use it
    if (connectionStatus) {
      setIsConnected(connectionStatus === 'connected');
      return;
    }

    // Otherwise, use socket events (backward compatibility)
    if (!socket) return;

    const handleConnect = () => {
      console.log('Connected to server');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    };

    // Set up event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Check initial connection status
    setIsConnected(socket.connected);

    // Clean up event listeners
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket, connectionStatus]);

  // Determine the status text
  let statusText = isConnected ? 'Connected' : 'Disconnected';
  if (connectionStatus === 'connecting') {
    statusText = 'Connecting...';
  }

  return (
    <div className="connection-indicator">
      <span 
        id="connection-status" 
        className={`status-badge ${isConnected ? 'connected' : ''} ${connectionStatus === 'connecting' ? 'connecting' : ''}`}
      >
        {statusText}
      </span>
    </div>
  );
} 