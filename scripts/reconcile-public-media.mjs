import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import {
  listPublicMediaInventoryWithClient,
  movePublicMediaToPrivateWithClient,
} from '../src/lib/portfolio-content.js';

async function loadSetting(name) {
  if (process.env[name]) return process.env[name];
  try {
    const envFile = await readFile(new URL('../.env', import.meta.url), 'utf8');
    const line = envFile.split(/\r?\n/).find((entry) => entry.trim().startsWith(`${name}=`));
    if (!line) return '';
    return line.slice(line.indexOf('=') + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
  } catch {
    return '';
  }
}

function prompt(label, secret = false) {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    throw new Error('Run this inventory tool from an interactive terminal.');
  }
  process.stdout.write(label);
  input.setRawMode(true);
  input.setEncoding('utf8');
  input.resume();

  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') {
          input.off('data', onData);
          input.setRawMode(false);
          input.pause();
          process.stdout.write('\n');
          reject(new Error('Cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          input.off('data', onData);
          input.setRawMode(false);
          input.pause();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
        if (!secret) process.stdout.write(character);
      }
    };
    input.on('data', onData);
  });
}

function sessionAal(session) {
  try {
    const payload = session.access_token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).aal;
  } catch {
    return null;
  }
}

async function authenticateOwner(client) {
  const email = await prompt('Portfolio owner email: ');
  let password = await prompt('Password (input hidden): ', true);
  let signInResult;
  try {
    signInResult = await client.auth.signInWithPassword({ email, password });
  } finally {
    password = '';
  }
  const { data, error } = signInResult;
  if (error) throw error;

  let session = data.session;
  if (!session) throw new Error('Authentication did not return a session.');
  if (sessionAal(session) !== 'aal2') {
    const { data: factors, error: factorError } = await client.auth.mfa.listFactors();
    if (factorError) throw factorError;
    const factor = factors?.totp?.find((item) => item.status === 'verified');
    if (!factor) throw new Error('No verified TOTP factor is available for this account.');

    const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({
      factorId: factor.id,
    });
    if (challengeError) throw challengeError;
    const code = await prompt('Authenticator code (input hidden): ', true);
    const { data: verified, error: verifyError } = await client.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code,
    });
    if (verifyError) throw verifyError;
    session = verified.session;
  }
  if (sessionAal(session) !== 'aal2') throw new Error('An aal2 session is required.');

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const { data: owner, error: ownerError } = await client
    .from('app_owner')
    .select('id')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (ownerError) throw ownerError;
  if (!owner) throw new Error('The authenticated account is not the configured portfolio owner.');
}

async function main() {
  const supabaseUrl = await loadSetting('VITE_SUPABASE_URL');
  const anonKey = await loadSetting('VITE_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey || supabaseUrl.includes('REPLACE_WITH_SUPABASE')) {
    throw new Error('Set the project URL and anon key in .env or the process environment.');
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    await authenticateOwner(client);
    const inventory = await listPublicMediaInventoryWithClient(client);
    if (!inventory.length) {
      console.log('No public-media objects found. No legacy objects need migration.');
      return;
    }

    console.log(`Found ${inventory.length} public-media object(s). Review each; none will be changed automatically.`);
    for (const asset of inventory) {
      console.log(
        `\n${asset.path} (${asset.size} bytes; ${asset.publishedReferences} published reference(s); ${asset.draftReferences} draft reference(s))`,
      );
      const choice = (await prompt('[K]eep public / [M]ove to private originals / [S]kip: ')).toLowerCase();
      if (choice === 'k') {
        console.log('Kept public by explicit approval.');
      } else if (choice === 'm') {
        try {
          const result = await movePublicMediaToPrivateWithClient(client, asset.path);
          if (result.publicRemoved) console.log('Copied to originals, updated draft references, and removed the public copy.');
          else if (result.retainedByPublishedContent) {
            console.log('Copied to originals, but the public object remains because published content references it.');
          } else {
            console.log('Private copy was saved; public cleanup remains queued for retry.');
          }
        } catch (error) {
          console.error(`Not moved: ${error.message}`);
        }
      } else if (choice === 's') {
        console.log('Skipped; no changes made.');
      } else {
        console.log('Unrecognized choice; no changes made.');
      }
    }
  } finally {
    await client.auth.signOut({ scope: 'local' });
  }
}

main().catch((error) => {
  console.error(`Public-media review stopped: ${error.message}`);
  process.exitCode = 1;
});
