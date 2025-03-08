'use client';

import { useState } from 'react';
import { Socket } from 'socket.io-client';
import Terminal from './Terminal';

interface TerminalGridProps {
  terminalCount: number;
  socket: Socket | null;
  isMobile: boolean;
  isTablet: boolean;
}

export default function TerminalGrid({ 
  terminalCount, 
  socket, 
  isMobile, 
  isTablet 
}: TerminalGridProps) {
  const [activeTerminalId, setActiveTerminalId] = useState('0');
  
  // Generate array of terminal IDs
  const terminalIds = Array.from({ length: terminalCount }, (_, i) => i.toString());

  return (
    <div className="terminals-grid" data-count={terminalCount}>
      {terminalIds.map(terminalId => (
        <Terminal
          key={terminalId}
          terminalId={terminalId}
          socket={socket}
          isActive={activeTerminalId === terminalId}
          onActivate={() => setActiveTerminalId(terminalId)}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      ))}
    </div>
  );
} 