import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnvConfig } from './config';

let cachedServerClient: SupabaseClient | null = null;

/**
 * Returns a privileged Supabase client for server-side API routes and mutations.
 * Uses BVC_SUPABASE_URL and BVC_SUPABASE_SECRET_KEY / BVC_SUPABASE_SERVICE_ROLE_KEY.
 * Never exposed to the browser.
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (cachedServerClient) return cachedServerClient;

  const { supabaseUrl, serverSecretKey, missingVariables } = getSupabaseEnvConfig();

  if (!supabaseUrl || !serverSecretKey) {
    const missing = missingVariables.filter((v) =>
      ['BVC_SUPABASE_URL', 'BVC_SUPABASE_SECRET_KEY'].includes(v)
    );
    throw new Error(
      `Supabase server client unconfigured. Missing environment variable(s): ${missing.join(', ')}`
    );
  }

  cachedServerClient = createClient(supabaseUrl, serverSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedServerClient;
}

/**
 * Diagnostic check to verify whether Supabase server credentials are present.
 */
export function hasSupabaseServerConfig(): boolean {
  const { supabaseUrl, serverSecretKey } = getSupabaseEnvConfig();
  return Boolean(supabaseUrl && serverSecretKey);
}

