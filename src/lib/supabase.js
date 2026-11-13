import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY ?? '').trim();

/**
 * Configuration diagnostics for the Supabase browser client.
 * Returns a stable machine-readable code describing the first problem found,
 * or null when the configuration looks usable. Never includes values,
 * keys, or URLs — only the name of the variable and the kind of problem.
 */
export function diagnoseSupabaseConfig({ url = supabaseUrl, key = supabaseAnonKey } = {}) {
  url = String(url ?? '').trim();
  key = String(key ?? '').trim();
  if (!url) return 'VITE_SUPABASE_URL is empty at build time';
  if (url.includes('REPLACE_WITH_SUPABASE_PROJECT_ORIGIN') || url.includes('your-project')) {
    return 'VITE_SUPABASE_URL still contains the placeholder project origin';
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return 'VITE_SUPABASE_URL is not a valid URL';
  }
  const isLocalHttp =
    parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if ((parsed.protocol !== 'https:' && !isLocalHttp) || parsed.username || parsed.password) {
    return 'VITE_SUPABASE_URL must be an https:// project origin without credentials';
  }
  if (!parsed.hostname.endsWith('.supabase.co') && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    return 'VITE_SUPABASE_URL does not look like a Supabase project origin';
  }
  if (!key) return 'VITE_SUPABASE_ANON_KEY is empty at build time';
  if (key.includes('REPLACE_WITH_SUPABASE_ANON_KEY') || key.includes('your-anon-key')) {
    return 'VITE_SUPABASE_ANON_KEY still contains the placeholder key';
  }
  return null;
}

export function hasSupabaseConfig() {
  return diagnoseSupabaseConfig() === null;
}

const configIssue = diagnoseSupabaseConfig();

export const supabase = configIssue === null
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabaseClient() {
  return supabase;
}

/**
 * Diagnostic for screens that need to explain a missing client.
 * Returns null when the client exists; otherwise a safe, human-readable
 * description naming the offending variable without revealing values.
 */
export function getSupabaseConfigIssue() {
  return supabase ? null : configIssue;
}
