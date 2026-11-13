import ImageSlot, { isUsableImage } from '../components/ImageSlot.jsx';
import { ExternalIcon } from '../components/Icons.jsx';
import Section from '../components/Section.jsx';
import { useSite } from '../lib/site-context.js';
import { isPublicProject } from '../lib/public-sections.js';
import { sortByPriority } from '../lib/prioritize.js';
import { isSafeHttpUrl } from '../lib/urls.js';

function projectScreenshots(project) {
  return Array.isArray(project.screenshots) ? project.screenshots.filter(isUsableImage) : [];
}

export default function ProjectsSection({ index }) {
  const { content, design } = useSite();
  const section = content.sections.projects;
  const allProjects = content.projects.filter(isPublicProject);
  const projects = sortByPriority(allProjects);

  return (
    <Section
      id="projects"
      label={section.label}
      title={section.title}
      intro={section.intro}
      index={index}
    >
      {projects.length ? (
        <ol className="project-ledger" data-layout={design.projectsLayout}>
          {projects.map((project, position) => {
            const [shot] = projectScreenshots(project);
            const showMobileImage = position < 3 && shot;
            return (
              <li className="project-ledger-item" key={project.id}>
                {showMobileImage ? (
                  <div className="project-mobile-image">
                    <ImageSlot image={shot} kind="project" />
                  </div>
                ) : null}
                <div className="project-ledger-row">
                  <div className="project-name">
                    <span className="item-label">
                      <span>{project.role}</span>
                      {project.featured ? (
                        <span className="featured-badge">{content.ui.projectLabels.featured}</span>
                      ) : null}
                    </span>
                    <h3>{project.title}</h3>
                    <p className="project-purpose">{project.purpose}</p>
                  </div>
                  <p className="project-type">{project.type || '—'}</p>
                  <p className="project-year">{project.year || '—'}</p>
                  {shot ? (
                    <div className="project-reveal">
                      <ImageSlot image={shot} kind="project" />
                    </div>
                  ) : null}
                </div>
                {isSafeHttpUrl(project.projectUrl) || isSafeHttpUrl(project.sourceUrl) ? (
                  <nav className="project-links" aria-label={`${project.title} links`}>
                    {isSafeHttpUrl(project.projectUrl) ? (
                      <a className="text-link external-link" href={project.projectUrl} target="_blank" rel="noopener noreferrer">
                        {content.ui.projectLabels.projectLink}<ExternalIcon />
                        <span className="visually-hidden"> ({content.ui.opensNewTab})</span>
                      </a>
                    ) : null}
                    {isSafeHttpUrl(project.sourceUrl) ? (
                      <a className="text-link external-link" href={project.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {content.ui.projectLabels.sourceLink}<ExternalIcon />
                        <span className="visually-hidden"> ({content.ui.opensNewTab})</span>
                      </a>
                    ) : null}
                  </nav>
                ) : null}
                <p className="project-summary">{project.summary}</p>
                <div>
                  <h4 className="project-kicker">{content.ui.projectLabels.technologies}</h4>
                  <ul className="inline-list">
                    {(project.technologies || []).map((technology) => (
                      <li key={technology}>{technology}</li>
                    ))}
                  </ul>
                </div>
                <details className="project-details-disclosure">
                  <summary>{content.ui.projectLabels.details}</summary>
                  <div className="project-details-grid">
                    <div>
                      <h4 className="project-kicker">{content.ui.projectLabels.features}</h4>
                      <ul>
                        {(project.features || []).map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="project-kicker">{content.ui.projectLabels.contributions}</h4>
                      <ul>
                        {(project.contributions || []).map((contribution) => (
                          <li key={contribution}>{contribution}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      ) : null}
    </Section>
  );
}
