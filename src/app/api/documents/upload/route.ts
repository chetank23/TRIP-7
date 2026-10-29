import { NextRequest, NextResponse } from 'next/server';
import { saveDocumentFile, updateState } from '@/lib/storage';
import { TripDocument, DocumentCategory, ActivityEvent } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string)?.trim();
    const category = (formData.get('category') as DocumentCategory) || 'Others';
    const uploadedBy = (formData.get('uploadedBy') as string)?.trim() || 'Member';
    const expectedVersion = formData.get('expectedVersion')
      ? Number(formData.get('expectedVersion'))
      : undefined;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No PDF file was provided' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ success: false, error: 'Document title is required' }, { status: 400 });
    }

    // Validate file size (15MB maximum)
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 15 MB limit' },
        { status: 400 }
      );
    }

    // Read bytes and verify PDF signature (%PDF-)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check first 4 bytes for '%PDF'
    const header = buffer.subarray(0, 5).toString('ascii');
    if (!header.startsWith('%PDF-') && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { success: false, error: 'Uploaded file is not a valid PDF document' },
        { status: 400 }
      );
    }

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

    // Save to Vercel Blob or local storage
    const { fileUrl } = await saveDocumentFile(docId, safeFileName, buffer, 'application/pdf');

    const now = new Date().toISOString();
    const newDoc: TripDocument = {
      id: docId,
      title,
      category,
      fileName: file.name,
      fileSize: file.size,
      fileUrl,
      uploadedBy,
      createdAt: now,
      updatedAt: now,
    };

    // Update state atomically
    const result = await updateState((current) => {
      const event: ActivityEvent = {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        action: 'document_uploaded',
        actor: uploadedBy,
        targetId: docId,
        targetTitle: newDoc.title,
        category: newDoc.category,
        timestamp: now,
        details: {
          description: `Uploaded document "${newDoc.title}" (${(newDoc.fileSize / (1024 * 1024)).toFixed(1)} MB)`,
        },
      };

      return {
        ...current,
        documents: [newDoc, ...current.documents],
        activities: [event, ...current.activities],
      };
    }, expectedVersion);

    if (result.conflict) {
      return NextResponse.json(
        {
          success: false,
          conflict: true,
          error: 'State was updated by another member while uploading. Please refresh.',
          data: result.state,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newDoc,
      state: result.state,
      version: result.state.version,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error uploading document';
    console.error('Upload document error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
