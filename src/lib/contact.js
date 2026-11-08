const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function stripLineBreaks(value) {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

export function validateContact(input) {
  const name = stripLineBreaks(input.name);
  const email = stripLineBreaks(input.email);
  const message = String(input.message ?? '').trim();
  const errors = {};

  if (!name) errors.name = 'required';
  else if (name.length > 100) errors.name = 'tooLong';

  if (!email) errors.email = 'required';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'invalid';
  else if (email.length > 254) errors.email = 'tooLong';

  if (!message) errors.message = 'required';
  else if (message.length > 1200) errors.message = 'tooLong';

  return {
    errors,
    values: { name, email, message },
  };
}

export async function submitContactMessage({ name, email, message, subject }) {
  const payload = {
    name: stripLineBreaks(name),
    email: stripLineBreaks(email),
    message: String(message ?? '').trim(),
    subject: stripLineBreaks(subject) || 'Portfolio enquiry',
    honeypot: '',
  };

  const url =
    import.meta.env.VITE_CONTACT_FUNCTION_URL ||
    (import.meta.env.VITE_SUPABASE_URL
      ? `${String(import.meta.env.VITE_SUPABASE_URL).replace(/\/$/, '')}/functions/v1/contact`
      : '');

  if (!url) {
    return { ok: false, status: 'missing-config' };
  }

  try {
    const payloadText = JSON.stringify(payload);
    if (new TextEncoder().encode(payloadText).length > 10000) {
      return { ok: false, status: 'too-large' };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: payloadText,
    });

    if (!response.ok) {
      return { ok: false, status: 'error' };
    }

    const data = await response.json().catch(() => ({ ok: true }));
    return {
      ok: Boolean(data.ok ?? response.ok),
      status: data.ok === false ? 'error' : 'success',
      data,
    };
  } catch {
    return { ok: false, status: 'network-error' };
  }
}

export function buildMailto({ to, name, email, message, subject }) {
  const recipient = stripLineBreaks(to);
  if (!EMAIL_PATTERN.test(recipient)) return null;

  const safeName = stripLineBreaks(name);
  const safeEmail = stripLineBreaks(email);
  if (!EMAIL_PATTERN.test(safeEmail)) return null;

  const safeSubject = stripLineBreaks(subject) || 'Portfolio contact';
  const body = `Name: ${safeName}\nEmail: ${safeEmail}\n\n${String(message ?? '').trim()}`;
  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(safeSubject)}&body=${encodeURIComponent(body)}`;
}
