import { NextRequest, NextResponse } from 'next/server';
import { getLocalDocumentFile, readState } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if document exists in shared state
    const state = await readState();
    const doc = state.documents.find((d) => d.id === id);

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // If it's a remote Vercel Blob URL, redirect or fetch it
    if (doc.fileUrl.startsWith('http')) {
      return NextResponse.redirect(doc.fileUrl, 307);
    }

    // Serve local file
    const local = await getLocalDocumentFile(id);
    if (!local) {
      return NextResponse.json({ success: false, error: 'Document file not found on disk' }, { status: 404 });
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
    const message = error instanceof Error ? error.message : 'Error retrieving document file';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
