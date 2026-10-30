import { NextResponse } from 'next/server';
import { verifyBlobHealth } from '@/lib/storage';
import { verifySupabaseHealth } from '@/lib/supabase/store';
import { hasSupabaseServerConfig } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isSupabase = hasSupabaseServerConfig();
    const [blobHealth, supabaseHealth] = await Promise.all([
      verifyBlobHealth().catch((err) => ({
        ok: false,
        status: 'Blob read failed' as const,
        code: 'READ_FAILED' as const,
        message: err instanceof Error ? err.message : String(err),
        hasToken: false,
        stateInitialized: false,
        roundTripVerified: false,
        isCloud: false,
      })),
      isSupabase
        ? verifySupabaseHealth()
        : Promise.resolve({
            ok: false,
            status: 'Supabase credentials missing',
            code: 'CREDENTIALS_MISSING',
            message: 'BVC_SUPABASE_URL and BVC_SUPABASE_SECRET_KEY not configured.',
          }),
    ]);

    // When Supabase is configured, it is 100% authoritative for all structured data AND PDFs.
    // A missing or expired Vercel Blob token will NEVER degrade application availability.
    const overallOk = isSupabase ? supabaseHealth.ok : blobHealth.ok;
    const httpStatus = overallOk ? 200 : 503;

    return NextResponse.json(
      {
        ok: overallOk,
        status: isSupabase
          ? supabaseHealth.ok
            ? 'Connected to Supabase PostgreSQL (Blob-Independent)'
            : supabaseHealth.status
          : blobHealth.status,
        code: isSupabase
          ? !supabaseHealth.ok
            ? supabaseHealth.code
            : 'CONNECTED'
          : blobHealth.code,
        message: isSupabase
          ? supabaseHealth.message
          : blobHealth.message,
        supabase: supabaseHealth,
        blob: blobHealth,
        hasToken: blobHealth.hasToken,
        stateInitialized: isSupabase ? supabaseHealth.ok : blobHealth.stateInitialized,
        roundTripVerified: isSupabase ? supabaseHealth.ok : blobHealth.roundTripVerified,
        isCloud: isSupabase ? false : blobHealth.isCloud,
      },
      { status: httpStatus }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal health check error';
    return NextResponse.json(
      {
        ok: false,
        status: 'Storage health check failed',
        code: 'CONNECTION_FAILED',
        message: msg,
        hasToken: false,
        stateInitialized: false,
        roundTripVerified: false,
      },
      { status: 500 }
    );
  }
}
