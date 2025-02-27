document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const promptForm = document.getElementById('prompt-form');
    const promptInput = document.getElementById('prompt-input');
    const submitBtn = document.getElementById('submit-btn');
    const createTerminalsBtn = document.getElementById('create-terminals-btn');
    const terminalCountInput = document.getElementById('terminal-count');
    const terminalCountButtons = document.getElementById('terminal-count-buttons');
    const followupForm = document.getElementById('followup-form');
    const followupInput = document.getElementById('followup-input');
    const followupBtn = document.getElementById('followup-btn');
    const terminalSection = document.querySelector('.terminal-section');
    const promptSection = document.querySelector('.prompt-section');
    const terminalsGrid = document.getElementById('terminals-grid');
    
    // Hide terminal section initially
    if (terminalSection) {
        terminalSection.style.display = 'none';
    }
    
    // Set up terminal count buttons
    if (terminalCountButtons) {
        const countButtons = terminalCountButtons.querySelectorAll('.count-btn');
        
        countButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                countButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Update hidden input value
                terminalCountInput.value = button.dataset.value;
                
                // Add subtle animation
                button.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    button.style.transform = '';
                }, 200);
            });
        });
    }
    
    // State management
    let isProcessing = false;
    const terminals = {}; // Store terminal instances
    let activeTerminalId = '0'; // Currently active terminal for follow-up
    
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
    
    // Function to create terminal options
    function createTerminalOptions() {
        return {
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
        };
    }
    
    // Function to create a new terminal
    function createTerminal(terminalId) {
        // Create terminal wrapper if it doesn't exist
        if (!document.getElementById(`terminal-wrapper-${terminalId}`)) {
            const terminalWrapper = document.createElement('div');
            terminalWrapper.className = 'terminal-wrapper';
            terminalWrapper.id = `terminal-wrapper-${terminalId}`;
            
            terminalWrapper.innerHTML = `
                <div class="terminal-header">
                    <div class="terminal-controls">
                        <div class="control-dots">
                            <span class="dot red"></span>
                            <span class="dot yellow"></span>
                            <span class="dot green"></span>
                        </div>
                        <div class="terminal-title">Terminal ${parseInt(terminalId) + 1}</div>
                    </div>
                    <div class="terminal-actions">
                        <button class="btn icon-btn clear-btn" title="Clear terminal" data-terminal-id="${terminalId}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        <button class="btn danger-btn escape-btn" title="Send ESC key" data-terminal-id="${terminalId}">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>Cancel</span>
                        </button>
                    </div>
                </div>
                <div class="terminal-container" id="terminal-${terminalId}"></div>
            `;
            
            terminalsGrid.appendChild(terminalWrapper);
            
            // Add event listeners for the new terminal's buttons
            const clearBtn = terminalWrapper.querySelector(`.clear-btn[data-terminal-id="${terminalId}"]`);
            const escapeBtn = terminalWrapper.querySelector(`.escape-btn[data-terminal-id="${terminalId}"]`);
            
            clearBtn.addEventListener('click', () => {
                if (terminals[terminalId]) {
                    terminals[terminalId].clear();
                    terminals[terminalId].write('\x1b[1;32mTerminal cleared. Start a new conversation!\x1b[0m\r\n\r\n');
                }
            });
            
            escapeBtn.addEventListener('click', () => {
                if (socket.connected && terminals[terminalId]) {
                    // Send ESC key to terminal
                    socket.emit('terminal-input', { terminalId, input: '\u001b' }); // ESC key
                    
                    // Add visual feedback
                    escapeBtn.classList.add('active');
                    terminals[terminalId].write('\r\n\x1b[1;33m[System: Sent ESC key to terminal - attempting to cancel operation]\x1b[0m\r\n\r\n');
                    
                    // Remove active class after a short delay
                    setTimeout(() => {
                        escapeBtn.classList.remove('active');
                    }, 300);
                }
            });
            
            // Make the terminal wrapper clickable to set as active
            terminalWrapper.addEventListener('click', () => {
                setActiveTerminal(terminalId);
            });
        }
        
        // Create the terminal instance
        const term = new Terminal(createTerminalOptions());
        term.open(document.getElementById(`terminal-${terminalId}`));
        
        // Enable direct terminal input
        term.onData(data => {
            // Only send data to the server if we're connected and a terminal session exists
            if (socket.connected && !isProcessing) {
                socket.emit('terminal-input', { terminalId, input: data });
            }
        });
        
        // Make the terminal focusable
        document.getElementById(`terminal-${terminalId}`).addEventListener('click', () => {
            term.focus();
            setActiveTerminal(terminalId);
        });
        
        // Store the terminal instance
        terminals[terminalId] = term;
        
        return term;
    }
    
    // Function to set the active terminal
    function setActiveTerminal(terminalId) {
        // Remove active class from all terminal wrappers
        document.querySelectorAll('.terminal-wrapper').forEach(wrapper => {
            wrapper.classList.remove('active');
        });
        
        // Add active class to the selected terminal wrapper
        const wrapper = document.getElementById(`terminal-wrapper-${terminalId}`);
        if (wrapper) {
            wrapper.classList.add('active');
        }
        
        // Set the active terminal ID
        activeTerminalId = terminalId;
        
        // Update the followup input placeholder
        const followupInput = document.getElementById('followup-input');
        if (followupInput) {
            followupInput.placeholder = `Enter follow-up prompt for Terminal ${parseInt(terminalId) + 1}...`;
        }
        
        // Focus the terminal
        if (terminals[terminalId]) {
            terminals[terminalId].focus();
        }
    }
    
    // Function to apply mobile-specific styling to the terminal
    function applyMobileTerminalStyling(terminalId) {
        if (isMobile) {
            // Force terminal to fit mobile width
            const termElement = document.querySelector(`#terminal-${terminalId} .xterm`);
            if (termElement) {
                termElement.style.maxWidth = '95vw'; // Reduce from 100vw to 95vw
                termElement.style.width = '95%'; // Reduce from 100% to 95%
                // Allow horizontal scrolling when needed
                termElement.style.overflowX = 'auto';
            }
            
            // Apply word wrapping to terminal content
            const termRows = document.querySelector(`#terminal-${terminalId} .xterm-rows`);
            if (termRows) {
                termRows.style.wordBreak = 'break-word';
                termRows.style.whiteSpace = 'pre-wrap';
                termRows.style.maxWidth = '95%'; // Reduce from 100% to 95%
                // Reduce line height for mobile
                termRows.style.lineHeight = '1.2';
            }
            
            // Adjust viewport
            const viewport = document.querySelector(`#terminal-${terminalId} .xterm-viewport`);
            if (viewport) {
                viewport.style.maxWidth = '95vw'; // Reduce from 100vw to 95vw
                viewport.style.width = '95%'; // Reduce from 100% to 95%
                // Allow horizontal scrolling when needed
                viewport.style.overflowX = 'auto';
            }
            
            // Force line wrapping for all span elements
            const spans = document.querySelectorAll(`#terminal-${terminalId} .xterm-rows span`);
            spans.forEach(span => {
                span.style.whiteSpace = 'pre-wrap';
                span.style.wordBreak = 'break-word';
                span.style.maxWidth = '95%'; // Reduce from 100% to 95%
                span.style.display = 'inline-block';
                // Ensure text doesn't overflow
                span.style.overflowWrap = 'break-word';
            });
            
            // Adjust the terminal screen
            const screen = document.querySelector(`#terminal-${terminalId} .xterm-screen`);
            if (screen) {
                screen.style.maxWidth = '95vw'; // Reduce from 100vw to 95vw
                screen.style.width = '95%'; // Reduce from 100% to 95%
            }
            
            // Adjust the terminal container
            const container = document.querySelector(`#terminal-${terminalId}`);
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
        }
    }
    
    // Function to fit the terminal to its container
    function fitTerminal(terminalId) {
        const terminalContainer = document.querySelector(`#terminal-${terminalId}`);
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
        // Increased the bottom padding buffer from 15 to 30 pixels
        const availableHeight = terminalContainer.clientHeight - paddingTop - paddingBottom - 30;
        
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
        // Increased the row reduction from 1 to 3 to provide more bottom space
        const rows = Math.max(18, Math.floor(availableHeight / charHeight) - 3);
        
        // Resize the terminal
        if (terminals[terminalId] && cols > 0 && rows > 0) {
            terminals[terminalId].resize(cols, rows);
            
            // Send the new dimensions to the server
            socket.emit('terminal-resize', { terminalId, cols, rows });
            
            console.log(`Terminal ${terminalId} resized to ${cols}x${rows}`);
            
            // Apply mobile styling after resize
            if (isMobile) {
                applyMobileTerminalStyling(terminalId);
            }
        }
    }
    
    // Function to fit all terminals
    function fitAllTerminals() {
        Object.keys(terminals).forEach(terminalId => {
            fitTerminal(terminalId);
        });
    }
    
    // Add window resize event listener
    window.addEventListener('resize', () => {
        // Debounce the resize event to avoid excessive calls
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(fitAllTerminals, 250);
    });
    
    // Add orientation change listener for mobile devices
    window.addEventListener('orientationchange', () => {
        // Resize terminal after orientation change with a delay to ensure proper calculations
        setTimeout(fitAllTerminals, 300);
    });
    
    // Socket connection event handlers
    socket.on('connect', () => {
        console.log('Connected to server');
        const connectionStatus = document.getElementById('connection-status');
        connectionStatus.textContent = 'Connected';
        connectionStatus.classList.add('connected');
        enableInterface();
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        const connectionStatus = document.getElementById('connection-status');
        connectionStatus.textContent = 'Disconnected';
        connectionStatus.classList.remove('connected');
        disableInterface();
        
        // Show disconnection message in all terminals
        Object.keys(terminals).forEach(terminalId => {
            terminals[terminalId].write('\r\n\x1b[1;31mDisconnected from server. Please refresh the page to reconnect.\x1b[0m\r\n');
        });
    });
    
    // Handle terminal output from server
    socket.on('terminal-output', (data) => {
        const { terminalId, data: terminalData } = data;
        
        // Make sure the terminal exists
        if (!terminals[terminalId]) {
            console.log(`Terminal ${terminalId} doesn't exist, creating it`);
            createTerminal(terminalId);
        }
        
        // Write the raw data directly to the terminal
        terminals[terminalId].write(terminalData);
        
        // Scroll to the bottom to ensure the latest output is visible
        terminals[terminalId].scrollToBottom();
        
        // Re-enable interface if we're getting output
        if (isProcessing) {
            setTimeout(() => {
                enableInterface();
                isProcessing = false;
            }, 500);
        }
    });
    
    // Function to create terminal grid based on count
    function createTerminalGrid(count) {
        // Clear existing terminals
        terminalsGrid.innerHTML = '';
        
        // Set the data-count attribute for CSS styling
        terminalsGrid.setAttribute('data-count', count);
        
        // Adjust container width based on terminal count
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            if (count > 1) {
                appContainer.style.maxWidth = '100%';
                appContainer.style.padding = 'var(--space-md) 0';
            } else {
                appContainer.style.maxWidth = '1000px';
                appContainer.style.padding = 'var(--space-md)';
            }
        }
        
        // Create the specified number of terminals
        for (let i = 0; i < count; i++) {
            createTerminal(i.toString());
        }
        
        // Set the first terminal as active
        setActiveTerminal('0');
        
        // Fit all terminals
        setTimeout(() => {
            fitAllTerminals();
        }, 100);
    }
    
    // Function to initialize terminals without a prompt
    function initializeTerminals() {
        if (isProcessing) return;
        
        // Get the number of terminals to create
        const terminalCount = parseInt(terminalCountInput.value);
        
        // Disable interface and show loading state
        isProcessing = true;
        disableInterface();
        createTerminalsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Creating...</span>';
        
        // Show terminal section if it's the first time
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
                terminalSection.style.width = '100%';
                terminalSection.style.maxWidth = '100%';
                terminalSection.style.padding = '0';
                terminalSection.style.margin = '0 auto';
                terminalSection.style.overflowX = 'auto';
                
                // Also adjust the app-content container for mobile
                const appContent = document.querySelector('.app-content');
                if (appContent) {
                    appContent.style.width = '100%';
                    appContent.style.padding = '0';
                    appContent.style.margin = '0 auto';
                }
            }
            
            // Allow terminals to expand beyond app-container
            const appContainer = document.querySelector('.app-container');
            if (appContainer && terminalCount > 1) {
                appContainer.style.maxWidth = '100%';
                appContainer.style.padding = 'var(--space-md) 0';
            }
        }
        
        // Create terminal grid with the specified count
        createTerminalGrid(terminalCount);
        
        // Generate array of terminal IDs
        const terminalIds = Array.from({ length: terminalCount }, (_, i) => i.toString());
        
        // Send empty prompt to server with terminal count and IDs
        socket.emit('execute-claude', { 
            prompt: '', 
            terminalCount, 
            terminalIds 
        });
        
        // Re-enable interface after a short delay
        setTimeout(() => {
            enableInterface();
            isProcessing = false;
        }, 1000);
    }
    
    // Add event listener for the "Create Terminals" button
    if (createTerminalsBtn) {
        createTerminalsBtn.addEventListener('click', initializeTerminals);
    }
    
    // Form submission handler
    promptForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const prompt = promptInput.value.trim();
        if (!prompt || isProcessing) return;
        
        // Get the number of terminals to create
        const terminalCount = parseInt(terminalCountInput.value);
        
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
                terminalSection.style.width = '100%';
                terminalSection.style.maxWidth = '100%';
                terminalSection.style.padding = '0';
                terminalSection.style.margin = '0 auto';
                terminalSection.style.overflowX = 'auto';
                
                // Also adjust the app-content container for mobile
                const appContent = document.querySelector('.app-content');
                if (appContent) {
                    appContent.style.width = '100%';
                    appContent.style.padding = '0';
                    appContent.style.margin = '0 auto';
                }
            }
            
            // Allow terminals to expand beyond app-container
            const appContainer = document.querySelector('.app-container');
            if (appContainer && terminalCount > 1) {
                appContainer.style.maxWidth = '100%';
                appContainer.style.padding = 'var(--space-md) 0';
            }
        }
        
        // Create terminal grid with the specified count
        createTerminalGrid(terminalCount);
        
        // Generate array of terminal IDs
        const terminalIds = Array.from({ length: terminalCount }, (_, i) => i.toString());
        
        // Display user prompt in all terminals
        terminalIds.forEach(terminalId => {
            terminals[terminalId].write(`\x1b[1;36mYou:\x1b[0m ${prompt}\r\n\r\n`);
        });
        
        // Send prompt to server with terminal count and IDs
        socket.emit('execute-claude', { 
            prompt, 
            terminalCount, 
            terminalIds 
        });
        
        // Clear input
        promptInput.value = '';
    });
    
    // Follow-up form submission handler
    followupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const followupPrompt = followupInput.value.trim();
        if (!followupPrompt || isProcessing) return;
        
        // Display follow-up prompt in the active terminal
        if (terminals[activeTerminalId]) {
            terminals[activeTerminalId].write(`\r\n\x1b[1;36mYou:\x1b[0m ${followupPrompt}\r\n\r\n`);
            
            // Disable interface and show loading
            isProcessing = true;
            disableInterface();
            followupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            // Send each character of the follow-up prompt individually to simulate typing
            for (const char of followupPrompt) {
                socket.emit('terminal-input', { terminalId: activeTerminalId, input: char });
            }
            
            // Send Enter key after the prompt
            setTimeout(() => {
                socket.emit('terminal-input', { terminalId: activeTerminalId, input: '\r' });
            }, 100);
            
            // Clear the input field
            followupInput.value = '';
        }
    });
    
    // Function to enable interface elements
    function enableInterface() {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>Execute</span>';
        createTerminalsBtn.disabled = false;
        createTerminalsBtn.innerHTML = '<i class="fas fa-terminal"></i><span>Create Terminals</span>';
        followupBtn.disabled = false;
        followupBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
        document.querySelectorAll('.escape-btn').forEach(btn => {
            btn.disabled = false;
        });
        promptInput.disabled = false;
        followupInput.disabled = false;
        
        // Enable terminal count buttons
        if (terminalCountButtons) {
            terminalCountButtons.querySelectorAll('.count-btn').forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            });
        }
    }
    
    // Function to disable interface elements
    function disableInterface() {
        submitBtn.disabled = true;
        createTerminalsBtn.disabled = true;
        followupBtn.disabled = true;
        document.querySelectorAll('.escape-btn').forEach(btn => {
            btn.disabled = true;
        });
        promptInput.disabled = true;
        followupInput.disabled = true;
        
        // Disable terminal count buttons
        if (terminalCountButtons) {
            terminalCountButtons.querySelectorAll('.count-btn').forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.6';
                btn.style.pointerEvents = 'none';
            });
        }
    }
}); 