/**
 * BVC Trip — Supabase Environment & Client Configuration
 * Resolves Vercel-generated BVC_ environment variables safely without leaking secrets.
 */

export interface SupabaseEnvConfig {
  supabaseUrl: string | null;
  serverSecretKey: string | null;
  anonKey: string | null;
  postgresUrl: string | null;
  postgresUser: string | null;
  isConfigured: boolean;
  missingVariables: string[];
}

export function getSupabaseEnvConfig(): SupabaseEnvConfig {
  const supabaseUrl =
    process.env.BVC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_BVC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    null;

  // Server-only key: prefer secret key, fallback to service-role key
  const serverSecretKey =
    process.env.BVC_SUPABASE_SECRET_KEY ||
    process.env.BVC_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    null;

  // Browser / public key: prefer anon key, fallback to publishable key
  const anonKey =
    process.env.NEXT_PUBLIC_BVC_SUPABASE_ANON_KEY ||
    process.env.BVC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    null;

  const postgresUrl =
    process.env.BVC_POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    null;

  const postgresUser = process.env.BVC_POSTGRES_USER || null;

  const missingVariables: string[] = [];
  if (!supabaseUrl) missingVariables.push('BVC_SUPABASE_URL');
  if (!serverSecretKey) missingVariables.push('BVC_SUPABASE_SECRET_KEY');
  if (!anonKey) missingVariables.push('NEXT_PUBLIC_BVC_SUPABASE_ANON_KEY');

  const isConfigured = Boolean(supabaseUrl && (serverSecretKey || anonKey));

  return {
    supabaseUrl,
    serverSecretKey,
    anonKey,
    postgresUrl,
    postgresUser,
    isConfigured,
    missingVariables,
  };
}

