# Claude Code Interface - Next.js Frontend

This is the Next.js frontend for the Claude Code Interface, a web-based terminal interface for interacting with Claude AI.

## Features

- Modern, responsive UI built with Next.js
- Real-time terminal interaction with Claude
- Support for multiple terminals
- Mobile-friendly design
- WebSocket communication with the backend server

## Getting Started

### Prerequisites

- Node.js 18.0.0 or later
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
```

2. Start the development server:

```bash
npm run dev
# or
yarn dev
```

3. Open [http://localhost:3001](http://localhost:3001) in your browser.

## Configuration

The frontend is configured to proxy WebSocket connections to the backend server running on port 3000. You can modify this configuration in `next.config.ts` if your backend is running on a different port or host.

## Project Structure

- `app/` - Next.js app directory
  - `components/` - React components
    - `Terminal.tsx` - Terminal component using xterm.js
    - `TerminalGrid.tsx` - Grid layout for multiple terminals
    - `PromptForm.tsx` - Form for submitting prompts to Claude
    - `ConnectionStatus.tsx` - Connection status indicator
  - `page.tsx` - Main page component
  - `layout.tsx` - Root layout component
  - `globals.css` - Global CSS
  - `styles.css` - Component-specific CSS

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework
- [xterm.js](https://xtermjs.org/) - Terminal emulator
- [Socket.IO](https://socket.io/) - WebSocket library
- [Font Awesome](https://fontawesome.com/) - Icons

## License

This project is licensed under the MIT License - see the LICENSE file for details.
