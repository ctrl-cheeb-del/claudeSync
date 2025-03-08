# Claude Code Web Interface

A web interface for interacting with Claude AI through a terminal interface.

## Features

- Real-time terminal interaction with Claude
- Support for multiple terminals
- Modern, responsive UI built with Next.js
- Mobile-friendly design
- WebSocket communication between frontend and backend

## Project Structure

- `server/` - Backend server using Express and Socket.IO
- `frontend/` - Next.js frontend application
- `client/` - Legacy HTML/JS frontend (kept for backward compatibility)

## Getting Started

### Prerequisites

- Node.js 18.0.0 or later
- npm or yarn

### Installation

1. Install all dependencies:

```bash
npm run install-deps
```

This will install dependencies for the root project, server, and frontend.

### Running the Application

You have several options to run the application:

#### Run both backend and frontend together

```bash
npm run start:all
```

This will start both the backend server on port 3000 and the Next.js frontend on port 3001.

#### Run only the backend server

```bash
npm run start:backend
# or
npm start
```

This will start the backend server on port 3000, serving the legacy HTML/JS frontend.

#### Run only the Next.js frontend

```bash
npm run start:frontend
```

This will start the Next.js frontend on port 3001. Note that you'll need the backend server running for it to work properly.

### Accessing the Application

- Legacy frontend: http://localhost:3000
- Next.js frontend: http://localhost:3001
- Redirect to Next.js frontend: http://localhost:3000/next

### Using Cloudflare Tunnels for Remote Access

You can use Cloudflare tunnels to access your local development environment from anywhere, including your mobile device, without being on the same network.

#### Prerequisites

- [Cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation) (will be installed automatically by the setup script if not present)

#### Running with Cloudflare Tunnels

```bash
npm run start:cloudflare
```

This will:
1. Install Cloudflared if not already installed
2. Start both the frontend and backend servers
3. Create Cloudflare tunnels for both servers
4. Display the tunnel URLs
5. Open the frontend URL in your default browser

You can now access your Claude Code Web Interface from anywhere using the provided URL.

#### Stopping the Tunnels

To stop the tunnels and servers, run:

```bash
./stop-cloudflare-tunnel.sh
```

#### Troubleshooting Tunnel URLs

If the tunnel setup script fails to extract the tunnel URLs, you can use the extraction tool:

```bash
npm run extract:tunnels
```

This will:
1. Look for tunnel URLs in the log files
2. Extract and save them to the appropriate files
3. Display the extracted URLs

You can also run the extraction tool manually:

```bash
./extract-tunnel-urls.sh
```

#### Manual Setup

If you prefer to set up the tunnels manually:

1. Start the backend server:
   ```bash
   npm run start:backend
   ```

2. Start the frontend server:
   ```bash
   npm run start:frontend
   ```

3. Create a tunnel for the backend:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

4. Create a tunnel for the frontend:
   ```bash
   cloudflared tunnel --url http://localhost:3001
   ```

Note: When accessing through Cloudflare tunnels, the frontend will automatically connect to the backend tunnel.

#### Quick Tunnels

For quick testing, you can use the quick tunnel scripts:

1. For the frontend (port 3001):
   ```bash
   npm run tunnel:frontend
   ```

2. For the backend (port 3000):
   ```bash
   npm run tunnel:backend
   ```

3. For a custom port:
   ```bash
   ./quick-tunnel.sh <port>
   # or
   npm run tunnel:quick -- <port>
   ```

These commands will create a single tunnel in the foreground, which you can stop with Ctrl+C.

## Development

- Backend server code is in the `server/` directory
- Next.js frontend code is in the `frontend/` directory
- Legacy frontend code is in the `client/` directory

## License

This project is licensed under the MIT License - see the LICENSE file for details.