import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsHeaders,
  isAllowedOrigin,
  normalizeAllowedOrigin,
  readJsonBody,
  validPreflight,
  validateContactBody,
} from './validation.js';

const response = (origin, allowedOrigin, ok, status, message) =>
  new Response(JSON.stringify({ ok, message }), {
    status,
    headers: {
      ...Object.fromEntries(corsHeaders(origin, allowedOrigin)),
      'Content-Type': 'application/json',
    },
  });

const successResponse = (origin, allowedOrigin) =>
  response(origin, allowedOrigin, true, 200, 'Your message was received');
const errorResponse = (origin, allowedOrigin, status) =>
  response(origin, allowedOrigin, false, status, 'Unable to send your message. Please try again later.');

Deno.serve(async (req) => {
  const allowedOrigin = normalizeAllowedOrigin(Deno.env.get('CONTACT_ALLOWED_ORIGIN') ?? '');
  const requestOrigin = req.headers.get('origin') ?? '';

  if (!allowedOrigin) return errorResponse('', null, 503);

  if (req.method === 'OPTIONS') {
    if (!validPreflight(req, allowedOrigin)) return errorResponse(requestOrigin, allowedOrigin, 403);
    return new Response(null, {
      status: 204,
      headers: corsHeaders(requestOrigin, allowedOrigin),
    });
  }

  if (!isAllowedOrigin(requestOrigin, allowedOrigin)) {
    return errorResponse(requestOrigin, allowedOrigin, 403);
  }
  if (req.method !== 'POST') return errorResponse(requestOrigin, allowedOrigin, 405);

  const contentType = (req.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return errorResponse(requestOrigin, allowedOrigin, 415);
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return errorResponse(requestOrigin, allowedOrigin, 400);
  }

  const contact = validateContactBody(body);
  if (!contact.valid) {
    return contact.honeypot
      ? successResponse(requestOrigin, allowedOrigin)
      : errorResponse(requestOrigin, allowedOrigin, 400);
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!serviceRoleKey || !supabaseUrl) {
    return errorResponse(requestOrigin, allowedOrigin, 503);
  }

  const clientIp = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const salt = Deno.env.get('CONTACT_RATE_LIMIT_SALT') ?? 'portfolio-contact';
  const ipHashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${salt}:${clientIp}`),
  );
  const ipHash = Array.from(new Uint8Array(ipHashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

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
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', hourAgo);

  if (hourlyError || (hourlyCount ?? 0) >= 5) {
    return errorResponse(requestOrigin, allowedOrigin, hourlyError ? 503 : 429);
  }

  const { count: dailyCount, error: dailyError } = await serviceClient
    .from('contact_rate_limits')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', dayAgo);

  if (dailyError || (dailyCount ?? 0) >= 200) {
    return errorResponse(requestOrigin, allowedOrigin, dailyError ? 503 : 429);
  }

  const { error: rateLimitError } = await serviceClient.from('contact_rate_limits').insert({
    ip_hash: ipHash,
    route: '/functions/v1/contact',
    created_at: new Date().toISOString(),
  });
  if (rateLimitError) return errorResponse(requestOrigin, allowedOrigin, 503);

  const { error: insertError } = await serviceClient.from('messages').insert([
    {
      name: contact.name,
      email: contact.email,
      message: contact.message,
      published: false,
      archived: false,
      read_at: null,
    },
  ]);
  if (insertError) return errorResponse(requestOrigin, allowedOrigin, 503);

  return successResponse(requestOrigin, allowedOrigin);
});
