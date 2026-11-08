import SampleTag from '../components/SampleTag.jsx';
import Section from '../components/Section.jsx';
import { ExternalIcon } from '../components/Icons.jsx';
import { isSafeHttpUrl } from '../lib/urls.js';
import { useSite } from '../lib/site-context.js';

export function hasSecurityContent(content) {
  return content.securityFocus.profiles.length > 0 || content.securityFocus.writeups.length > 0;
}

export default function SecuritySection({ index }) {
  const { content } = useSite();
  const section = content.sections.security;
  const { profiles, writeups } = content.securityFocus;

  return (
    <Section
      id="security"
      label={section.label}
      title={section.title}
      intro={section.intro}
      index={index}
    >
      <div className="security-grid">
        {profiles.length > 0 ? (
          <section aria-labelledby="security-profiles">
            <h3 id="security-profiles">{content.ui.securityProfilesTitle}</h3>
            <ul className="security-list">
              {profiles.map((profile) => (
                <li className="security-row" key={profile.id}>
                  <div>
                    <h4>{profile.name}</h4>
                    <p>{profile.detail}</p>
                    {profile.sample ? <SampleTag /> : null}
                  </div>
                  {isSafeHttpUrl(profile.url) ? (
                    <a
                      className="text-link external-link"
                      href={profile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {content.ui.openProfile}
                      <ExternalIcon />
                      <span className="visually-hidden"> ({content.ui.opensNewTab})</span>
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {writeups.length > 0 ? (
          <section aria-labelledby="security-writeups">
            <h3 id="security-writeups">{content.ui.securityWriteupsTitle}</h3>
            <ul className="security-list">
              {writeups.map((writeup) => (
                <li className="security-row" key={writeup.id}>
                  <div>
                    <h4>{writeup.title}</h4>
                    <p>{writeup.summary}</p>
                    {writeup.sample ? <SampleTag /> : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Section>
  );
}
