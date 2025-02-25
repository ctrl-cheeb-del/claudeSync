document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const promptForm = document.getElementById('prompt-form');
    const promptInput = document.getElementById('prompt-input');
    const submitBtn = document.getElementById('submit-btn');
    const clearBtn = document.getElementById('clear-btn');
    const escapeBtn = document.getElementById('escape-btn');
    const connectionStatus = document.getElementById('connection-status');
    const followupForm = document.getElementById('followup-form');
    const followupInput = document.getElementById('followup-input');
    const followupBtn = document.getElementById('followup-btn');
    const terminalSection = document.querySelector('.terminal-section');
    const promptSection = document.querySelector('.prompt-section');
    
    // Hide terminal section initially
    if (terminalSection) {
        terminalSection.style.display = 'none';
    }
    
    // State management
    let isProcessing = false;
    
    // Connect to the server using the current hostname instead of hardcoded localhost
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : `http://${window.location.hostname}:3000`;
    console.log('Connecting to socket server at:', socketUrl);
    const socket = io(socketUrl);
    
    // Initialize xterm.js with options optimized for mobile
    const isMobile = window.innerWidth <= 480;
    const isTablet = window.innerWidth > 480 && window.innerWidth <= 768;
    
    // Calculate initial terminal dimensions based on device
    let initialCols = 80;
    let initialRows = 24;
    
    if (isMobile) {
        // For mobile, use a wider initial setting to ensure text fits
        initialCols = Math.floor((window.innerWidth - 32) / 5); // Estimate based on char width
        initialRows = 20;
    } else if (isTablet) {
        initialCols = 60;
        initialRows = 22;
    }
    
    const term = new Terminal({
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: isMobile ? 10 : (isTablet ? 12 : 14),
        lineHeight: isMobile ? 1.2 : 1.5,
        cursorBlink: true,
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
        scrollback: 5000,
        allowTransparency: true,
        padding: isMobile ? 4 : (isTablet ? 8 : 14),
        cursorStyle: 'bar',
        convertEol: true,
        disableStdin: false,
        wordBreak: 'break-word',
        cols: initialCols,
        rows: initialRows,
        rightClickSelectsWord: true,
        macOptionIsMeta: true,
        macOptionClickForcesSelection: true
    });
    
    // Function to apply mobile-specific styling to the terminal
    function applyMobileTerminalStyling() {
        if (isMobile) {
            // Force terminal to fit mobile width
            const termElement = document.querySelector('.terminal-container .xterm');
            if (termElement) {
                termElement.style.maxWidth = '95vw'; // Reduce from 100vw to 95vw
                termElement.style.width = '95%'; // Reduce from 100% to 95%
                // Allow horizontal scrolling when needed
                termElement.style.overflowX = 'auto';
            }
            
            // Apply word wrapping to terminal content
            const termRows = document.querySelector('.terminal-container .xterm-rows');
            if (termRows) {
                termRows.style.wordBreak = 'break-word';
                termRows.style.whiteSpace = 'pre-wrap';
                termRows.style.maxWidth = '95%'; // Reduce from 100% to 95%
                // Reduce line height for mobile
                termRows.style.lineHeight = '1.2';
            }
            
            // Adjust viewport
            const viewport = document.querySelector('.terminal-container .xterm-viewport');
            if (viewport) {
                viewport.style.maxWidth = '95vw'; // Reduce from 100vw to 95vw
                viewport.style.width = '95%'; // Reduce from 100% to 95%
                // Allow horizontal scrolling when needed
                viewport.style.overflowX = 'auto';
            }
            
            // Force line wrapping for all span elements
            const spans = document.querySelectorAll('.terminal-container .xterm-rows span');
            spans.forEach(span => {
                span.style.whiteSpace = 'pre-wrap';
                span.style.wordBreak = 'break-word';
                span.style.maxWidth = '95%'; // Reduce from 100% to 95%
                span.style.display = 'inline-block';
                // Ensure text doesn't overflow
                span.style.overflowWrap = 'break-word';
            });
            
            // Adjust the terminal screen
            const screen = document.querySelector('.terminal-container .xterm-screen');
            if (screen) {
                screen.style.maxWidth = '95vw'; // Reduce from 100vw to 95vw
                screen.style.width = '95%'; // Reduce from 100% to 95%
            }
            
            // Adjust the terminal container
            const container = document.querySelector('.terminal-container');
            if (container) {
                container.style.maxWidth = '95vw'; // Reduce from 100vw to 95vw
                container.style.width = '95%'; // Reduce from 100% to 95%
                container.style.minWidth = 'unset';
                // Remove any fixed width that might be limiting the container
                container.style.left = '0';
                container.style.right = '0';
                // Ensure the container takes up the full available width
                container.style.boxSizing = 'border-box';
                container.style.padding = '0 8px'; // Increase padding slightly
                // Allow horizontal scrolling when needed
                container.style.overflowX = 'auto';
            }
            
            // Adjust the terminal section to ensure it takes full width
            const terminalSection = document.querySelector('.terminal-section');
            if (terminalSection) {
                terminalSection.style.width = '95%'; // Reduce from 100% to 95%
                terminalSection.style.maxWidth = '95vw'; // Reduce from 100vw to 95vw
                terminalSection.style.padding = '0';
                terminalSection.style.margin = '0 auto'; // Center the terminal section
                // Allow horizontal scrolling when needed
                terminalSection.style.overflowX = 'auto';
            }
            
            // Improve terminal header alignment on mobile
            const terminalHeader = document.querySelector('.terminal-header');
            if (terminalHeader) {
                terminalHeader.style.padding = '4px 8px';
                terminalHeader.style.alignItems = 'center';
                terminalHeader.style.flexDirection = 'row';
                terminalHeader.style.justifyContent = 'space-between';
                terminalHeader.style.width = '100%';
            }
            
            // Adjust the terminal controls for better alignment
            const terminalControls = document.querySelector('.terminal-controls');
            if (terminalControls) {
                terminalControls.style.justifyContent = 'flex-start';
                terminalControls.style.alignItems = 'center';
            }
            
            // Adjust the terminal actions for better alignment
            const terminalActions = document.querySelector('.terminal-actions');
            if (terminalActions) {
                terminalActions.style.alignItems = 'center';
                terminalActions.style.justifyContent = 'flex-end';
            }
            
            // Make the cancel button more compact
            const escapeBtn = document.getElementById('escape-btn');
            if (escapeBtn) {
                escapeBtn.style.padding = '4px 8px';
                escapeBtn.style.fontSize = '0.8rem';
            }
        }
    }
    
    // Open the terminal in the container
    term.open(document.getElementById('terminal'));
    
    // Apply initial mobile styling
    applyMobileTerminalStyling();
    
    // Set up mutation observer for mobile devices to continuously apply styling
    if (window.innerWidth <= 480) {
        // Create a mutation observer to watch for changes to the terminal content
        const terminalObserver = new MutationObserver(() => {
            // Apply mobile styling whenever the terminal content changes
            applyMobileTerminalStyling();
        });
        
        // Start observing the terminal rows for changes
        const termRows = document.querySelector('.terminal-container .xterm-rows');
        if (termRows) {
            terminalObserver.observe(termRows, { 
                childList: true, 
                subtree: true, 
                characterData: true 
            });
        }
    }
    
    // Enable direct terminal input
    term.onData(data => {
        // Only send data to the server if we're connected and a terminal session exists
        if (socket.connected && !isProcessing) {
            socket.emit('terminal-input', data);
        }
    });
    
    // Make the terminal focusable
    document.getElementById('terminal').addEventListener('click', () => {
        term.focus();
    });
    
    // Function to fit the terminal to its container
    function fitTerminal() {
        const terminalContainer = document.querySelector('.terminal-container');
        if (!terminalContainer) return;
        
        // Get the container dimensions, accounting for padding
        const containerStyle = window.getComputedStyle(terminalContainer);
        const paddingLeft = parseInt(containerStyle.paddingLeft, 10) || 0;
        const paddingRight = parseInt(containerStyle.paddingRight, 10) || 0;
        const paddingTop = parseInt(containerStyle.paddingTop, 10) || 0;
        const paddingBottom = parseInt(containerStyle.paddingBottom, 10) || 0;
        
        // For mobile devices, use the viewport width to ensure full width
        let availableWidth;
        if (isMobile) {
            // Use 95% of the viewport width for mobile devices
            const parentWidth = terminalContainer.parentElement.clientWidth * 0.95;
            const viewportWidth = (window.innerWidth * 0.95) - 16; // Use 95% of viewport width
            availableWidth = Math.min(parentWidth, viewportWidth) - paddingLeft - paddingRight;
        } else {
            availableWidth = terminalContainer.clientWidth - paddingLeft - paddingRight;
        }
        
        // Add extra padding at the bottom to ensure content isn't cut off
        const availableHeight = terminalContainer.clientHeight - paddingTop - paddingBottom - 15;
        
        // Calculate how many rows and columns fit in the available space
        // Adjust these values based on your terminal font size and line height
        let charWidth = 8.5; // Approximate width of a character in pixels
        let charHeight = 19; // Character height
        
        // Adjust character dimensions for mobile devices
        if (isMobile) {
            charWidth = 5; // Smaller character width for mobile
            charHeight = 12; // Smaller character height for mobile
        } else if (isTablet) {
            charWidth = 6; // Medium character width for tablets
            charHeight = 15; // Medium character height for tablets
        }
        
        // Calculate columns and rows
        let cols;
        
        // For mobile devices, use a fixed column count that fits most screens
        if (isMobile) {
            // Calculate columns based on available width, but ensure it's reasonable
            // Use a slightly smaller number to prevent overflow
            cols = Math.max(35, Math.floor((availableWidth * 0.95) / charWidth));
        } else if (isTablet) {
            cols = Math.min(60, Math.floor(availableWidth / charWidth));
        } else {
            cols = Math.max(80, Math.floor(availableWidth / charWidth));
        }
        
        // Reduce the number of rows slightly to ensure the bottom isn't cut off
        const rows = Math.max(18, Math.floor(availableHeight / charHeight) - 1);
        
        // Resize the terminal
        if (term && cols > 0 && rows > 0) {
            term.resize(cols, rows);
            
            // Send the new dimensions to the server
            socket.emit('terminal-resize', { cols, rows });
            
            console.log(`Terminal resized to ${cols}x${rows}`);
            
            // Apply mobile styling after resize
            if (isMobile) {
                applyMobileTerminalStyling();
            }
        }
    }
    
    // Add window resize event listener
    window.addEventListener('resize', () => {
        // Debounce the resize event to avoid excessive calls
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(fitTerminal, 250);
    });
    
    // Add orientation change listener for mobile devices
    window.addEventListener('orientationchange', () => {
        // Resize terminal after orientation change with a delay to ensure proper calculations
        setTimeout(fitTerminal, 300);
    });
    
    // Socket connection event handlers
    socket.on('connect', () => {
        console.log('Connected to server');
        connectionStatus.textContent = 'Connected';
        connectionStatus.classList.add('connected');
        enableInterface();
        
        // Don't show welcome message until terminal is visible
        // The welcome message will be shown when the terminal becomes visible
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        connectionStatus.textContent = 'Disconnected';
        connectionStatus.classList.remove('connected');
        disableInterface();
        
        // Show disconnection message only if terminal is visible
        if (terminalSection && terminalSection.style.display !== 'none') {
            term.write('\r\n\x1b[1;31mDisconnected from server. Please refresh the page to reconnect.\x1b[0m\r\n');
        }
    });
    
    // Handle terminal output from server
    socket.on('terminal-output', (data) => {
        // Write the raw data directly to the terminal
        term.write(data);
        
        // Scroll to the bottom to ensure the latest output is visible
        term.scrollToBottom();
        
        // Re-enable interface if we're getting output
        if (isProcessing) {
            setTimeout(() => {
                enableInterface();
                isProcessing = false;
            }, 500);
        }
    });
    
    // Form submission handler
    promptForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const prompt = promptInput.value.trim();
        if (!prompt || isProcessing) return;
        
        // Disable interface and show loading state
        isProcessing = true;
        disableInterface();
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Processing...</span>';
        
        // Show terminal section if it's the first prompt
        if (terminalSection && terminalSection.style.display === 'none') {
            // Hide the prompt section
            if (promptSection) {
                promptSection.style.display = 'none';
            }
            
            // Show and expand the terminal section
            terminalSection.style.display = 'flex';
            terminalSection.style.flex = '1';
            terminalSection.classList.add('expanded');
            
            // For mobile devices, ensure the terminal section takes full width
            if (isMobile) {
                terminalSection.style.width = '95%';
                terminalSection.style.maxWidth = '95vw';
                terminalSection.style.padding = '0';
                terminalSection.style.margin = '0 auto';
                terminalSection.style.overflowX = 'auto';
                
                // Also adjust the app-content container for mobile
                const appContent = document.querySelector('.app-content');
                if (appContent) {
                    appContent.style.width = '95%';
                    appContent.style.padding = '0';
                    appContent.style.margin = '0 auto';
                }
                
                // Ensure the terminal container takes full width
                const terminalContainer = document.getElementById('terminal');
                if (terminalContainer) {
                    terminalContainer.style.width = '95%';
                    terminalContainer.style.maxWidth = '95vw';
                    terminalContainer.style.boxSizing = 'border-box';
                    terminalContainer.style.padding = '0 8px';
                    terminalContainer.style.overflowX = 'auto';
                    
                    // Force the terminal to take the full width of its container
                    const xtermElement = terminalContainer.querySelector('.xterm');
                    if (xtermElement) {
                        xtermElement.style.width = '95%';
                        xtermElement.style.maxWidth = '95vw';
                        xtermElement.style.overflowX = 'auto';
                    }
                }
                
                // Improve terminal header alignment on mobile
                const terminalHeader = document.querySelector('.terminal-header');
                if (terminalHeader) {
                    terminalHeader.style.padding = '4px 8px';
                    terminalHeader.style.alignItems = 'center';
                    terminalHeader.style.flexDirection = 'row';
                    terminalHeader.style.justifyContent = 'space-between';
                    terminalHeader.style.width = '100%';
                }
                
                // Adjust the terminal controls for better alignment
                const terminalControls = document.querySelector('.terminal-controls');
                if (terminalControls) {
                    terminalControls.style.justifyContent = 'flex-start';
                    terminalControls.style.alignItems = 'center';
                }
                
                // Adjust the terminal actions for better alignment
                const terminalActions = document.querySelector('.terminal-actions');
                if (terminalActions) {
                    terminalActions.style.alignItems = 'center';
                    terminalActions.style.justifyContent = 'flex-end';
                }
                
                // Make the cancel button more compact
                const escapeBtn = document.getElementById('escape-btn');
                if (escapeBtn) {
                    escapeBtn.style.padding = '4px 8px';
                    escapeBtn.style.fontSize = '0.8rem';
                }
            }
            
            // Fit terminal to container after making it visible
            // Use multiple attempts with increasing delays to ensure proper sizing
            setTimeout(() => {
                fitTerminal();
                term.scrollToBottom();
                applyMobileTerminalStyling();
            }, 50);
            setTimeout(() => {
                fitTerminal();
                term.scrollToBottom();
                applyMobileTerminalStyling();
            }, 150);
            setTimeout(() => {
                fitTerminal();
                term.scrollToBottom();
                applyMobileTerminalStyling();
            }, 300);
            // One more resize after a longer delay to ensure proper sizing
            setTimeout(() => {
                fitTerminal();
                term.scrollToBottom();
                applyMobileTerminalStyling();
            }, 600);
            
            // Additional resize for mobile devices
            if (window.innerWidth <= 768) {
                // Extra attempts for mobile devices which may need more time to adjust layout
                setTimeout(() => {
                    fitTerminal();
                    term.scrollToBottom();
                    applyMobileTerminalStyling();
                }, 1000);
                setTimeout(() => {
                    fitTerminal();
                    term.scrollToBottom();
                    applyMobileTerminalStyling();
                }, 1500);
            }
        }
        
        // Clear terminal if requested
        if (document.activeElement === clearBtn) {
            term.clear();
        }
        
        // Display user prompt in terminal
        term.write(`\x1b[1;36mYou:\x1b[0m ${prompt}\r\n\r\n`);
        
        // Send prompt to server
        socket.emit('execute-claude', prompt);
        
        // Clear input
        promptInput.value = '';
    });
    
    // Follow-up form submission handler
    followupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const followupPrompt = followupInput.value.trim();
        if (!followupPrompt || isProcessing) return;
        
        // Display follow-up prompt in terminal
        term.write(`\r\n\x1b[1;36mYou:\x1b[0m ${followupPrompt}\r\n\r\n`);
        
        // Disable interface and show loading
        isProcessing = true;
        disableInterface();
        followupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        // Send each character of the follow-up prompt individually to simulate typing
        for (const char of followupPrompt) {
            socket.emit('terminal-input', char);
        }
        
        // Send Enter key after the prompt
        setTimeout(() => {
            socket.emit('terminal-input', '\r');
        }, 100);
        
        // Clear the input field
        followupInput.value = '';
    });
    
    // Clear button handler
    clearBtn.addEventListener('click', () => {
        term.clear();
        term.write('\x1b[1;32mTerminal cleared. Start a new conversation!\x1b[0m\r\n\r\n');
    });
    
    // Escape/Panic button handler
    escapeBtn.addEventListener('click', () => {
        if (socket.connected) {
            // Send ESC key to terminal
            socket.emit('terminal-input', '\u001b'); // ESC key
            
            // Add visual feedback
            escapeBtn.classList.add('active');
            term.write('\r\n\x1b[1;33m[System: Sent ESC key to terminal - attempting to cancel operation]\x1b[0m\r\n\r\n');
            
            // Remove active class after a short delay
            setTimeout(() => {
                escapeBtn.classList.remove('active');
                enableInterface();
                isProcessing = false;
            }, 300);
        }
    });
    
    // Function to enable interface elements
    function enableInterface() {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>Execute</span>';
        followupBtn.disabled = false;
        followupBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
        escapeBtn.disabled = false;
        promptInput.disabled = false;
        followupInput.disabled = false;
    }
    
    // Function to disable interface elements
    function disableInterface() {
        submitBtn.disabled = true;
        followupBtn.disabled = true;
        promptInput.disabled = true;
        followupInput.disabled = true;
    }
    
    // Initialize the terminal size after a short delay
    setTimeout(fitTerminal, 100);
}); 