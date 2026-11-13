import { useId, useRef, useState } from 'react';
import { ExternalIcon } from '../components/Icons.jsx';
import { submitContactMessage, validateContact } from '../lib/contact.js';
import { mailtoSafeAddress, isSafeHttpUrl } from '../lib/urls.js';
import { useSite } from '../lib/site-context.js';

function errorMessage(code, labels) {
  if (code === 'required') return labels.required;
  if (code === 'invalid') return labels.invalidEmail;
  if (code === 'tooLong') return labels.tooLong;
  return labels.required;
}

function ContactForm({ contactEmail, hasFunction }) {
  const { content } = useSite();
  const labels = content.ui.contactLabels;
  const [fields, setFields] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const refs = useRef({});
  const baseId = useId();

  function updateField(field, value) {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    if (status) setStatus('');
    if (fallbackUrl) setFallbackUrl('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const result = validateContact(fields);
    if (Object.keys(result.errors).length > 0) {
      setErrors(result.errors);
      const first = ['name', 'email', 'message'].find((field) => result.errors[field]);
      if (first && refs.current[first]) refs.current[first].focus();
      return;
    }

    setStatus('');
    setFallbackUrl('');
    setIsSubmitting(true);
    try {
      const response = await submitContactMessage({
        name: result.values.name,
        email: result.values.email,
        message: result.values.message,
        subject: content.contactSubject,
        fallbackEmail: contactEmail,
      });

      if (response.status === 'email-draft' && response.mailto) {
        setFallbackUrl(response.mailto);
        setStatus('emailDraft');
        window.location.assign(response.mailto);
        return;
      }

      if (!response.ok) {
        setStatus('genericError');
        return;
      }

      setFields({ name: '', email: '', message: '' });
      setFallbackUrl('');
      setStatus('sent');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <h3>{labels.formTitle}</h3>
      <div className="field">
        <label htmlFor={`${baseId}-name`}>{labels.name}</label>
        <input
          ref={(node) => {
            refs.current.name = node;
          }}
          id={`${baseId}-name`}
          name="name"
          type="text"
          autoComplete="name"
          maxLength={100}
          value={fields.name}
          onChange={(event) => updateField('name', event.target.value)}
          disabled={isSubmitting}
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? `${baseId}-name-error` : undefined}
          required
        />
        {errors.name ? (
          <p className="field-error" id={`${baseId}-name-error`}>
            {errorMessage(errors.name, labels)}
          </p>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor={`${baseId}-email`}>{labels.emailField}</label>
        <input
          ref={(node) => {
            refs.current.email = node;
          }}
          id={`${baseId}-email`}
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          value={fields.email}
          onChange={(event) => updateField('email', event.target.value)}
          disabled={isSubmitting}
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? `${baseId}-email-error` : undefined}
          required
        />
        {errors.email ? (
          <p className="field-error" id={`${baseId}-email-error`}>
            {errorMessage(errors.email, labels)}
          </p>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor={`${baseId}-message`}>{labels.message}</label>
        <textarea
          ref={(node) => {
            refs.current.message = node;
          }}
          id={`${baseId}-message`}
          name="message"
          rows="6"
          autoComplete="off"
          maxLength={1200}
          value={fields.message}
          onChange={(event) => updateField('message', event.target.value)}
          disabled={isSubmitting}
          aria-invalid={errors.message ? 'true' : 'false'}
          aria-describedby={errors.message ? `${baseId}-message-error` : undefined}
          required
        />
        {errors.message ? (
          <p className="field-error" id={`${baseId}-message-error`}>
            {errorMessage(errors.message, labels)}
          </p>
        ) : null}
      </div>
      <button className="button button-primary" type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? labels.submitting
          : hasFunction ? labels.submit : labels.openEmailDraft}
      </button>
      <p
        className={`form-status${status === 'emailDraft' ? ' form-status-fallback' : ''}`}
        role="status"
        aria-live="polite"
      >
        {status === 'emailDraft'
          ? labels.emailDraft
          : status === 'sent' ? labels.sent
            : status === 'genericError' ? labels.genericError
              : ''}
      </p>
      {fallbackUrl ? (
        <p className="form-status">
          <a href={fallbackUrl}>{labels.openEmailDraft}</a>
        </p>
      ) : null}
    </form>
  );
}

export default function ContactSection() {
  const { content } = useSite();
  const labels = content.ui.contactLabels;
  const contactEmail = mailtoSafeAddress(content.contact.email);
  const github = isSafeHttpUrl(content.contact.github) ? content.contact.github : null;
  const linkedin = isSafeHttpUrl(content.contact.linkedin) ? content.contact.linkedin : null;
  const hasFunction = Boolean(import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_CONTACT_FUNCTION_URL);
  const formAvailable = Boolean(contactEmail || hasFunction);
  const hasContactDetails = Boolean(contactEmail || github || linkedin);

  return (
    <section className="section contact-section" id="contact" aria-labelledby="contact-title">
      <div className="contact-inner">
        <header className="contact-heading">
          <h2 id="contact-title">Contact</h2>
        </header>
        <div className="contact-grid">
          <div className="contact-details">
            <p className="contact-invitation">{content.ui.contactInvitation}</p>
            {hasContactDetails ? (
              <dl className="contact-list">
                {contactEmail ? (
                  <div>
                    <dt>{labels.email}</dt>
                    <dd>
                      <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                    </dd>
                  </div>
                ) : null}
                {github ? (
                  <div>
                    <dt>{labels.github}</dt>
                    <dd>
                      <a href={github} target="_blank" rel="noopener noreferrer">
                        {content.contact.githubLabel}
                        <ExternalIcon />
                        <span className="visually-hidden"> ({content.ui.opensNewTab})</span>
                      </a>
                    </dd>
                  </div>
                ) : null}
                {linkedin ? (
                  <div>
                    <dt>{labels.linkedin}</dt>
                    <dd>
                      <a href={linkedin} target="_blank" rel="noopener noreferrer">
                        {content.contact.linkedinLabel}
                        <ExternalIcon />
                        <span className="visually-hidden"> ({content.ui.opensNewTab})</span>
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>
          {formAvailable ? (
            <ContactForm contactEmail={contactEmail} hasFunction={hasFunction} />
          ) : (
            <div className="contact-unavailable">
              <h3>{labels.formTitle}</h3>
              <p>{labels.unavailable}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
