import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseServerConfig, getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

const PAGE_SIZE = 50;
const MAX_MESSAGE_LENGTH = 2000;

async function resolveTripMember(requestedName: string): Promise<string | null> {
  const normalized = requestedName.trim().toLocaleLowerCase('en-IN');
  if (!normalized) return null;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('trip_config')
    .select('members')
    .eq('id', 'default')
    .maybeSingle();

  if (error || !Array.isArray(data?.members)) {
    throw new Error(error?.message || 'Trip members are not configured');
  }

  const match = (data.members as string[]).find(
    (member) => typeof member === 'string' && member.trim().toLocaleLowerCase('en-IN') === normalized
  );

  return match?.trim() || null;
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    if (!hasSupabaseServerConfig()) {
      return json({ success: false, error: 'Chat requires the existing Supabase database connection.' }, 503);
    }

    const requestedMember = request.nextUrl.searchParams.get('member') || '';
    const member = await resolveTripMember(requestedMember);
    if (!member) {
      return json({ success: false, error: 'Your selected profile is not in this trip’s member list.' }, 403);
    }

    const before = request.nextUrl.searchParams.get('before');
    const after = request.nextUrl.searchParams.get('after');
    if (before && after) {
      return json({ success: false, error: 'Use either the before or after message cursor.' }, 400);
    }
    if ((before && Number.isNaN(Date.parse(before))) || (after && Number.isNaN(Date.parse(after)))) {
      return json({ success: false, error: 'Invalid message history cursor.' }, 400);
    }

    const supabase = getSupabaseServerClient();
    const buildQuery = (includeEditedAt: boolean) => {
      let query = supabase
        .from('chat_messages')
        .select(includeEditedAt
          ? 'id, sender, content, created_at, edited_at'
          : 'id, sender, content, created_at')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);

      if (before) {
        query = query.lt('created_at', before);
      }
      if (after) {
        query = query.gt('created_at', after);
      }
      return query;
    };

    // Keep existing chat history available until the optional edit timestamp SQL is applied.
    let { data, error } = await buildQuery(true);
    if (error?.message.toLowerCase().includes('edited_at')) {
      ({ data, error } = await buildQuery(false));
    }

    if (error) {
      console.error('Chat history read failed:', error.message);
      return json({
        success: false,
        error: 'Chat storage is not ready. Apply the BVC chat database migration, then refresh.',
      }, 503);
    }

    const messages = ((data || []) as Array<{
      id: string;
      sender: string;
      content: string;
      created_at: string;
      edited_at?: string | null;
    }>).reverse().map((message) => ({
      ...message,
      edited_at: message.edited_at ?? null,
    }));

    return json({
      success: true,
      messages,
      hasMore: (data || []).length === PAGE_SIZE,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to load group chat';
    console.error('Chat GET failed:', message);
    return json({ success: false, error: 'Unable to load group chat right now.' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseServerConfig()) {
      return json({ success: false, error: 'Chat requires the existing Supabase database connection.' }, 503);
    }

    const body = await request.json().catch(() => null);
    const requestedMember = typeof body?.sender === 'string' ? body.sender : '';
    const content = typeof body?.content === 'string' ? body.content.trim() : '';

    if (!content) {
      return json({ success: false, error: 'Write a message before sending.' }, 400);
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return json({ success: false, error: `Messages can contain up to ${MAX_MESSAGE_LENGTH} characters.` }, 400);
    }

    const member = await resolveTripMember(requestedMember);
    if (!member) {
      return json({ success: false, error: 'Your selected profile is not in this trip’s member list.' }, 403);
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ sender: member, content })
      .select('id, sender, content, created_at')
      .single();

    if (error || !data) {
      console.error('Chat message insert failed:', error?.message);
      return json({
        success: false,
        error: 'Chat storage is not ready. Apply the BVC chat database migration, then refresh.',
      }, 503);
    }

    return json({ success: true, message: data }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to send message';
    console.error('Chat POST failed:', message);
    return json({ success: false, error: 'Unable to send your message right now.' }, 500);
  }
}


export async function PATCH(request: NextRequest) {
  try {
    if (!hasSupabaseServerConfig()) {
      return json({ success: false, error: 'Chat requires the existing Supabase database connection.' }, 503);
    }

    const body = await request.json().catch(() => null);
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const requestedMember = typeof body?.sender === 'string' ? body.sender : '';
    const content = typeof body?.content === 'string' ? body.content.trim() : '';

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return json({ success: false, error: 'Invalid message.' }, 400);
    }
    if (!content) {
      return json({ success: false, error: 'A message cannot be empty.' }, 400);
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return json({ success: false, error: `Messages can contain up to ${MAX_MESSAGE_LENGTH} characters.` }, 400);
    }

    const member = await resolveTripMember(requestedMember);
    if (!member) {
      return json({ success: false, error: 'Your selected profile is not in this trip’s member list.' }, 403);
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('chat_messages')
      .update({ content, edited_at: new Date().toISOString() })
      .eq('id', id)
      .eq('sender', member)
      .select('id, sender, content, created_at, edited_at')
      .maybeSingle();

    if (error) {
      console.error('Chat message edit failed:', error.message);
      if (error.message.toLowerCase().includes('edited_at')) {
        return json({
          success: false,
          error: 'Message editing needs the BVC message-edit SQL update. Apply the SQL provided after deployment, then try again.',
        }, 503);
      }
      return json({ success: false, error: 'Unable to edit this message right now.' }, 503);
    }
    if (!data) {
      return json({ success: false, error: 'Message not found or it does not belong to this profile.' }, 404);
    }

    return json({ success: true, message: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to edit message';
    console.error('Chat PATCH failed:', message);
    return json({ success: false, error: 'Unable to edit this message right now.' }, 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!hasSupabaseServerConfig()) {
      return json({ success: false, error: 'Chat requires the existing Supabase database connection.' }, 503);
    }

    const body = await request.json().catch(() => null);
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const requestedMember = typeof body?.sender === 'string' ? body.sender : '';

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return json({ success: false, error: 'Invalid message.' }, 400);
    }

    const member = await resolveTripMember(requestedMember);
    if (!member) {
      return json({ success: false, error: 'Your selected profile is not in this trip’s member list.' }, 403);
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', id)
      .eq('sender', member)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Chat message delete failed:', error.message);
      return json({ success: false, error: 'Unable to delete this message right now.' }, 503);
    }
    if (!data) {
      return json({ success: false, error: 'Message not found or it does not belong to this profile.' }, 404);
    }

    return json({ success: true, deletedId: data.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to delete message';
    console.error('Chat DELETE failed:', message);
    return json({ success: false, error: 'Unable to delete this message right now.' }, 500);
  }
}
