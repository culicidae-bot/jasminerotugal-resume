import { useState } from 'react';
import ImageSlot, { isUsableImage } from '../components/ImageSlot.jsx';
import { ExternalIcon } from '../components/Icons.jsx';
import Section from '../components/Section.jsx';
import { useSite } from '../lib/site-context.js';
import { isPublicProject } from '../lib/public-sections.js';
import { selectFeatured, FEATURED_LIMITS, sortByPriority } from '../lib/prioritize.js';
import { isSafeHttpUrl } from '../lib/urls.js';

function projectScreenshots(project) {
  return Array.isArray(project.screenshots) ? project.screenshots.filter(isUsableImage) : [];
}

export default function ProjectsSection({ index }) {
  const { content, design } = useSite();
  const section = content.sections.projects;
  const [expanded, setExpanded] = useState(false);
  const allProjects = content.projects.filter(isPublicProject);
  const projects = expanded
    ? sortByPriority(allProjects)
    : selectFeatured(allProjects, FEATURED_LIMITS.projects);

  return (
    <Section
      id="projects"
      label={section.label}
      title={section.title}
      intro={section.intro}
      index={index}
    >
      {projects.length ? (
        <div className="project-list" data-layout={design.projectsLayout}>
          {projects.map((project) => (
            <article className="project" key={project.id}>
              <header className="project-header">
                <p className="item-label">
                  <span>{project.role}</span>
                  {project.featured ? (
                    <span className="featured-badge">{content.ui.projectLabels.featured}</span>
                  ) : null}
                </p>
                <h3>{project.title}</h3>
                <p className="project-purpose">{project.purpose}</p>
              </header>
              {project.summary ? <p className="project-summary">{project.summary}</p> : null}
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
              <div className="project-details">
                <div>
                  <h4>{content.ui.projectLabels.technologies}</h4>
                  <ul className="inline-list">
                    {(project.technologies || []).map((technology) => (
                      <li key={technology}>{technology}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>{content.ui.projectLabels.features}</h4>
                  <ul>
                    {(project.features || []).map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>{content.ui.projectLabels.contributions}</h4>
                  <ul>
                    {(project.contributions || []).map((contribution) => (
                      <li key={contribution}>{contribution}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div
                className="project-media"
                role="group"
                aria-label={content.ui.projectLabels.screenshots}
              >
                {projectScreenshots(project).map((screenshot, position) => (
                  <figure className="browser-frame" key={`${project.id}-${position}`}>
                    <div className="browser-bar" aria-hidden="true">
                      <span className="browser-dots">
                        <span />
                        <span />
                        <span />
                      </span>
                      <span className="browser-title">{content.ui.browserBarLabel}</span>
                    </div>
                    <ImageSlot image={screenshot} kind="project" />
                  </figure>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {allProjects.length > FEATURED_LIMITS.projects ? (
        <div className="section-footer">
          <button
            type="button"
            className="button-quiet text-link view-all-button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded
              ? content.ui.showFewer
              : `${content.ui.viewAllProjects} (${allProjects.length})`}
          </button>
        </div>
      ) : null}
    </Section>
  );
}
