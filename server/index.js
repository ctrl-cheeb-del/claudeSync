const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pty = require('node-pty');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
// Load environment variables from .env file
require('dotenv').config();

// Debug logging helper
const DEBUG = process.env.DEBUG === 'true';
function logDebug(message) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`);
  }
}

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

// Create HTTP server
const server = http.createServer(app);

// Create Socket.io server with CORS configuration
const io = new Server(server, {
  cors: {
    origin: '*', // In production, restrict this to your client's domain
    methods: ['GET', 'POST']
  }
});

// Set up logging for debugging
const logFile = path.join(__dirname, 'terminal_debug.log');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log(`Created logs directory at ${logsDir}`);
}

// Single log file per session
const sessionLogs = {};

// Function to initialize a session log file
function initSessionLog(socketId, prompt) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const logFileName = path.join(logsDir, `claude_session_${socketId}_${timestamp}.log`);
  
  // Create the log file with a header
  fs.writeFileSync(
    logFileName, 
    `==========================================================\n` +
    `CLAUDE SESSION LOG - ${new Date().toISOString()}\n` +
    `Socket ID: ${socketId}\n` +
    `Prompt: ${prompt}\n` +
    `==========================================================\n\n`
  );
  
  // Store the log file name for this session
  sessionLogs[socketId] = logFileName;
  
  logDebug(`Initialized session log file: ${logFileName}`);
  return logFileName;
}

// Function to append to the session log file
function appendToSessionLog(socketId, section, data) {
  if (!sessionLogs[socketId]) {
    logDebug(`No session log file found for socket ${socketId}`);
    return;
  }
  
  const timestamp = new Date().toISOString();
  const separator = '\n' + '-'.repeat(60) + '\n';
  
  // Format the section header
  const header = `\n${separator}${section} - ${timestamp}${separator}\n`;
  
  // Append to the log file
  fs.appendFileSync(sessionLogs[socketId], header + data + '\n');
  
  logDebug(`Appended ${section} to session log for socket ${socketId}`);
}

// Function to close the session log file
function closeSessionLog(socketId) {
  if (!sessionLogs[socketId]) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const separator = '\n' + '='.repeat(60) + '\n';
  
  // Add a footer to the log file
  fs.appendFileSync(
    sessionLogs[socketId], 
    `${separator}SESSION ENDED - ${timestamp}${separator}\n`
  );
  
  logDebug(`Closed session log file for socket ${socketId}`);
  
  // Remove the log file name from the map
  delete sessionLogs[socketId];
}

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // State management for this socket
  let isProcessing = false;
  
  // Handle new Claude Code prompt
  socket.on('execute-claude', (prompt) => {
    console.log('Executing Claude with prompt:', prompt);
    
    // Set processing state
    isProcessing = true;
    
    // Initialize the session log file
    initSessionLog(socket.id, prompt);
    
    // Get the terminal working directory from environment variables or use a default
    const terminalCwd = process.env.TERMINAL_CWD || process.env.HOME;
    console.log(`Using terminal working directory: ${terminalCwd}`);
    
    // Create a new terminal process
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const term = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: terminalCwd, // Use the configured directory
      env: process.env
    });
    
    // Store the terminal
    terminals[socket.id] = term;
    
    // Flag to track if we've already auto-responded to a prompt
    let promptsResponded = new Set();
    
    // Send terminal output directly to the client without processing
    term.onData((data) => {
      // Log raw data for debugging
      if (data.includes('❯') || data.includes('Do you want to proceed')) {
        logDebug(`Raw data: ${JSON.stringify(data)}`);
      }
      
      // Save raw output to a log file
      appendToSessionLog(socket.id, 'Raw Output', data);
      
      // Send raw data directly to the client
      socket.emit('terminal-output', data);
      
      // Check for various types of prompts that need auto-response
      const hasPrompt = checkForPrompts(data);
      
      if (hasPrompt) {
        // Wait a short time before pressing Enter
        setTimeout(() => {
          term.write('\r');
        }, 500);
      }
    });
    
    // Check for various types of prompts that need auto-response
    function checkForPrompts(text) {
      // Log the text for debugging when it contains potential prompt indicators
      if (text.includes('❯') || text.includes('Do you want to proceed') || text.includes('Yes') || text.includes('Bash command')) {
        logDebug(`Checking for prompts in: ${text.substring(0, 200)}...`);
      }
      
      // DIRECT CHECK: If we see "Bash command" text, respond immediately
      if (text.includes('Bash command') && text.includes('Do you want to proceed?')) {
        console.log('Detected Bash command prompt, automatically pressing Enter');
        logDebug(`Detected Bash command prompt`);
        return true;
      }
      
      // DIRECT CHECK: If we see the exact pattern from the user's example, respond immediately
      if (text.includes('Do you want to proceed?') && text.includes('❯ Yes')) {
        console.log('Detected exact prompt pattern, automatically pressing Enter');
        logDebug(`Detected exact prompt pattern: Do you want to proceed? with ❯ Yes`);
        return true;
      }
      
      // DIRECT CHECK: If we see "Claude needs your permission" with a blue arrow, respond immediately
      if (text.includes('Claude needs your permission')) {
        console.log('Detected permission prompt, automatically pressing Enter');
        logDebug(`Detected permission prompt: Claude needs your permission`);
        return true;
      }
      
      // Common prompt indicators
      const promptPatterns = [
        // Blue arrow prompt (specific ANSI color code detection)
        /\u001b\[34m❯\u001b\[39m/,
        // Blue confirmation prompt with Yes
        /\u001b\[34m❯\u001b\[39m\s+\u001b\[34mYes\u001b\[39m/,
        // Arrow prompt (standard)
        /❯/,
        // Blue arrow prompt (confirmation)
        /\]\s+Yes/i,
        // "Do you want to proceed?" prompt
        /Do you want to proceed\?/i,
        // "Do you want to make this edit" prompt
        /Do you want to make this edit/i,
        // Bash command prompt
        /Bash command.*\n.*\n.*\n.*Do you want to proceed\?/s,
        // Edit file prompt
        /Edit file.*\n.*\n.*\n.*Do you want to make this edit/s,
        // Permission prompt
        /Claude needs your permission/i,
        // Any line with "Yes" as an option
        /^\s*Yes\s*$/m,
        // Bash command prompt (simpler pattern)
        /Bash command.*Do you want to proceed\?/s
      ];
      
      for (const pattern of promptPatterns) {
        if (pattern.test(text)) {
          const match = text.match(pattern);
          if (match) {
            const promptSignature = extractPromptSignature(text) || match[0].substring(0, 50); // Use first 50 chars as signature
            
            if (!promptsResponded.has(promptSignature)) {
              console.log('Detected prompt, automatically pressing Enter');
              logDebug(`Detected prompt: ${promptSignature}`);
              promptsResponded.add(promptSignature);
              return true;
            }
          }
        }
      }
      
      // Additional check for any line containing a blue arrow (more aggressive detection)
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.includes('\u001b[34m❯\u001b[39m') || line.includes('❯')) {
          const promptSignature = `line-with-blue-arrow: ${line.substring(0, 30)}`;
          
          if (!promptsResponded.has(promptSignature)) {
            console.log('Detected blue arrow in line, automatically pressing Enter');
            logDebug(`Detected blue arrow in line: ${line.substring(0, 100)}`);
            promptsResponded.add(promptSignature);
            return true;
          }
        }
      }
      
      return false;
    }
    
    // Extract a signature from a prompt to avoid responding multiple times
    function extractPromptSignature(text) {
      // Look for lines containing ❯
      const match = text.match(/.*❯.*$/m);
      return match ? match[0] : null;
    }
    
    // Execute Claude with the provided prompt directly in quotes
    // Escape any quotes in the prompt to prevent command injection
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    const claudeCommand = `claude "${escapedPrompt}"\r`;
    
    console.log('Running command:', claudeCommand);
    term.write(claudeCommand);
    
    // Wait 2 seconds, then press Enter to trust files if prompted
    setTimeout(() => {
      console.log('Sending Enter key to trust files if needed');
      term.write('\r');
    }, 2000);
    
    // Handle client disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      if (terminals[socket.id]) {
        terminals[socket.id].kill();
        delete terminals[socket.id];
      }
      closeSessionLog(socket.id);
    });
  });
  
  // Handle terminal input from client
  socket.on('terminal-input', (data) => {
    if (terminals[socket.id]) {
      // Log the input for debugging
      if (data.length > 1 || data.charCodeAt(0) < 32) {
        logDebug(`Terminal input: ${JSON.stringify(data)}`);
      }
      
      // Write the data to the terminal
      terminals[socket.id].write(data);
      
      // If this is a new connection and the user is typing, enable the interface
      if (isProcessing) {
        isProcessing = false;
      }
    } else {
      // If there's no terminal session, create one
      console.log('No active terminal session, creating one...');
      
      // Get the terminal working directory from environment variables or use a default
      const terminalCwd = process.env.TERMINAL_CWD || process.env.HOME;
      
      // Create a new terminal process
      const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
      const term = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: terminalCwd,
        env: process.env
      });
      
      // Store the terminal
      terminals[socket.id] = term;
      
      // Set up the data handler
      term.onData((termData) => {
        socket.emit('terminal-output', termData);
      });
      
      // Write the initial input
      term.write(data);
    }
  });

  // Handle terminal resize events
  socket.on('terminal-resize', ({ cols, rows }) => {
    if (terminals[socket.id]) {
      logDebug(`Resizing terminal to ${cols}x${rows}`);
      try {
        terminals[socket.id].resize(cols, rows);
      } catch (error) {
        console.error('Error resizing terminal:', error);
      }
    }
  });
});

// Store active terminal sessions
const terminals = {};

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the web interface at http://localhost:${PORT} (local) or http://<your-ip-address>:${PORT} (remote)`);
  
  // Try to get and display the server's IP addresses
  try {
    const networkInterfaces = os.networkInterfaces();
    console.log('Available on:');
    Object.keys(networkInterfaces).forEach(interfaceName => {
      networkInterfaces[interfaceName].forEach(iface => {
        // Skip internal/non-IPv4 addresses
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`  http://${iface.address}:${PORT}`);
        }
      });
    });
  } catch (err) {
    console.log('Could not determine network interfaces:', err.message);
  }
}); 