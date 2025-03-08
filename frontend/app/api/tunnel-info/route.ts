import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Try to read the backend tunnel URL from the file
    const tunnelInfoPath = path.join(process.cwd(), '..', '.cloudflare', 'backend_tunnel_url.txt');
    
    if (fs.existsSync(tunnelInfoPath)) {
      const backendUrl = fs.readFileSync(tunnelInfoPath, 'utf-8').trim();
      
      return NextResponse.json({
        backendUrl,
        success: true,
      });
    } else {
      // If the file doesn't exist, return an error
      console.warn('Backend tunnel URL file not found at:', tunnelInfoPath);
      
      return NextResponse.json({
        error: 'Backend tunnel URL not found',
        success: false,
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Error reading backend tunnel URL:', error);
    
    return NextResponse.json({
      error: 'Failed to read backend tunnel URL',
      success: false,
    }, { status: 500 });
  }
} 