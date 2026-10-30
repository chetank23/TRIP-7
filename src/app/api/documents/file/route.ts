import { NextRequest, NextResponse } from 'next/server';
import { getLocalBlobFile } from '@/lib/storage';
import { hasSupabaseServerConfig } from '@/lib/supabase/server';
import { getDocumentFromDatabase } from '@/lib/supabase/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document ID is required' }, { status: 400 });
    }

    // 1. Authoritative lookup from PostgreSQL BYTEA (completely independent of Vercel Blob)
    if (hasSupabaseServerConfig()) {
      const doc = await getDocumentFromDatabase(id);
      if (doc) {
        const headers = new Headers();
        headers.set('Content-Type', doc.mimeType || 'application/pdf');
        headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`);
        headers.set('Cache-Control', 'public, max-age=3600');

        return new NextResponse(doc.buffer as unknown as BodyInit, {
          status: 200,
          headers,
        });
      }
    }

    // 2. Offline / Local Blob Store fallback
    const local = await getLocalBlobFile(id);
    if (local) {
      const headers = new Headers();
      headers.set('Content-Type', 'application/pdf');
      headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(local.fileName)}"`);
      headers.set('Cache-Control', 'public, max-age=3600');

      return new NextResponse(local.buffer as unknown as BodyInit, {
        status: 200,
        headers,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Document not found in PostgreSQL or local storage' },
      { status: 404 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error retrieving document from storage';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
