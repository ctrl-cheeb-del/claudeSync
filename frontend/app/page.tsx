'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import dynamic from 'next/dynamic';
import ConnectionStatus from './components/ConnectionStatus';
import PromptForm from './components/PromptForm';
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

// Import xterm.css
import 'xterm/css/xterm.css';

// Dynamically import TerminalGrid to avoid SSR issues with xterm.js
const TerminalGrid = dynamic(() => import('./components/TerminalGrid'), {
  ssr: false,
});

// Animation variants
const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
};

const contentVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: "easeOut" }
};

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTerminals, setShowTerminals] = useState(false);
  const [terminalCount, setTerminalCount] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Initialize socket connection
  useEffect(() => {
    // Determine the socket URL based on the current environment
    let socketUrl: string;
    
    // Check if we're running through a Cloudflare tunnel
    const isTunnel = window.location.hostname.includes('trycloudflare.com');
    
    if (isTunnel) {
      // If we're accessing through a tunnel, we need to use the backend tunnel URL
      // The backend URL should be provided as an environment variable or through a configuration
      // For now, we'll try to fetch it from a known endpoint
      fetch('/api/tunnel-info')
        .then(response => response.json())
        .then(data => {
          if (data.backendUrl) {
            connectToSocket(data.backendUrl);
          } else {
            // Fallback to trying the same hostname but on port 3000
            const backendUrl = window.location.protocol + '//' + window.location.hostname;
            connectToSocket(backendUrl);
          }
        })
        .catch(error => {
          console.error('Error fetching backend URL:', error);
          // Fallback to trying the same hostname
          const backendUrl = window.location.protocol + '//' + window.location.hostname;
          connectToSocket(backendUrl);
        });
    } else {
      // Local development - use the standard localhost URLs
      socketUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : `http://${window.location.hostname}:3000`;
      
      console.log('Connecting to socket server at:', socketUrl);
      connectToSocket(socketUrl);
    }
    
    function connectToSocket(url: string) {
      console.log('Connecting to socket server at:', url);
      const newSocket = io(url, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      
      newSocket.on('connect', () => {
        console.log('Socket connected successfully');
        setConnectionStatus('connected');
      });
      
      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnectionStatus('disconnected');
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnectionStatus('disconnected');
      });
      
      setSocket(newSocket);
    }

    // Clean up on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Detect device type
  useEffect(() => {
    const checkDeviceType = () => {
      setIsMobile(window.innerWidth <= 480);
      setIsTablet(window.innerWidth > 480 && window.innerWidth <= 768);
    };

    // Initial check
    checkDeviceType();

    // Add resize listener
    window.addEventListener('resize', checkDeviceType);

    // Clean up
    return () => {
      window.removeEventListener('resize', checkDeviceType);
    };
  }, []);

  // Handle form submission
  const handleSubmit = (prompt: string, count: number) => {
    if (!socket) return;

    setTerminalCount(count);
    setShowTerminals(true);

    // Generate array of terminal IDs
    const terminalIds = Array.from({ length: count }, (_, i) => i.toString());

    // Display user prompt in all terminals (handled in the TerminalGrid component)
    
    // Send prompt to server with terminal count and IDs
    socket.emit('execute-claude', { 
      prompt, 
      terminalCount: count, 
      terminalIds 
    });

    // Re-enable interface after a short delay
    setTimeout(() => {
      setIsProcessing(false);
    }, 1000);
  };

  return (
    <motion.div 
      className="min-h-screen bg-background flex flex-col"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
    >
      <motion.header 
        className="border-b"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.h1 
            className="text-2xl font-bold"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <span className="text-primary">Claude</span> Code Interface
          </motion.h1>
          <ConnectionStatus socket={socket} connectionStatus={connectionStatus} />
        </div>
      </motion.header>
      
      <motion.main 
        className="flex-1 container mx-auto px-4 py-8"
        variants={contentVariants}
      >
        <AnimatePresence mode="wait">
          {!showTerminals ? (
            <motion.div
              key="prompt-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <PromptForm 
                socket={socket} 
                onSubmit={handleSubmit} 
                isProcessing={isProcessing} 
                setIsProcessing={setIsProcessing} 
              />
            </motion.div>
          ) : (
            <motion.div
              key="terminal-grid"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="mt-6">
                <CardContent className="p-6">
                  <TerminalGrid 
                    terminalCount={terminalCount} 
                    socket={socket} 
                    isMobile={isMobile} 
                    isTablet={isTablet} 
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
      
      <motion.footer 
        className="border-t"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="container mx-auto px-4 py-4 text-center">
          <motion.a 
            href="https://github.com/ctrl-cheeb-del/claudeSync" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Github
          </motion.a>
        </div>
      </motion.footer>
    </motion.div>
  );
}
