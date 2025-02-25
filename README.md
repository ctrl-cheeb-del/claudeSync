# Claude Code Web Interface

A web interface for Claude Code CLI that allows you to access and use Claude Code from your mobile device or any web browser.

## Features

- Web-based interface for Claude Code
- Real-time terminal output streaming
- Mobile-friendly design
- WebSocket communication for instant feedback
- Automatic file trust handling

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Claude Code CLI installed and working on your machine

## Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd claudeSync
   ```

2. Install dependencies for both server and client:
   ```
   cd server && npm install
   cd ../client && npm install
   ```

3. Start the server:
   ```
   cd ../server && npm start
   ```

4. Access the web interface:
   Open your browser and navigate to `http://localhost:3000`

## Accessing from Mobile Devices

To access the web interface from your mobile device:

1. Make sure your computer and mobile device are on the same network.
2. Find your computer's local IP address (e.g., 192.168.1.x).
3. On your mobile device, open a browser and navigate to `http://<your-computer-ip>:3000`.

Note: You may need to configure your firewall to allow connections on port 3000.

## Configuration

You can customize the application behavior using environment variables in a `.env` file in the server directory:

```
# Terminal Configuration
TERMINAL_CWD=/path/to/your/preferred/directory

# Server Configuration
PORT=3000
```

- `TERMINAL_CWD`: Sets the initial working directory for the terminal (default: user's home directory)
- `PORT`: Sets the port for the server (default: 3000)

## Usage

1. Enter your prompt in the text area.
2. Click "Execute" to send the prompt to Claude Code.
3. The server will run `claude "your prompt"` with your prompt in quotes.
4. After 2 seconds, the system automatically presses Enter to trust files if prompted.
5. View the real-time output in the terminal display.
6. Use the "Clear" button to clear the terminal output.

## How It Works

1. The web interface sends your prompt to the server via WebSockets.
2. The server spawns a terminal process and runs the Claude Code CLI with your prompt directly: `claude "your prompt"`.
3. After a short delay, the system automatically presses Enter to handle any file trust prompts.
4. The terminal output is streamed back to your browser in real-time.
5. You can see the Claude Code responses as they are generated.

## Troubleshooting

- **Connection Issues**: Make sure the server is running and accessible from your device.
- **Claude Code Not Found**: Ensure that Claude Code CLI is installed and available in your PATH.
- **Terminal Output Issues**: Check the server logs for any errors related to the terminal process.
- **File Trust Issues**: If Claude is still asking for file trust, you may need to increase the delay in the server code.

## License

MIT 