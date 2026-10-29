import { NextResponse } from 'next/server';
import { verifyBlobHealth } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await verifyBlobHealth();
    const httpStatus = health.ok ? 200 : health.code === 'CREDENTIALS_MISSING' ? 503 : 500;
    return NextResponse.json(health, { status: httpStatus });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal health check error';
    return NextResponse.json(
      {
        ok: false,
        status: 'Blob read failed',
        code: 'READ_FAILED',
        message: msg,
        hasToken: false,
        stateInitialized: false,
        roundTripVerified: false,
      },
      { status: 500 }
    );
  }
}

