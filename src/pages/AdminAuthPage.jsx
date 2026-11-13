import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseClient, getSupabaseConfigIssue } from '../lib/supabase.js';
import AdminDashboard from './AdminDashboard.jsx';

const GENERIC_LOGIN_ERROR = 'Your credentials could not be verified. Please try again.';

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
  const configIssue = getSupabaseConfigIssue();
  const [mode, setMode] = useState('checking');
  const [fields, setFields] = useState({ email: '', password: '', code: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const [mfa, setMfa] = useState({ factorId: '', challengeId: '', qrCode: '', secret: '' });
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const codeRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setMode('unavailable');
      return () => {
        active = false;
      };
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.session) {
        setMode('login');
        return;
      }
      continueWithMfa(data.session).catch(() => {
        if (active) {
          setMode('login');
          setStatus('Sign-in is unavailable. Please try again later.');
        }
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && active) {
        setFields({ email: '', password: '', code: '' });
        setMfa({ factorId: '', challengeId: '', qrCode: '', secret: '' });
        setMode('login');
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  async function beginChallenge(factorId) {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error || !data?.id) throw error || new Error('Unable to start MFA challenge.');
    setMfa((current) => ({ ...current, factorId, challengeId: data.id }));
    setMode('verify');
  }

  async function continueWithMfa(session) {
    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) throw assuranceError;
    if (assurance?.currentLevel === 'aal2') {
      await enterDashboard(session);
      return;
    }

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw factorsError;
    const verifiedFactor = factors?.totp?.find((factor) => factor.status === 'verified');
    if (verifiedFactor) {
      await beginChallenge(verifiedFactor.id);
      setStatus('Enter the code from your authenticator app.');
      return;
    }

    const { data: enrollment, error: enrollmentError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Portfolio authenticator',
    });
    if (enrollmentError || !enrollment?.id || !enrollment?.totp) {
      throw enrollmentError || new Error('Unable to enroll an authenticator.');
    }
    setMfa({
      factorId: enrollment.id,
      challengeId: '',
      qrCode: enrollment.totp.qr_code,
      secret: enrollment.totp.secret,
    });
    setMode('enroll');
    setStatus('Scan the QR code or enter the setup key, then verify the code.');
  }

  async function enterDashboard(session) {
    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== 'aal2') {
      setMode('verify');
      setStatus('A second factor is required to access the admin area.');
      return;
    }

    const { data: isOwner, error } = await supabase.rpc('is_owner');
    if (error || isOwner !== true) {
      await supabase.auth.signOut({ scope: 'global' });
      setMode('login');
      setStatus('This account is not authorized to access the admin area.');
      return;
    }
    setMfa({ factorId: '', challengeId: '', qrCode: '', secret: '' });
    setFields({ email: '', password: '', code: '' });
    setMode('dashboard');
    setStatus('');
    void session;
  }

  async function handleLogin(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!fields.email.trim()) nextErrors.email = 'Enter your email.';
    if (!fields.password) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      if (nextErrors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }
    if (!supabase) {
      setStatus('Sign-in is temporarily unavailable. Please try again shortly.');
      return;
    }

    setStatus('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: fields.email.trim(),
        password: fields.password,
      });
      if (error) {
        setStatus(GENERIC_LOGIN_ERROR);
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        setStatus(GENERIC_LOGIN_ERROR);
        return;
      }
      await continueWithMfa(data.session);
    } catch {
      setStatus(GENERIC_LOGIN_ERROR);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    if (!fields.code.trim()) {
      setErrors({ code: 'Enter the authenticator code.' });
      codeRef.current?.focus();
      return;
    }
    setErrors({});
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfa.factorId,
        challengeId: mfa.challengeId,
        code: fields.code.trim(),
      });
      if (error) {
        setStatus('The authenticator code is incorrect. Try again.');
        return;
      }
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        setStatus('Sign-in is unavailable. Please try again later.');
        return;
      }
      await enterDashboard(data.session);
    } catch {
      setStatus('Second-factor verification is unavailable. Please try again later.');
    }
  }

  async function handleEnrollmentVerify(event) {
    event.preventDefault();
    if (!fields.code.trim()) {
      setErrors({ code: 'Enter the authenticator code.' });
      codeRef.current?.focus();
      return;
    }
    setErrors({});
    try {
      let challengeId = mfa.challengeId;
      if (!challengeId) {
        const { data, error } = await supabase.auth.mfa.challenge({ factorId: mfa.factorId });
        if (error || !data?.id) throw error || new Error('Unable to start MFA challenge.');
        challengeId = data.id;
      }
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfa.factorId,
        challengeId,
        code: fields.code.trim(),
      });
      if (error) {
        setStatus('The authenticator code is incorrect. Try again.');
        return;
      }
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) throw sessionError || new Error('Session is unavailable.');
      await enterDashboard(data.session);
    } catch {
      setStatus('Authenticator setup could not be completed. Please try again.');
    }
  }

  const logout = useCallback(async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      setFields({ email: '', password: '', code: '' });
      setMfa({ factorId: '', challengeId: '', qrCode: '', secret: '' });
      setMode('login');
      setStatus('You signed out of all devices.');
    } catch {
      setStatus('Could not sign out. Please try again.');
    }
  }, [supabase]);

  if (mode === 'dashboard') return <AdminDashboard onLogout={logout} />;
  if (mode === 'checking') {
    return <main id="main" tabIndex="-1" className="admin-auth"><p role="status">Checking admin session…</p></main>;
  }
  if (mode === 'unavailable') {
    return (
      <main id="main" tabIndex="-1" className="admin-auth">
        <section className="admin-card" aria-labelledby="admin-title">
          <p className="admin-kicker">ADMINISTRATOR ACCESS</p>
          <h1 id="admin-title">Admin access is temporarily unavailable.</h1>
          <p role="alert">
            Please try again later. If the problem continues, contact the site administrator.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main id="main" tabIndex="-1" className="admin-auth">
      <section className="admin-card" aria-labelledby="admin-title">
        <p className="admin-kicker">ADMINISTRATOR ACCESS</p>
        <h1 id="admin-title">Welcome back.</h1>
        {mode === 'login' ? (
          <>
            <p>
              Sign in to manage your professional portfolio, update your information, and maintain
              your published content.
            </p>
            <p className="admin-security-note">
              For your security, an additional verification step is required after sign-in.
            </p>
          </>
        ) : null}
        {mode === 'login' && (
          <form onSubmit={handleLogin} noValidate>
            <div className="admin-field">
              <label htmlFor="admin-email">Email address</label>
              <input
                id="admin-email"
                ref={emailRef}
                type="email"
                autoComplete="email"
                value={fields.email}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'admin-email-error' : undefined}
                onChange={(event) => {
                  setFields((current) => ({ ...current, email: event.target.value }));
                  setErrors((current) => ({ ...current, email: '' }));
                }}
              />
              <InlineError message={errors.email} id="admin-email-error" />
            </div>
            <div className="admin-field">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                ref={passwordRef}
                type="password"
                autoComplete="current-password"
                value={fields.password}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'admin-password-error' : undefined}
                onChange={(event) => {
                  setFields((current) => ({ ...current, password: event.target.value }));
                  setErrors((current) => ({ ...current, password: '' }));
                }}
              />
              <InlineError message={errors.password} id="admin-password-error" />
            </div>
            <button className="admin-button admin-button-primary" type="submit">Sign In</button>
          </form>
        )}

        {mode === 'login' ? (
          <p className="admin-auth-footnote">Authorized administrator access only.</p>
        ) : null}

        {(mode === 'verify' || mode === 'enroll') && (
          <form onSubmit={mode === 'enroll' ? handleEnrollmentVerify : handleVerify} noValidate>
            {mode === 'enroll' ? (
              <div className="mfa-setup">
                <p>Set up an authenticator app for this account.</p>
                {mfa.qrCode ? <img className="mfa-qr" src={mfa.qrCode} alt="Authenticator setup QR code" /> : null}
                <label htmlFor="mfa-manual-key">Manual setup key</label>
                <input id="mfa-manual-key" readOnly value={mfa.secret} />
              </div>
            ) : (
              <p>Enter the code from your authenticator app to continue.</p>
            )}
            <div className="admin-field">
              <label htmlFor="admin-code">Authenticator code</label>
              <input
                id="admin-code"
                ref={codeRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                value={fields.code}
                aria-invalid={Boolean(errors.code)}
                aria-describedby={errors.code ? 'admin-code-error' : undefined}
                onChange={(event) => setFields((current) => ({ ...current, code: event.target.value }))}
              />
              <InlineError message={errors.code} id="admin-code-error" />
            </div>
            <button className="admin-button admin-button-primary" type="submit">
              {mode === 'enroll' ? 'Verify and finish setup' : 'Verify'}
            </button>
          </form>
        )}

        {status ? <p className="admin-status" role="status" aria-live="polite">{status}</p> : null}
      </section>
    </main>
  );
}
