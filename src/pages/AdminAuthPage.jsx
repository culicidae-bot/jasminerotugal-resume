import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase.js';

const GENERIC_LOGIN_ERROR = 'Email or password is incorrect';
const IDLE_TIMEOUT_MS = 20 * 60 * 1000;

function InlineError({ message, id }) {
  if (!message) return null;
  return (
    <p className="field-error" id={id} role="alert">
      {message}
    </p>
  );
}

export default function AdminAuthPage() {
  const supabase = getSupabaseClient();
  const [mode, setMode] = useState('login');
  const [fields, setFields] = useState({ email: '', password: '', code: '' });
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState({});
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const codeRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStatus('You were signed out because the session timed out.');
      setMode('login');
    }, IDLE_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [mode, fields.email, fields.password, fields.code]);

  function updateField(field, value) {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    if (status) setStatus('');
  }

  function focusFirstError() {
    const order = ['email', 'password', 'code'];
    const first = order.find((name) => errors[name]);
    if (first === 'email' && emailRef.current) emailRef.current.focus();
    if (first === 'password' && passwordRef.current) passwordRef.current.focus();
    if (first === 'code' && codeRef.current) codeRef.current.focus();
  }

  async function handleLogin(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!fields.email) nextErrors.email = 'required';
    if (!fields.password) nextErrors.password = 'required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      focusFirstError();
      return;
    }

    if (!supabase) {
      setStatus('Admin sign in is unavailable until Supabase is configured.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: fields.email,
      password: fields.password,
    });

    if (error) {
      setStatus(GENERIC_LOGIN_ERROR);
      return;
    }

    const { data } = await supabase.auth.getSession();
    if (data.session && data.session.user && data.session.user.app_metadata?.aal === 'aal1') {
      setMode('verify');
      setStatus('Your session needs a second factor.');
      return;
    }

    setMode('enroll');
    setStatus('Set up a second factor to continue.');
  }

  async function handleVerify(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!fields.code) nextErrors.code = 'required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      focusFirstError();
      return;
    }

    setStatus('The verify screen is ready for your TOTP challenge.');
  }

  async function handleEnroll(event) {
    event.preventDefault();
    setStatus('Your TOTP enrollment is ready. Use the QR code or manual key to continue.');
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut({ scope: 'global' });
    setMode('login');
    setFields({ email: '', password: '', code: '' });
    setStatus('You signed out of all devices.');
  }

  return (
    <main style={{ maxWidth: 560, margin: '4rem auto', padding: '0 1.25rem' }}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1.5rem' }}>
        <h1 style={{ marginTop: 0 }}>Admin sign in</h1>
        {mode === 'login' && (
          <form onSubmit={handleLogin} noValidate>
            <div className="field">
              <label htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                ref={emailRef}
                type="email"
                autoComplete="email"
                value={fields.email}
                onChange={(event) => updateField('email', event.target.value)}
                style={{ width: '100%', minHeight: 44 }}
              />
              <InlineError message={errors.email} id="admin-email-error" />
            </div>
            <div className="field">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                ref={passwordRef}
                type="password"
                autoComplete="current-password"
                value={fields.password}
                onChange={(event) => updateField('password', event.target.value)}
                style={{ width: '100%', minHeight: 44 }}
              />
              <InlineError message={errors.password} id="admin-password-error" />
            </div>
            <button type="submit" style={{ minHeight: 44, width: '100%' }}>
              Sign in
            </button>
          </form>
        )}

        {mode === 'enroll' && (
          <form onSubmit={handleEnroll} noValidate>
            <p>Set up your authenticator app.</p>
            <div style={{ border: '1px dashed var(--color-border)', padding: '1rem', margin: '1rem 0', textAlign: 'center' }}>
              <div style={{ width: 120, height: 120, margin: '0 auto', background: 'var(--color-raised)', display: 'grid', placeItems: 'center' }}>
                QR code
              </div>
              <p style={{ marginBottom: 0 }}>Manual key: JASMINE-ADMIN-KEY-2026</p>
            </div>
            <div className="field">
              <label htmlFor="admin-code">Verification code</label>
              <input
                id="admin-code"
                ref={codeRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={fields.code}
                onChange={(event) => updateField('code', event.target.value)}
                style={{ width: '100%', minHeight: 44 }}
              />
              <InlineError message={errors.code} id="admin-code-error" />
            </div>
            <button type="submit" style={{ minHeight: 44, width: '100%' }}>
              Continue
            </button>
          </form>
        )}

        {mode === 'verify' && (
          <form onSubmit={handleVerify} noValidate>
            <p>Must verify</p>
            <div className="field">
              <label htmlFor="admin-verify-code">Authenticator code</label>
              <input
                id="admin-verify-code"
                ref={codeRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={fields.code}
                onChange={(event) => updateField('code', event.target.value)}
                style={{ width: '100%', minHeight: 44 }}
              />
              <InlineError message={errors.code} id="admin-verify-code-error" />
            </div>
            <button type="submit" style={{ minHeight: 44, width: '100%' }}>
              Verify
            </button>
          </form>
        )}

        {status ? (
          <p role="status" aria-live="polite" style={{ marginTop: '1rem' }}>
            {status}
          </p>
        ) : null}

        <button type="button" onClick={handleLogout} style={{ marginTop: '1rem', minHeight: 44, width: '100%' }}>
          Log out of all devices
        </button>
      </div>
    </main>
  );
}
