import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getSupabaseServerClient, hasSupabaseServerConfig } from '@/lib/supabase/server';
import { assertWebPushConfigured, sendWebPush, WebPushSubscription } from '@/lib/push/web-push';
import { getDailyRoast } from '@/lib/push/daily-roast';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
  });
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || '';
  const authorization = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;

  if (!secret || authorization.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(authorization), Buffer.from(expected));
}

function getIndiaDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return json({ success: false, error: 'Unauthorized cron request.' }, 401);
  }

  if (!hasSupabaseServerConfig()) {
    return json({ success: false, error: 'Supabase server configuration is missing.' }, 503);
  }

  const runDate = getIndiaDate();
  const notification = getDailyRoast(runDate);

  if (!notification) {
    return json({ success: true, skipped: true, reason: 'The BVC reminder campaign is outside its Nov 1–11 window.', runDate });
  }

  try {
    assertWebPushConfigured();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Web Push VAPID configuration is invalid.';
    console.error('Daily BVC push configuration error:', message);
    return json({ success: false, error: message }, 503);
  }

  try {
    const supabase = getSupabaseServerClient();

    // Prevent duplicate daily notifications if Vercel retries or the route is invoked manually.
    const { data: existingRun, error: lookupError } = await supabase
      .from('push_notification_runs')
      .select('status, started_at')
      .eq('run_date', runDate)
      .maybeSingle();

    if (lookupError) {
      throw new Error(`Unable to check the daily push run ledger: ${lookupError.message}`);
    }

    if (existingRun?.status === 'completed') {
      return json({ success: true, skipped: true, reason: 'Today’s BVC reminder has already been processed.', runDate });
    }

    if (existingRun?.status === 'running') {
      const startedAt = new Date(existingRun.started_at).getTime();
      if (Number.isFinite(startedAt) && Date.now() - startedAt < 15 * 60 * 1000) {
        return json({ success: true, skipped: true, reason: 'Today’s reminder run is already in progress.', runDate });
      }
    }

    const runValues = {
      run_date: runDate,
      status: 'running',
      sent_count: 0,
      failed_count: 0,
      started_at: new Date().toISOString(),
      completed_at: null,
      last_error: null,
    };

    const runWrite = existingRun
      ? await supabase.from('push_notification_runs').update(runValues).eq('run_date', runDate)
      : await supabase.from('push_notification_runs').insert(runValues);

    if (runWrite.error) {
      throw new Error(`Unable to start the daily push run: ${runWrite.error.message}`);
    }

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('enabled', true);

    if (subscriptionsError) {
      await supabase.from('push_notification_runs').update({
        status: 'failed',
        last_error: subscriptionsError.message.slice(0, 500),
        completed_at: new Date().toISOString(),
      }).eq('run_date', runDate);
      throw new Error(`Unable to load push subscriptions: ${subscriptionsError.message}`);
    }

    const activeSubscriptions = subscriptions || [];
    const results = await Promise.all(
      activeSubscriptions.map(async (row) => {
        const subscription: WebPushSubscription = {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        };

        try {
          const result = await sendWebPush(subscription, notification);
          if (result.expired) {
            const { error: deleteError } = await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', row.endpoint);
            if (deleteError) {
              console.warn('Could not remove expired push subscription:', deleteError.message);
            }
            return { sent: false, failed: false, expired: true };
          }
          return { sent: true, failed: false, expired: false };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Push delivery failed';
          console.warn('BVC daily push delivery failed:', message);
          return { sent: false, failed: true, expired: false };
        }
      })
    );

    const sentCount = results.filter((result) => result.sent).length;
    const failedCount = results.filter((result) => result.failed).length;
    const expiredCount = results.filter((result) => result.expired).length;

    const { error: finishError } = await supabase
      .from('push_notification_runs')
      .update({
        status: 'completed',
        sent_count: sentCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
        last_error: failedCount > 0 ? `${failedCount} device delivery/deliveries failed.` : null,
      })
      .eq('run_date', runDate);

    if (finishError) {
      throw new Error(`Notifications were processed but the run ledger could not be updated: ${finishError.message}`);
    }

    return json({
      success: true,
      runDate,
      sentCount,
      failedCount,
      expiredSubscriptionsRemoved: expiredCount,
      notificationTitle: notification.title,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Daily BVC push failed';
    console.error('Daily BVC push cron failed:', message);
    return json({ success: false, error: message }, 500);
  }
}
