import { NextResponse } from 'next/server';
import { keyPool } from '@/lib/ai/key-pool';
import '@/lib/ai/router'; // Ensure keys are registered from env before reading state

// We want this endpoint to always fetch fresh data, not be statically cached
export const dynamic = 'force-dynamic';

export async function GET() {
  // In a real app, you would add an admin authentication check here
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    totalKeys: keyPool.size,
    availableKeys: keyPool.availableCount,
    keys: keyPool.getStatus()
  });
}
