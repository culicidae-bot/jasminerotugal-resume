import { useState } from 'react';
import { Link } from 'react-router-dom';
import ImageSlot from '../components/ImageSlot.jsx';
import Section from '../components/Section.jsx';
import TodoText from '../components/TodoText.jsx';
import { CertificateStatus, CertificateType } from '../components/CertificateSignals.jsx';
import { formatDate } from '../lib/format.js';
import { sortByPriority, splitRecords, selectFeatured, FEATURED_LIMITS } from '../lib/prioritize.js';
import { useSite } from '../lib/site-context.js';
import { isPublicCertificate } from '../lib/public-sections.js';

function certificateRow(certificate, content, design) {
  const date = formatDate(certificate.dateEarned);
  const target = `/certificates?cert=${encodeURIComponent(certificate.id)}`;
  return (
    <li key={certificate.id}>
      <Link className="certificate-row" to={target}>
        {design.certificatesLayout === 'thumbnails' ? (
          <span className="certificate-thumb">
            {certificate.publicFile ? (
              certificate.publicFile.mimeType === 'application/pdf' ? (
                <span className="certificate-thumb-empty">PDF</span>
              ) : (
                <ImageSlot image={certificate.publicFile} kind="certificate-thumb" />
              )
            ) : (
              <span className="certificate-thumb-empty">
                {content.ui.noCopyShort}
              </span>
            )}
          </span>
        ) : null}
        <span className="certificate-main">
          <span className="certificate-title">{certificate.title}</span>
          <span className="certificate-issuer">
            <TodoText value={certificate.issuer} />
          </span>
        </span>
        <span className="certificate-meta">
          <CertificateType type={certificate.type} />
          <CertificateStatus certificate={certificate} />
          <span className="certificate-date">
            {date ? (
              <time dateTime={certificate.dateEarned}>{date}</time>
            ) : (
              <TodoText value={certificate.dateEarned} />
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}

function CertificateList({ items, content, design }) {
  return (
    <ul className="certificate-list" data-layout={design.certificatesLayout}>
      {items.map((certificate) => certificateRow(certificate, content, design))}
    </ul>
  );
}

export default function CertificatesSection({ index }) {
  const { content, design } = useSite();
  const section = content.sections.certificates;
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
  const publicRecords = content.certificates.filter(isPublicCertificate);
  const { certificates, achievements } = splitRecords(publicRecords);
  const featuredCertificates = selectFeatured(certificates, FEATURED_LIMITS.certificates);
  const featuredAchievements = selectFeatured(achievements, FEATURED_LIMITS.achievements);
  const shownAchievements = achievementsExpanded ? sortByPriority(achievements) : featuredAchievements;

  return (
    <Section
      id="certificates"
      label={section.label}
      title={section.title}
      intro={section.intro}
      index={index}
    >
      {featuredCertificates.length ? (
        <div className="certificate-block">
          <CertificateList items={featuredCertificates} content={content} design={design} />
        </div>
      ) : null}
      {certificates.length ? (
        <div className="section-footer">
          <Link className="text-link" to="/certificates">
            {content.ui.viewAllCertificates} ({certificates.length})
          </Link>
        </div>
      ) : null}

      {achievements.length ? (
        <div className="certificate-block certificate-block-achievements">
          <h3 className="sub-block-title">{content.ui.achievementsTitle}</h3>
          <CertificateList items={shownAchievements} content={content} design={design} />
          {achievements.length > featuredAchievements.length ? (
            <div className="section-footer">
              <button
                type="button"
                className="button-quiet text-link view-all-button"
                aria-expanded={achievementsExpanded}
                onClick={() => setAchievementsExpanded((current) => !current)}
              >
                {achievementsExpanded
                  ? content.ui.showFewer
                  : `${content.ui.viewAllAchievements} (${achievements.length})`}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}


    </Section>
  );
}
