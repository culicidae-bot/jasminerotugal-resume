import { useState } from 'react';
import Section from '../components/Section.jsx';
import { getSkillProficiency } from '../lib/public-sections.js';
import { selectFeatured, FEATURED_LIMITS } from '../lib/prioritize.js';
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

function groupSkills(skills) {
  const groups = new Map();
  for (const skill of skills) {
    const category = skill.category || 'Skills';
    groups.set(category, [...(groups.get(category) || []), skill]);
  }
  return [...groups].sort(
    ([a], [b]) => skillCategoryRank(a) - skillCategoryRank(b) || a.localeCompare(b),
  );
}

function SkillGroup({ category, skills, design, outOfHundred, content }) {
  return (
    <section className="skill-category" aria-label={category}>
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
                  aria-valuetext={`${label || `${value}/100`}, ${value} ${outOfHundred}`}
                >
                  {value}/100
                </progress>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function SkillsSection({ index }) {
  const { content, design } = useSite();
  const section = content.sections.skills;
  const [expanded, setExpanded] = useState(false);
  const skills = content.skills || [];
  const shown = expanded ? skills : selectFeatured(skills, FEATURED_LIMITS.skills);
  const orderedGroups = groupSkills(shown);
  const hasMore = skills.length > shown.length;

  return (
    <Section id="skills" label={section.label} title={section.title} intro={section.intro} index={index}>
      {orderedGroups.map(([category, groupedSkills]) => (
        <SkillGroup
          key={category}
          category={category}
          skills={groupedSkills}
          design={design}
          outOfHundred={content.ui.outOfHundred}
          content={content}
        />
      ))}
      {skills.length > FEATURED_LIMITS.skills ? (
        <div className="section-footer">
          <button
            type="button"
            className="button-quiet text-link view-all-button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded
              ? content.ui.showFewer
              : `${content.ui.viewAllSkills} (${skills.length})`}
          </button>
        </div>
      ) : null}
    </Section>
  );
}
