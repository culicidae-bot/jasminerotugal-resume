import EmptyState from '../components/EmptyState.jsx';
import ImageSlot from '../components/ImageSlot.jsx';
import SampleTag from '../components/SampleTag.jsx';
import Section from '../components/Section.jsx';
import { useSite } from '../lib/site-context.js';

function screenshotSlots(project, missingAlt) {
  const provided = Array.isArray(project.screenshots)
    ? project.screenshots.filter((screenshot) => screenshot && typeof screenshot === 'object')
    : [];
  const slots = [...provided];
  while (slots.length < 2) {
    slots.push({
      src: null,
      alt: missingAlt,
      width: 1440,
      height: 900,
      focalPoint: 'center',
      loading: 'lazy',
    });
  }
  return slots;
}

export default function ProjectsSection({ index }) {
  const { content, design } = useSite();
  const section = content.sections.projects;

  return (
    <Section
      id="projects"
      label={section.label}
      title={section.title}
      intro={section.intro}
      index={index}
    >
      {content.projects.length === 0 ? (
        <EmptyState
          title={content.ui.emptyProjects.title}
          detail={content.ui.emptyProjects.detail}
        />
      ) : (
        <div className="project-list" data-layout={design.projectsLayout}>
          {content.projects.map((project) => (
            <article className="project" key={project.id}>
              <header className="project-header">
                <p className="item-label">
                  {project.sample ? <SampleTag /> : null}
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
                {screenshotSlots(project, content.ui.projectScreenshotPlaceholder).map((screenshot, position) => (
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
      )}
    </Section>
  );
}
