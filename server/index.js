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
const LOGGING = process.env.LOGGING === 'false';
function logDebug(message) {
  if (DEBUG && LOGGING) {
    console.log(`[DEBUG] ${message}`);
  }
}

// Create Express app
const app = express();
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost origins
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow Cloudflare tunnel domains
    if (origin.includes('trycloudflare.com')) {
      return callback(null, true);
    }
    
    // Allow any other origins you need
    // Add your production domain here if needed
    
    // Default deny
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Serve static files from the client directory for backward compatibility
app.use(express.static(path.join(__dirname, '../client')));

// Add a route to redirect to the Next.js frontend
app.get('/next', (req, res) => {
  res.redirect('http://localhost:3001');
});

// Create HTTP server
const server = http.createServer(app);

// Create Socket.io server with CORS configuration
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Allow localhost origins
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      
      // Allow Cloudflare tunnel domains
      if (origin.includes('trycloudflare.com')) {
        return callback(null, true);
      }
      
      // Allow any other origins you need
      // Add your production domain here if needed
      
      // Default deny
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Set up logging for debugging - only if LOGGING is enabled
let logsDir;
let sessionLogs = {};

if (LOGGING) {
  logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`Created logs directory at ${logsDir}`);
  }
}

// Function to initialize a session log file
function initSessionLog(socketId, terminalId, prompt) {
  if (!LOGGING) return null;
  
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const logFileName = path.join(logsDir, `claude_session_${socketId}_${terminalId}_${timestamp}.log`);
  
  // Create the log file with a header
  fs.writeFileSync(
    logFileName, 
    `==========================================================\n` +
    `CLAUDE SESSION LOG - ${new Date().toISOString()}\n` +
    `Socket ID: ${socketId}\n` +
    `Terminal ID: ${terminalId}\n` +
    `Prompt: ${prompt}\n` +
    `==========================================================\n\n`
  );
  
  // Store the log file name for this session
  const sessionKey = `${socketId}-${terminalId}`;
  sessionLogs[sessionKey] = logFileName;
  
  logDebug(`Initialized session log file: ${logFileName}`);
  return logFileName;
}

// Function to append to the session log file
function appendToSessionLog(socketId, terminalId, section, data) {
  if (!LOGGING) return;
  
  const sessionKey = `${socketId}-${terminalId}`;
  if (!sessionLogs[sessionKey]) {
    logDebug(`No session log file found for session ${sessionKey}`);
    return;
  }
  
  const timestamp = new Date().toISOString();
  const separator = '\n' + '-'.repeat(60) + '\n';
  
  // Format the section header
  const header = `\n${separator}${section} - ${timestamp}${separator}\n`;
  
  // Append to the log file
  fs.appendFileSync(sessionLogs[sessionKey], header + data + '\n');
  
  logDebug(`Appended ${section} to session log for session ${sessionKey}`);
}

// Function to close the session log file
function closeSessionLog(socketId, terminalId) {
  if (!LOGGING) return;
  
  const sessionKey = `${socketId}-${terminalId}`;
  if (!sessionLogs[sessionKey]) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const separator = '\n' + '='.repeat(60) + '\n';
  
  // Add a footer to the log file
  fs.appendFileSync(
    sessionLogs[sessionKey], 
    `${separator}SESSION ENDED - ${timestamp}${separator}\n`
  );
  
  logDebug(`Closed session log file for session ${sessionKey}`);
  
  // Remove the log file name from the map
  delete sessionLogs[sessionKey];
}

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Store terminals for this socket
  const clientTerminals = {};
  
  // Handle new Claude Code prompt with multiple terminals
  socket.on('execute-claude', (data) => {
    const { prompt, terminalCount, terminalIds } = data;
    console.log(`Executing Claude with prompt: "${prompt}" on ${terminalCount} terminals`);
    
    // Get the terminal working directory from environment variables or use a default
    const terminalCwd = process.env.TERMINAL_CWD || process.env.HOME;
    console.log(`Using terminal working directory: ${terminalCwd}`);
    
    // Create terminals for each requested terminal ID
    terminalIds.forEach(terminalId => {
      console.log(`Creating terminal ${terminalId} for socket ${socket.id}`);
      
      // Initialize the session log file
      initSessionLog(socket.id, terminalId, prompt);
      
      // Create a new terminal process
      const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
      const term = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: terminalCwd, // Use the configured directory
        env: process.env
      });
      
      // Store the terminal with the terminal ID
      clientTerminals[terminalId] = term;
      
      // Flag to track if we've already auto-responded to a prompt
      const promptsResponded = new Set();
      
      // Send terminal output directly to the client without processing
      term.onData((data) => {
        // Log raw data for debugging
        if (data.includes('❯') || data.includes('Do you want to proceed')) {
          logDebug(`Raw data (terminal ${terminalId}): ${JSON.stringify(data)}`);
        }
        
        // Save raw output to a log file
        appendToSessionLog(socket.id, terminalId, 'Raw Output', data);
        
        // Send raw data directly to the client with terminal ID
        socket.emit('terminal-output', { terminalId, data });
        
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
          logDebug(`Checking for prompts in terminal ${terminalId}: ${text.substring(0, 200)}...`);
        }
        
        // DIRECT CHECK: If we see "Bash command" text, respond immediately
        if (text.includes('Bash command') && text.includes('Do you want to proceed?')) {
          console.log(`Terminal ${terminalId}: Detected Bash command prompt, automatically pressing Enter`);
          logDebug(`Terminal ${terminalId}: Detected Bash command prompt`);
          return true;
        }
        
        // DIRECT CHECK: If we see the exact pattern from the user's example, respond immediately
        if (text.includes('Do you want to proceed?') && text.includes('❯ Yes')) {
          console.log(`Terminal ${terminalId}: Detected exact prompt pattern, automatically pressing Enter`);
          logDebug(`Terminal ${terminalId}: Detected exact prompt pattern: Do you want to proceed? with ❯ Yes`);
          return true;
        }
        
        // DIRECT CHECK: If we see "Claude needs your permission" with a blue arrow, respond immediately
        if (text.includes('Claude needs your permission')) {
          console.log(`Terminal ${terminalId}: Detected permission prompt, automatically pressing Enter`);
          logDebug(`Terminal ${terminalId}: Detected permission prompt: Claude needs your permission`);
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
                console.log(`Terminal ${terminalId}: Detected prompt, automatically pressing Enter`);
                logDebug(`Terminal ${terminalId}: Detected prompt: ${promptSignature}`);
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
              console.log(`Terminal ${terminalId}: Detected blue arrow in line, automatically pressing Enter`);
              logDebug(`Terminal ${terminalId}: Detected blue arrow in line: ${line.substring(0, 100)}`);
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
      
      // Execute Claude with the provided prompt
      let claudeCommand;
      if (prompt.trim() === '') {
        // If prompt is empty, just run 'claude' without arguments
        claudeCommand = `claude\r`;
        console.log(`Terminal ${terminalId}: Running command without prompt: ${claudeCommand}`);
      } else {
        // Escape any quotes in the prompt to prevent command injection
        const escapedPrompt = prompt.replace(/"/g, '\\"');
        claudeCommand = `claude "${escapedPrompt}"\r`;
        console.log(`Terminal ${terminalId}: Running command with prompt: ${claudeCommand}`);
      }
      
      term.write(claudeCommand);
      
      // Wait 2 seconds, then press Enter to trust files if prompted
      setTimeout(() => {
        console.log(`Terminal ${terminalId}: Sending Enter key to trust files if needed`);
        term.write('\r');
      }, 2000);
    });
  });
  
  // Handle terminal input from client
  socket.on('terminal-input', (data) => {
    const { terminalId, input } = data;
    
    if (clientTerminals[terminalId]) {
      // Log the input for debugging only if logging is enabled
      if (LOGGING && (input.length > 1 || input.charCodeAt(0) < 32)) {
        logDebug(`Terminal ${terminalId} input: ${JSON.stringify(input)}`);
      }
      
      // Write the data to the terminal
      clientTerminals[terminalId].write(input);
    } else {
      console.log(`No active terminal session for terminal ${terminalId}, ignoring input`);
    }
  });

  // Handle terminal resize events
  socket.on('terminal-resize', (data) => {
    const { terminalId, cols, rows } = data;
    
    if (clientTerminals[terminalId]) {
      if (LOGGING) {
        logDebug(`Resizing terminal ${terminalId} to ${cols}x${rows}`);
      }
      try {
        clientTerminals[terminalId].resize(cols, rows);
      } catch (error) {
        console.error(`Error resizing terminal ${terminalId}:`, error);
      }
    }
  });
  
  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Close all terminals for this client
    Object.keys(clientTerminals).forEach(terminalId => {
      if (clientTerminals[terminalId]) {
        clientTerminals[terminalId].kill();
        closeSessionLog(socket.id, terminalId);
      }
    });
    
    // Clear the terminals object for this client
    Object.keys(clientTerminals).forEach(terminalId => {
      delete clientTerminals[terminalId];
    });
  });
});

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