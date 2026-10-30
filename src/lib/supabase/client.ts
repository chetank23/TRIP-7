'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedBrowserClient: SupabaseClient | null = null;

/**
 * Returns a browser Supabase client for subscriptions and Realtime updates.
 * Strictly uses public/anon keys (NEXT_PUBLIC_BVC_SUPABASE_ANON_KEY).
 * Never uses or leaks server secret keys.
 */
export function getSupabaseBrowserClient(customUrl?: string, customAnonKey?: string): SupabaseClient | null {
  if (cachedBrowserClient) return cachedBrowserClient;

  const url =
    customUrl ||
    process.env.NEXT_PUBLIC_BVC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    null;

  const anonKey =
    customAnonKey ||
    process.env.NEXT_PUBLIC_BVC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    null;

  if (!url || !anonKey) {
    return null;
  }

  cachedBrowserClient = createClient(url, anonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedBrowserClient;
}

