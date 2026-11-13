import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import { useSite } from '../lib/site-context.js';
import { hasPublicSectionContent } from '../lib/public-sections.js';
import { resolveSeo } from '../lib/seo.js';

export default function NotFoundPage() {
  const { content } = useSite();
  const copy = content.ui.notFound;
  const seo = resolveSeo(content, 'not-found');

  return (
    <article className="not-found">
      <Seo title={seo.title} description={seo.description} />
      <p className="page-kicker">{copy.eyebrow}</p>
      <p className="not-found-number" aria-hidden="true">
        404
      </p>
      <h1>{copy.title}</h1>
      <p className="lead">{copy.detail}</p>
      <div className="page-actions">
        <Link className="button button-primary" to="/">
          {copy.homeLink}
        </Link>
        {hasPublicSectionContent('certificates', content) ? (
          <Link className="button button-secondary" to="/certificates">
            {copy.certificatesLink}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
