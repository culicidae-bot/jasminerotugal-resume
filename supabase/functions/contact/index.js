import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const genericResponse = (origin) =>
  new Response(JSON.stringify({ ok: true, message: 'Your message was sent' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
      Vary: 'Origin',
    },
  });

const normalizeText = (value) => String(value ?? '').trim();
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

Deno.serve(async (req) => {
  const allowedOrigin = Deno.env.get('CONTACT_ALLOWED_ORIGIN') ?? '';
  const requestOrigin = req.headers.get('origin') ?? '';

  if (req.method === 'OPTIONS') {
    return genericResponse(allowedOrigin && requestOrigin === allowedOrigin ? allowedOrigin : allowedOrigin);
  }

  if (req.method !== 'POST') {
    return genericResponse(allowedOrigin);
  }

  if (allowedOrigin && requestOrigin && requestOrigin !== allowedOrigin) {
    return genericResponse(allowedOrigin);
  }

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return genericResponse(allowedOrigin);
  }

  const rawBody = await req.text().catch(() => '');
  if (rawBody.length > 10000) {
    return genericResponse(allowedOrigin);
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return genericResponse(allowedOrigin);
  }

  const name = normalizeText(body.name);
  const email = normalizeText(body.email);
  const message = normalizeText(body.message);
  const honeypot = normalizeText(body.honeypot);

  if (honeypot) {
    return genericResponse(allowedOrigin);
  }

  if (!name || name.length > 100 || !email || !validEmail(email) || email.length > 254 || !message || message.length > 1200) {
    return genericResponse(allowedOrigin);
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!serviceRoleKey || !supabaseUrl) {
    return genericResponse(allowedOrigin);
  }

  const clientIp = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const salt = Deno.env.get('CONTACT_RATE_LIMIT_SALT') ?? 'portfolio-contact';
  const ipHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${clientIp}`));
  const ipHash = Array.from(new Uint8Array(ipHashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count: hourlyCount, error: hourlyError } = await serviceClient
    .from('contact_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', hourAgo);

  if (hourlyError || (hourlyCount ?? 0) >= 5) {
    return genericResponse(allowedOrigin);
  }

  const { count: dailyCount, error: dailyError } = await serviceClient
    .from('contact_rate_limits')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', dayAgo);

  if (dailyError || (dailyCount ?? 0) >= 200) {
    return genericResponse(allowedOrigin);
  }

  const { error: insertError } = await serviceClient.from('messages').insert([
    {
      name,
      email,
      message,
      published: false,
      archived: false,
      read_at: null,
    },
  ]);

  if (insertError) {
    return genericResponse(allowedOrigin);
  }

  await serviceClient.from('contact_rate_limits').insert({
    ip_hash: ipHash,
    route: '/functions/v1/contact',
    created_at: new Date().toISOString(),
  });

  return genericResponse(allowedOrigin);
});
