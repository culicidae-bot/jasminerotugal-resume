import { useSite } from '../lib/site-context.js';
import Seo from '../components/Seo.jsx';
import Hero from '../components/Hero.jsx';
import AboutSection from '../sections/AboutSection.jsx';
import SkillsSection from '../sections/SkillsSection.jsx';
import CertificatesSection from '../sections/CertificatesSection.jsx';
import EligibilitySection from '../sections/EligibilitySection.jsx';
import ExperienceSection from '../sections/ExperienceSection.jsx';
import ProjectsSection from '../sections/ProjectsSection.jsx';
import EducationSection from '../sections/EducationSection.jsx';
import SecuritySection, { hasSecurityContent } from '../sections/SecuritySection.jsx';
import ContactSection from '../sections/ContactSection.jsx';
import { hasPublicSectionContent } from '../lib/public-sections.js';

const sectionComponents = {
  about: AboutSection,
  skills: SkillsSection,
  certificates: CertificatesSection,
  eligibility: EligibilitySection,
  experience: ExperienceSection,
  projects: ProjectsSection,
  education: EducationSection,
  security: SecuritySection,
  contact: ContactSection,
};

export default function HomePage() {
  const { content, design } = useSite();
  const visibleOrder = design.sectionOrder.filter((id) => {
    if (id === 'security' && !hasSecurityContent(content)) return false;
    return (
      (id === 'hero' || Boolean(sectionComponents[id])) &&
      design.sectionVisibility[id] &&
      hasPublicSectionContent(id, content)
    );
  });

  const sectionNumbers = {};
  let number = 0;
  visibleOrder.forEach((id) => {
    if (id !== 'hero') {
      number += 1;
      sectionNumbers[id] = number;
    }
  });

  return (
    <div className="home-page">
      <Seo title={content.meta.homeTitle} description={content.meta.homeDescription} />
      {visibleOrder.map((id) => {
        if (id === 'hero') return <Hero key="hero" />;
        const SectionComponent = sectionComponents[id];
        return <SectionComponent key={id} index={sectionNumbers[id]} />;
      })}
    </div>
  );
}
