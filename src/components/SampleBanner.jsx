import { Link, useLocation } from 'react-router-dom';
import { useSite } from '../lib/site-context.js';

export default function SampleBanner() {
  const { content, isSample } = useSite();
  const location = useLocation();

  if (!isSample) return null;

  const params = new URLSearchParams(location.search);
  params.delete('sample');
  params.delete('cert');
  const query = params.toString();
  const exitTo = `${location.pathname}${query ? `?${query}` : ''}`;

  return (
    <aside className="sample-banner" aria-label={content.ui.sampleBannerTitle}>
      <div className="sample-banner-inner">
        <p className="sample-banner-title">{content.ui.sampleBannerTitle}</p>
        <p>{content.ui.sampleBannerText}</p>
        <Link to={exitTo}>{content.ui.exitSample}</Link>
      </div>
    </aside>
  );
}
