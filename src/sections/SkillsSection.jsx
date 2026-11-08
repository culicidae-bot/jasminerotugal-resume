import EmptyState from '../components/EmptyState.jsx';
import SampleTag from '../components/SampleTag.jsx';
import Section from '../components/Section.jsx';
import { useSite } from '../lib/site-context.js';

export default function SkillsSection({ index }) {
  const { content, design } = useSite();
  const section = content.sections.skills;

  return (
    <Section id="skills" label={section.label} title={section.title} intro={section.intro} index={index}>
      {content.skills.length === 0 ? (
        <EmptyState
          title={content.ui.emptySkills.title}
          detail={content.ui.emptySkills.detail}
        />
      ) : (
        <ul className="skills-list" data-layout={design.skillsLayout}>
          {content.skills.map((skill) => {
            const value = Math.min(100, Math.max(0, Number(skill.proficiency) || 0));
            const label = skill.label || `${value}/100`;
            const nameId = `skill-${skill.id}`;
            return (
              <li className="skill-row" key={skill.id}>
                <div className="skill-heading">
                  <span className="skill-name" id={nameId}>
                    {skill.name}
                  </span>
                  {skill.sample ? <SampleTag /> : null}
                </div>
                <span className="skill-label">
                  {label} · <span className="tabular">{value}/100</span>
                </span>
                <progress
                  className="skill-progress"
                  max="100"
                  value={value}
                  aria-labelledby={nameId}
                  aria-valuetext={`${label}, ${value} ${content.ui.outOfHundred}`}
                >
                  {value}/100
                </progress>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
