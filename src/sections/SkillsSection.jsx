import Section from '../components/Section.jsx';
import { getSkillProficiency } from '../lib/public-sections.js';
import { priorityOf } from '../lib/prioritize.js';
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

function proficiencyText(skill) {
  const label = typeof skill?.label === 'string' ? skill.label.trim() : '';
  if (label) return label;
  const value = getSkillProficiency(skill?.proficiency);
  return value === null ? '' : `${value}/100`;
}

export default function SkillsSection({ index }) {
  const { content } = useSite();
  const section = content.sections.skills;
  const skills = content.skills || [];
  const shown = skills;
  const ordered = [...shown].sort(
    (a, b) =>
      skillCategoryRank(a.category) - skillCategoryRank(b.category) ||
      priorityOf(a) - priorityOf(b) ||
      String(a.name || '').localeCompare(String(b.name || '')),
  );

  return (
    <Section id="skills" label={section.label} title={section.title} intro={section.intro} index={index}>
      <ul className="skills-list">
        {ordered.map((skill) => {
          const proficiency = proficiencyText(skill);
          const category = typeof skill.category === 'string' ? skill.category.trim() : '';
          return (
            <li className="skill-row" key={skill.id}>
              <span className="skill-name">{skill.name}</span>
              <span className="skill-meta">
                {proficiency ? <span className="skill-proficiency">{proficiency}</span> : null}
                {category ? <span className="skill-category">{category}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
