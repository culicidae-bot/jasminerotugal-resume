import fs from 'node:fs';

const strict = process.argv.includes('--strict') || process.argv.includes('--check') || process.env.VERCEL === '1' || Boolean(process.env.VERCEL) || process.env.CI === 'true' || Boolean(process.env.CI);
const buildMode = process.argv.includes('--build');

function fail(message) {
  console.error(`CSP build check failed: ${message}`);
  process.exit(1);
}

try {
  const text = fs.readFileSync('vercel.json', 'utf8');
  const config = JSON.parse(text);
  const header = config.headers?.find((entry) => entry.source === '/(.*)');
  const policy = header?.headers?.find((entry) => entry.key === 'Content-Security-Policy')?.value ?? '';
  const placeholder = policy.includes('REPLACE_WITH_SUPABASE_PROJECT_ORIGIN') || policy.includes('https://your-project');

  if (!policy) {
    fail('No Content-Security-Policy header was found in vercel.json.');
  }

  if (placeholder && strict) {
    fail('replace the Supabase project origin placeholder in vercel.json before shipping.');
  }

  if (placeholder && buildMode) {
    console.warn('WARNING: The Supabase origin placeholder remains in vercel.json. Local build continues, but deployment checks will fail in CI or Vercel.');
    process.exit(0);
  }

  if (placeholder) {
    console.warn('WARNING: The Supabase origin placeholder remains in vercel.json. This is allowed for local work, but it must be replaced before production deployment.');
    process.exit(0);
  }

  console.log('CSP check passed.');
  process.exit(0);
} catch (error) {
  fail(error instanceof Error ? error.message : 'unable to parse vercel.json');
}
