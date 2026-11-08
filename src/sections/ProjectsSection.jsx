import ImageSlot, { isUsableImage } from '../components/ImageSlot.jsx';
import Section from '../components/Section.jsx';
import { useSite } from '../lib/site-context.js';
import { isPublicProject } from '../lib/public-sections.js';

function projectScreenshots(project) {
  return Array.isArray(project.screenshots) ? project.screenshots.filter(isUsableImage) : [];
}

export default function ProjectsSection({ index }) {
  const { content, design } = useSite();
  const section = content.sections.projects;
  const projects = content.projects.filter(isPublicProject);

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
                </p>
                <h3>{project.title}</h3>
                <p className="project-purpose">{project.purpose}</p>
              </header>
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
    </Section>
  );
}
