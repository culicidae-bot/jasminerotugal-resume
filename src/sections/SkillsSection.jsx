import Section from '../components/Section.jsx';
import { getSkillProficiency } from '../lib/public-sections.js';
import { useSite } from '../lib/site-context.js';

const SKILL_CATEGORY_ORDER = [
  'technical',
  'networking',
  'cybersecurity',
  'programming & development',
  'programming and development',
  'professional',
];

function skillCategoryRank(category) {
  const normalized = String(category || '').trim().toLowerCase();
  const index = SKILL_CATEGORY_ORDER.indexOf(normalized);
  return index === -1 ? SKILL_CATEGORY_ORDER.length : index;
}

export default function SkillsSection({ index }) {
  const { content, design } = useSite();
  const section = content.sections.skills;
  const groups = new Map();
  for (const skill of content.skills) {
    const category = skill.category || 'Skills';
    groups.set(category, [...(groups.get(category) || []), skill]);
  }
  const orderedGroups = [...groups].sort(
    ([a], [b]) => skillCategoryRank(a) - skillCategoryRank(b) || a.localeCompare(b),
  );

  return (
    <Section id="skills" label={section.label} title={section.title} intro={section.intro} index={index}>
      {orderedGroups.map(([category, skills]) => (
        <section className="skill-category" key={category} aria-label={category}>
          <h3>{category}</h3>
          <ul className="skills-list" data-layout={design.skillsLayout}>
            {skills.map((skill) => {
              const value = getSkillProficiency(skill.proficiency);
              const hasProficiency = value !== null;
              const label = typeof skill.label === 'string' ? skill.label.trim() : '';
              const nameId = `skill-${skill.id}`;
              return (
                <li className="skill-row" key={skill.id}>
                  <div className="skill-heading">
                    <span className="skill-name" id={nameId}>
                      {skill.name}
                    </span>
                  </div>
                  {label || hasProficiency ? (
                    <span className="skill-label">
                      {label || `${value}/100`}
                      {hasProficiency && label ? <> · <span className="tabular">{value}/100</span></> : null}
                    </span>
                  ) : null}
                  {hasProficiency ? (
                    <progress
                      className="skill-progress"
                      max="100"
                      value={value}
                      aria-labelledby={nameId}
                      aria-valuetext={`${label || `${value}/100`}, ${value} ${content.ui.outOfHundred}`}
                    >
                      {value}/100
                    </progress>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </Section>
  );
}
