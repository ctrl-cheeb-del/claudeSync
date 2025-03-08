'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { Socket } from 'socket.io-client';
import { motion } from "framer-motion";

// Import xterm.css in the component that uses Terminal
// We'll handle this in the page component

interface TerminalProps {
  terminalId: string;
  socket: Socket | null;
  isActive: boolean;
  onActivate: () => void;
  isMobile: boolean;
  isTablet: boolean;
  isMultiTerminal?: boolean;
}

// Define a type for window to include resizeTimeout
declare global {
  interface Window {
    resizeTimeout: number;
  }
}

export default function Terminal({
  terminalId,
  socket,
  isActive,
  onActivate,
  isMobile,
  isTablet,
  isMultiTerminal = false
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<XTerm | null>(null);

  // Create terminal options based on device type
  const createTerminalOptions = () => {
    const initialCols = isMobile 
      ? Math.floor((window.innerWidth - 32) / 5) 
      : isTablet 
        ? 90  // Increased from 60
        : 120; // Increased from 80
    const initialRows = isMobile ? 24 : isTablet ? 30 : 36;

    return {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: isMobile ? 10 : (isTablet ? 12 : 14),
      lineHeight: isMobile ? 1.2 : 1.4,
      cursorBlink: true,
      rendererType: 'dom', // Use DOM renderer for better stability
      theme: {
        background: '#1E1E2E',
        foreground: '#f8f8f2',
        cursor: '#f8f8f2',
        selection: 'rgba(248, 248, 242, 0.3)',
        black: '#21222c',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#f8f8f2',
        brightBlack: '#6272a4',
        brightRed: '#ff6e6e',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#d6acff',
        brightMagenta: '#ff92df',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff'
      },
      scrollback: 1500, // Increased scrollback for more history
      allowTransparency: true,
      padding: isMobile ? 4 : (isTablet ? 8 : 12), // Increased padding for better text spacing
      cursorStyle: 'bar' as const,
      convertEol: true,
      disableStdin: false,
      cols: initialCols,
      rows: initialRows,
      rightClickSelectsWord: true,
      macOptionIsMeta: true,
      macOptionClickForcesSelection: true,
      screenReaderMode: false,
      fastScrollModifier: 'alt' as 'alt' | 'ctrl' | 'shift' | 'none',
      fastScrollSensitivity: 5
    };
  };

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const newTerm = new XTerm(createTerminalOptions());
    
    // Delay opening the terminal to ensure the container is properly rendered
    setTimeout(() => {
      if (terminalRef.current) {
        try {
          newTerm.open(terminalRef.current);
          setTerm(newTerm);
          
          // Write some test output to help diagnose rendering issues
        //   newTerm.write('\x1b[1;32mTerminal initialized and ready!\x1b[0m\r\n');
        //   newTerm.write(`Terminal ID: ${terminalId}\r\n`);
          
          // Enable direct terminal input
          newTerm.onData(data => {
            if (socket?.connected) {
              socket.emit('terminal-input', { terminalId, input: data });
            }
          });
        } catch (error) {
          console.error('Error opening terminal:', error);
        }
      }
    }, 100);

    // Cleanup on unmount
    return () => {
      newTerm.dispose();
    };
  }, [terminalRef, socket, terminalId]);

  // Handle terminal output from server
  useEffect(() => {
    if (!socket || !term) return;

    const handleTerminalOutput = (data: { terminalId: string, data: string }) => {
      if (data.terminalId === terminalId) {
        term.write(data.data);
        term.scrollToBottom();
      }
    };

    socket.on('terminal-output', handleTerminalOutput);

    return () => {
      socket.off('terminal-output', handleTerminalOutput);
    };
  }, [socket, term, terminalId]);

  // Handle window resize
  useEffect(() => {
    if (!term || !socket) return;

    const fitTerminal = () => {
      if (!terminalRef.current || !term.element) return;

      // Get the container dimensions
      const containerStyle = window.getComputedStyle(terminalRef.current);
      const paddingLeft = parseInt(containerStyle.paddingLeft, 10) || 0;
      const paddingRight = parseInt(containerStyle.paddingRight, 10) || 0;
      const paddingTop = parseInt(containerStyle.paddingTop, 10) || 0;
      const paddingBottom = parseInt(containerStyle.paddingBottom, 10) || 0;

      // Get container size
      const containerWidth = terminalRef.current.clientWidth - paddingLeft - paddingRight;
      const containerHeight = terminalRef.current.clientHeight - paddingTop - paddingBottom;

      // More conservative sizing
      const fontSize = isMobile ? 10 : (isTablet ? 12 : 14);
      const charWidth = fontSize * 0.6;
      const charHeight = fontSize * 1.5;

      // Calculate columns and rows with a wider target
      const cols = Math.min(
        Math.max(20, Math.floor(containerWidth / charWidth)),
        isMobile ? 80 : (isTablet ? 120 : 160) // Increased column limits for wider terminals
      );
      const rows = Math.min(
        Math.max(20, Math.floor(containerHeight / charHeight)),
        isMobile ? 28 : (isTablet ? 34 : 40)
      );

      // Resize the terminal with safer values
      if (cols > 0 && rows > 0) {
        try {
          term.resize(cols, rows);
          socket.emit('terminal-resize', { terminalId, cols, rows });
          
          // Write a small message to help debug positioning
          if (process.env.NODE_ENV === 'development') {
            // term.write(`\r\nTerminal size: ${cols}x${rows}\r\n`);
          }
        } catch (error) {
          console.error('Error resizing terminal:', error);
        }
      }
    };

    // Initial fit with a longer delay to ensure terminal is fully initialized
    setTimeout(fitTerminal, 500);

    // Add resize event listener
    const handleResize = () => {
      clearTimeout(window.resizeTimeout);
      window.resizeTimeout = setTimeout(fitTerminal, 250) as unknown as number;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => setTimeout(fitTerminal, 300));

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', () => setTimeout(fitTerminal, 300));
    };
  }, [term, socket, terminalId, isMobile, isTablet]);

  // Apply mobile-specific styling
  useEffect(() => {
    if (!isMobile || !terminalRef.current || !term) return;

    const applyMobileTerminalStyling = () => {
      if (!terminalRef.current) return;

      const termElement = terminalRef.current?.querySelector('.xterm');
      if (termElement) {
        (termElement as HTMLElement).style.maxWidth = '95vw';
        (termElement as HTMLElement).style.width = '95%';
        (termElement as HTMLElement).style.overflowX = 'auto';
      }

      const termRows = terminalRef.current?.querySelector('.xterm-rows');
      if (termRows) {
        (termRows as HTMLElement).style.wordBreak = 'break-word';
        (termRows as HTMLElement).style.whiteSpace = 'pre-wrap';
        (termRows as HTMLElement).style.maxWidth = '95%';
        (termRows as HTMLElement).style.lineHeight = '1.2';
      }

      const viewport = terminalRef.current?.querySelector('.xterm-viewport');
      if (viewport) {
        (viewport as HTMLElement).style.maxWidth = '95vw';
        (viewport as HTMLElement).style.width = '95%';
        (viewport as HTMLElement).style.overflowX = 'auto';
      }

      const spans = terminalRef.current?.querySelectorAll('.xterm-rows span');
      spans?.forEach(span => {
        (span as HTMLElement).style.whiteSpace = 'pre-wrap';
        (span as HTMLElement).style.wordBreak = 'break-word';
        (span as HTMLElement).style.maxWidth = '95%';
        (span as HTMLElement).style.display = 'inline-block';
        (span as HTMLElement).style.overflowWrap = 'break-word';
      });

      const screen = terminalRef.current?.querySelector('.xterm-screen');
      if (screen) {
        (screen as HTMLElement).style.maxWidth = '95vw';
        (screen as HTMLElement).style.width = '95%';
      }

      if (terminalRef.current) {
        terminalRef.current.style.maxWidth = '95vw';
        terminalRef.current.style.width = '95%';
        terminalRef.current.style.minWidth = 'unset';
        terminalRef.current.style.left = '0';
        terminalRef.current.style.right = '0';
        terminalRef.current.style.boxSizing = 'border-box';
        terminalRef.current.style.padding = '0 8px';
        terminalRef.current.style.overflowX = 'auto';
      }
    };

    // Apply mobile styling after a longer delay to ensure terminal is fully rendered
    const stylingTimeout = setTimeout(applyMobileTerminalStyling, 500);
    
    // Try again after a longer delay if elements aren't ready yet
    const backupStylingTimeout = setTimeout(applyMobileTerminalStyling, 1500);

    return () => {
      clearTimeout(stylingTimeout);
      clearTimeout(backupStylingTimeout);
    };
  }, [isMobile, term]);

  return (
    <motion.div 
      className={`terminal-wrapper ${isActive ? 'active' : ''} ${isMultiTerminal ? 'multi-terminal-layout' : ''}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: Number(terminalId) * 0.1 }}
      whileHover={{ scale: isActive ? 1 : 1.02 }}
      onClick={() => {
        if (!isActive) {
          onActivate();
          if (term) {
            try {
              term.focus();
            } catch (error) {
              console.error('Error focusing terminal:', error);
            }
          }
        }
      }}
    >
      <motion.div 
        className="terminal-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: Number(terminalId) * 0.1 + 0.2 }}
      >
        <div className="terminal-controls">
          <motion.div 
            className="control-dots"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                  delayChildren: Number(terminalId) * 0.1 + 0.3
                }
              }
            }}
          >
            <motion.span 
              className="dot red"
              variants={{
                hidden: { scale: 0 },
                visible: { scale: 1 }
              }}
            ></motion.span>
            <motion.span 
              className="dot yellow"
              variants={{
                hidden: { scale: 0 },
                visible: { scale: 1 }
              }}
            ></motion.span>
            <motion.span 
              className="dot green"
              variants={{
                hidden: { scale: 0 },
                visible: { scale: 1 }
              }}
            ></motion.span>
          </motion.div>
          <motion.div 
            className="terminal-title"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: Number(terminalId) * 0.1 + 0.4 }}
          >
            Terminal {parseInt(terminalId) + 1}
          </motion.div>
        </div>
        <motion.div 
          className="terminal-actions"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: Number(terminalId) * 0.1 + 0.4 }}
        >
          <motion.button 
            className="btn icon-btn clear-btn" 
            title="Clear terminal"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              if (term) {
                term.clear();
                term.write('\x1b[1;32mTerminal cleared. Start a new conversation!\x1b[0m\r\n\r\n');
              }
            }}
          >
            <i className="fas fa-trash-alt"></i>
          </motion.button>
          <motion.button 
            className="btn danger-btn escape-btn" 
            title="Send ESC key"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              if (socket?.connected && term) {
                socket.emit('terminal-input', { terminalId, input: '\u001b' });
                term.write('\r\n\x1b[1;33m[System: Sent ESC key to terminal - attempting to cancel operation]\x1b[0m\r\n\r\n');
              }
            }}
          >
            <i className="fas fa-exclamation-triangle"></i>
            <span>Cancel</span>
          </motion.button>
        </motion.div>
      </motion.div>
      <motion.div 
        ref={terminalRef} 
        className={`terminal-container compact ${isMultiTerminal ? 'multi-terminal' : ''}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: Number(terminalId) * 0.1 + 0.5 }}
      ></motion.div>
    </motion.div>
  );
} 