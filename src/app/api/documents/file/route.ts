import { NextRequest, NextResponse } from 'next/server';
import { readState, getLocalBlobFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document ID is required' }, { status: 400 });
    }

    // Retrieve document metadata from authoritative shared state
    const state = await readState();
    const doc = state.documents.find((d) => d.id === id);

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found in shared trip records' }, { status: 404 });
    }

    // If remote cloud Blob URL, stream with inline headers
    if (doc.fileUrl.startsWith('http')) {
      const blobResponse = await fetch(doc.fileUrl, { cache: 'no-store' });
      if (!blobResponse.ok) {
        return NextResponse.redirect(doc.fileUrl, 307);
      }

      const arrayBuffer = await blobResponse.arrayBuffer();
      const headers = new Headers();
      headers.set('Content-Type', 'application/pdf');
      headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`);
      headers.set('Cache-Control', 'public, max-age=3600');

      return new NextResponse(arrayBuffer, { status: 200, headers });
    }

    // Local Blob Store serving
    const local = await getLocalBlobFile(id);
    if (!local) {
      return NextResponse.json(
        { success: false, error: 'Document file not found in local blob storage' },
        { status: 404 }
      );
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(local.fileName)}"`);
    headers.set('Cache-Control', 'public, max-age=3600');

    return new NextResponse(local.buffer as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error retrieving document from storage';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
