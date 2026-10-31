import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, hasSupabaseServerConfig } from '@/lib/supabase/server';
import { isAllowedPushEndpoint } from '@/lib/push/web-push';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS });
}

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
    (member) => typeof member === 'string' &&
      member.trim().toLocaleLowerCase('en-IN') === normalized
  );

  return match?.trim() || null;
}

export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseServerConfig()) {
      return json({ success: false, error: 'Supabase is not configured for push subscriptions.' }, 503);
    }

    const body = await request.json().catch(() => null);
    const requestedMember = typeof body?.member === 'string' ? body.member : '';
    const subscription = body?.subscription;
    const endpoint = typeof subscription?.endpoint === 'string' ? subscription.endpoint.trim() : '';
    const p256dh = typeof subscription?.keys?.p256dh === 'string' ? subscription.keys.p256dh : '';
    const auth = typeof subscription?.keys?.auth === 'string' ? subscription.keys.auth : '';

    if (!endpoint || endpoint.length > 4096 || !isAllowedPushEndpoint(endpoint)) {
      return json({ success: false, error: 'This browser returned an unsupported push endpoint.' }, 400);
    }
    if (!p256dh || p256dh.length > 256 || !auth || auth.length > 256) {
      return json({ success: false, error: 'The browser push subscription keys are incomplete.' }, 400);
    }

    const member = await resolveTripMember(requestedMember);
    if (!member) {
      return json({ success: false, error: 'Your selected profile is not in this trip’s member list.' }, 403);
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint,
          member,
          p256dh,
          auth,
          user_agent: typeof body?.userAgent === 'string' ? body.userAgent.slice(0, 512) : null,
          enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

    if (error) {
      console.error('Push subscription save failed:', error.message);
      return json({
        success: false,
        error: 'Push storage is not ready. Apply the daily push SQL migration, then try again.',
      }, 503);
    }

    return json({ success: true, message: 'Daily BVC roasts are enabled on this device.' }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to save push subscription';
    console.error('Push subscription POST failed:', message);
    return json({ success: false, error: 'Unable to enable notifications right now.' }, 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!hasSupabaseServerConfig()) {
      return json({ success: false, error: 'Supabase is not configured for push subscriptions.' }, 503);
    }

    const body = await request.json().catch(() => null);
    const requestedMember = typeof body?.member === 'string' ? body.member : '';
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint.trim() : '';

    if (!endpoint || endpoint.length > 4096 || !isAllowedPushEndpoint(endpoint)) {
      return json({ success: false, error: 'A valid push endpoint is required.' }, 400);
    }

    const member = await resolveTripMember(requestedMember);
    if (!member) {
      return json({ success: false, error: 'Your selected profile is not in this trip’s member list.' }, 403);
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('member', member);

    if (error) {
      console.error('Push subscription deletion failed:', error.message);
      return json({ success: false, error: 'Unable to disable notifications right now.' }, 500);
    }

    return json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to disable notifications';
    console.error('Push subscription DELETE failed:', message);
    return json({ success: false, error: 'Unable to disable notifications right now.' }, 500);
  }
}
