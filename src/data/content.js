export const content = {
  meta: {
    siteName: 'Jasmine L. Rotugal',
    homeTitle: 'Jasmine L. Rotugal — BSIT Student',
    homeDescription:
      'Resume portfolio of Jasmine L. Rotugal, a BSIT student at Isabela State University Cauayan focused on cybersecurity and network security.',
    certificatesTitle: 'Certificates — Jasmine L. Rotugal',
    certificatesDescription:
      'Certificate register for Jasmine L. Rotugal, including type, issuer, date earned, and the source of each record.',
    notFoundTitle: 'Page not found — Jasmine L. Rotugal',
    notFoundDescription: 'The requested page does not exist.',
    ogImage: {
      src: null,
      alt: '[TODO: add an Open Graph image at public/images/og-image.jpg and write its alt text]',
      width: 1200,
      height: 630,
    },
  },
  nav: [
    { label: 'About', to: '/#about' },
    { label: 'Projects', to: '/#projects' },
    { label: 'Certificates', to: '/certificates' },
    { label: 'Contact', to: '/#contact' },
  ],
  hero: {
    eyebrow: 'Resume portfolio · Isabela State University Cauayan',
    name: 'Jasmine L. Rotugal',
    title: 'BSIT Student | Aspiring Cybersecurity & Network Security Professional',
    focus:
      'I study information technology at Isabela State University Cauayan and am building a foundation for security-focused work.',
    whoami: '$ whoami',
    portrait: {
      src: null,
      alt: '[TODO: add a portrait at public/images/portrait.jpg and write its alt text]',
      width: 960,
      height: 1200,
      focalPoint: 'upper-center',
      loading: 'eager',
    },
    cover: {
      src: null,
      alt: '[TODO: add a hero cover image at public/images/hero-cover.jpg and write its alt text]',
      width: 1600,
      height: 1000,
      focalPoint: 'center',
      loading: 'eager',
    },
  },
  sections: {
    about: {
      label: 'About',
      title: 'Study, practice, and direction.',
      intro: 'The short record behind the resume.',
    },
    skills: {
      label: 'Skills',
      title: 'Capability, with an honest scale.',
      intro: 'Rated skills appear with a 0–100 bar and a matching text label.',
    },
    certificates: {
      label: 'Certificates',
      title: 'Certificates and achievements.',
      intro: 'Recent records, with the full register kept separately.',
    },
    eligibility: {
      label: 'Eligibility',
      title: 'Eligibility and certifications.',
      intro: 'Conferment dates appear only when they are known.',
    },
    experience: {
      label: 'Experience',
      title: 'Work, internship, and volunteer record.',
      intro: 'Responsibilities and accomplishments, kept specific.',
    },
    projects: {
      label: 'Projects',
      title: 'Selected projects.',
      intro: 'Purpose, build, and contribution, shown with project screenshots.',
    },
    education: {
      label: 'Education',
      title: 'Education.',
      intro: 'Tertiary, secondary, and elementary records.',
    },
    security: {
      label: 'Security focus',
      title: 'Security practice.',
      intro: 'Lab and CTF profiles, plus write-ups.',
    },
    contact: {
      label: 'Contact',
      title: 'Start a conversation.',
      intro: 'The form opens a prefilled message in your own email app.',
    },
  },
  about: {
    introduction:
      'I am a BSIT student at Isabela State University Cauayan. This portfolio records my study, project work, and security learning as I prepare for a career in cybersecurity and network security.',
    careerObjective:
      'Build defensive technical depth through disciplined coursework, documented practice, and careful work with systems and networks.',
    educationSummary:
      'BSIT, Isabela State University Cauayan. Graduation year: [TODO: confirm, expected 2027].',
    interests: ['Cybersecurity', 'Network security'],
    image: {
      src: null,
      alt: '[TODO: add an about image at public/images/about.jpg and write its alt text]',
      width: 1200,
      height: 800,
      focalPoint: 'center',
      loading: 'lazy',
    },
  },
  skills: [],
  certificateTypes: ['IT Certification', 'Training', 'Workshop', 'Seminar', 'Award'],
  certificates: [],
  eligibility: [],
  experience: {
    work: [],
    internship: [],
    volunteer: [],
  },
  projects: [],
  education: {
    tertiary: {
      level: 'Tertiary',
      institution: 'Isabela State University — Cauayan',
      course: 'BSIT, Bachelor of Science in Information Technology',
      yearGraduated: '[TODO: confirm, expected 2027]',
      achievement: '[TODO: add a tertiary achievement or remove this field]',
    },
    secondary: {
      level: 'Secondary',
      institution: '[TODO: add secondary school]',
      yearGraduated: '[TODO: add graduation year]',
      achievement: '[TODO: add a secondary achievement or remove this field]',
    },
    elementary: {
      level: 'Elementary',
      institution: '[TODO: add elementary school]',
      yearGraduated: '[TODO: add graduation year]',
    },
  },
  securityFocus: {
    profiles: [],
    writeups: [],
  },
  contact: {
    email: null,
    github: null,
    linkedin: null,
    githubLabel: 'GitHub',
    linkedinLabel: 'LinkedIn',
  },
  resumePath: '/resume/RotugalJasmine-Resume.pdf',
  contactSubject: 'Portfolio enquiry',
  ui: {
    skipToContent: 'Skip to content',
    primaryNavigation: 'Primary navigation',
    siteNavigation: 'Site',
    externalLinkNote: 'opens in a new tab',
    themeToLight: 'Switch to light theme',
    themeToDark: 'Switch to dark theme',
    themeLightShort: 'Light theme',
    themeDarkShort: 'Dark theme',
    sampleTag: 'Sample (made-up)',
    sampleBannerTitle: 'Preview with sample entries',
    sampleBannerText:
      'You are viewing made-up entries for layout review. Nothing marked Sample (made-up) is real.',
    exitSample: 'Exit sample preview',
    startSample: 'Preview with sample entries',
    viewProjects: 'View projects',
    downloadResume: 'Download resume',
    resumeChecking: 'Checking resume file…',
    resumeUnavailable:
      'The resume PDF is not available yet. [TODO: add public/resume/RotugalJasmine-Resume.pdf]',
    resumeAvailable: 'PDF resume',
    imagePlaceholder: 'Image placeholder',
    imageMissing: '[TODO: image file and alt text]',
    notSet: '[TODO: not set]',
    statusLabels: {
      'issuer-verifiable': 'Issuer-verifiable',
      'document-on-file': 'Document on file',
      'self-reported': 'Self-reported',
    },
    statusDescriptions: {
      'issuer-verifiable': 'A public HTTPS verification link is recorded.',
      'document-on-file': 'A redacted copy is recorded, without a public verification link.',
      'self-reported': 'No public verification link or document is recorded.',
    },
    certificateRegisterTitle: 'Certificate register',
    certificateRegisterHeading: 'Certificates and achievements',
    noCopyShort: 'No copy',
    certificateRegisterIntro:
      'Search the register and filter by type. Status is derived from the recorded source, not assumed.',
    searchLabel: 'Search certificates',
    searchPlaceholder: 'Title, issuer, or year',
    typeFilterLabel: 'Filter by type',
    allTypes: 'All types',
    clearFilters: 'Clear filters',
    results: {
      one: '1 certificate',
      many: 'certificates',
      none: 'No matching certificates',
    },
    tableHeaders: {
      title: 'Certificate',
      type: 'Type',
      issuer: 'Issuer',
      date: 'Date earned',
      status: 'Status',
    },
    openCertificate: 'Open details for',
    closeDialog: 'Close certificate details',
    dialogDetails: 'Certificate details',
    issuerLabel: 'Issuer',
    dateEarnedLabel: 'Date earned',
    typeLabel: 'Type',
    statusLabel: 'Status',
    verificationLink: 'Open issuer verification',
    noVerificationLink: 'No public verification link',
    noDocument: 'No redacted certificate copy is recorded.',
    emptyCertificateRegister: {
      title: 'No certificates are listed yet.',
      detail:
        '[TODO: add certificates in src/data/content.js, including type, issuer, date earned, public file, and verification URL when available.]',
    },
    emptySkills: {
      title: 'No rated skills are listed yet.',
      detail:
        '[TODO: add skills with a 0–100 proficiency and a short text label in src/data/content.js.]',
    },
    emptyCertificates: {
      title: 'No certificates or achievements are listed yet.',
      detail:
        '[TODO: add certificates and achievements in src/data/content.js.]',
    },
    emptyEligibility: {
      title: 'No eligibility or certification records are listed yet.',
      detail:
        '[TODO: add eligibility records and conferment dates in src/data/content.js.]',
    },
    emptyExperience: {
      work: {
        title: 'No work experience is listed yet.',
        detail: '[TODO: add work experience in src/data/content.js.]',
      },
      internship: {
        title: 'No internship or OJT is listed yet.',
        detail: '[TODO: add internship or OJT experience in src/data/content.js.]',
      },
      volunteer: {
        title: 'No volunteer experience is listed yet.',
        detail: '[TODO: add volunteer experience in src/data/content.js.]',
      },
    },
    emptyProjects: {
      title: 'No projects are listed yet.',
      detail:
        '[TODO: add projects with purpose, role, technologies, contributions, and at least two screenshots in src/data/content.js.]',
    },
    differentiator: 'Latest record',
    skillsProficiency: 'Proficiency',
    outOfHundred: 'out of 100',
    aboutLabels: {
      careerObjective: 'Career objective',
      educationBackground: 'Educational background',
      interests: 'Areas of interest in IT',
    },
    experienceGroups: {
      work: 'Work',
      internship: 'Internship / OJT',
      volunteer: 'Volunteer',
    },
    experienceLabels: {
      responsibilities: 'Responsibilities',
      accomplishments: 'Accomplishments',
    },
    projectLabels: {
      role: 'Role',
      purpose: 'Purpose',
      technologies: 'Technologies',
      features: 'Key features',
      contributions: 'Contributions',
      screenshots: 'Screenshots',
    },
    projectScreenshotPlaceholder: '[TODO: add a project screenshot and write its alt text]',
    browserBarLabel: 'Project screenshot',
    educationLabels: {
      institution: 'School',
      course: 'Course',
      year: 'Year graduated',
      achievement: 'Achievement',
    },
    securityProfilesTitle: 'Lab and CTF profiles',
    securityWriteupsTitle: 'Write-ups',
    openProfile: 'Open profile',
    contactLabels: {
      email: 'Professional email',
      github: 'GitHub',
      linkedin: 'LinkedIn',
      formTitle: 'Contact form',
      name: 'Name',
      message: 'Message',
      submit: 'Send message',
      emailField: 'Email',
      required: 'This field is required.',
      invalidEmail: 'Enter a valid email address.',
      tooLong: 'This entry is too long.',
      unavailable:
        'The contact form is inactive until a professional email is added. [TODO: add contact.email in src/data/content.js.]',
      hint: 'This form sends the message through the Supabase contact function and keeps the response generic.',
      opened:
        'The site opened your message request. The function will confirm success only after a server-side response.',
      mailtoBlocked:
        'The message could not be sent because the contact function is not configured.',
      sent: 'Your message was sent',
      genericError: 'Could not send, please try again later.',
    },
    footerNote: 'BSIT course project · Isabela State University Cauayan',
    footerRights: 'Resume portfolio',
    notFound: {
      eyebrow: 'Error 404',
      title: 'This page is not in the record.',
      detail: 'The address may be incomplete, or the page may have moved.',
      homeLink: 'Return to the home page',
      certificatesLink: 'Browse certificates',
    },
    emptyLabel: 'Not yet added',
    noMatchLabel: 'No match',
    viewAllCertificates: 'View all certificates',
    backToTop: 'Back to top',
    backToHome: 'Back to the home page',
    footerNavigation: 'Footer navigation',
    opensNewTab: 'opens in a new tab',
    brandDetail: 'BSIT · ISU Cauayan',
    filterEmptyDetail: 'Adjust the search text or choose a different type.',
  },
};

function sampleEntry(entry) {
  return { ...entry, sample: true };
}

const sampleScreenshots = [
  {
    src: null,
    alt: 'Sample (made-up): project dashboard placeholder',
    width: 1440,
    height: 900,
    focalPoint: 'center',
    loading: 'lazy',
  },
  {
    src: null,
    alt: 'Sample (made-up): project detail placeholder',
    width: 1440,
    height: 900,
    focalPoint: 'upper-center',
    loading: 'lazy',
  },
];

export const sampleContent = {
  ...content,
  skills: [
    sampleEntry({
      id: 'sample-skill-network-fundamentals',
      name: 'Network fundamentals',
      proficiency: 72,
      label: 'Developing',
    }),
    sampleEntry({
      id: 'sample-skill-linux',
      name: 'Linux command line',
      proficiency: 64,
      label: 'Developing',
    }),
    sampleEntry({
      id: 'sample-skill-web-basics',
      name: 'Web development basics',
      proficiency: 58,
      label: 'Foundation',
    }),
    sampleEntry({
      id: 'sample-skill-documentation',
      name: 'Technical documentation',
      proficiency: 76,
      label: 'Confident',
    }),
  ],
  certificates: [
    sampleEntry({
      id: 'sample-cert-network-security',
      title: 'Network Security Fundamentals',
      type: 'IT Certification',
      issuer: 'Sample Institute',
      dateEarned: '2026-08-18',
      publicFile: null,
      verifyUrl: 'https://example.com/verify/sample-network-security',
    }),
    sampleEntry({
      id: 'sample-cert-packet-analysis',
      title: 'Packet Analysis Workshop',
      type: 'Workshop',
      issuer: 'Sample Learning Lab',
      dateEarned: '2026-05-09',
      publicFile: null,
      verifyUrl: null,
    }),
    sampleEntry({
      id: 'sample-cert-network-defense',
      title: 'Network Defense Seminar',
      type: 'Seminar',
      issuer: 'Sample Campus Chapter',
      dateEarned: '2026-02-21',
      publicFile: null,
      verifyUrl: null,
    }),
    sampleEntry({
      id: 'sample-cert-linux-training',
      title: 'Linux Administration Training',
      type: 'Training',
      issuer: 'Sample Training Center',
      dateEarned: '2025-11-14',
      publicFile: null,
      verifyUrl: null,
    }),
    sampleEntry({
      id: 'sample-cert-academic-award',
      title: 'Academic Excellence Award',
      type: 'Award',
      issuer: 'Sample College',
      dateEarned: '2025-07-02',
      publicFile: null,
      verifyUrl: null,
    }),
    sampleEntry({
      id: 'sample-cert-ethics',
      title: 'Responsible Computing Seminar',
      type: 'Seminar',
      issuer: 'Sample Student Council',
      dateEarned: '2025-03-12',
      publicFile: null,
      verifyUrl: null,
    }),
  ],
  eligibility: [
    sampleEntry({
      id: 'sample-eligibility-professional',
      title: 'Professional Eligibility',
      issuer: 'Sample Eligibility Board',
      dateConferred: '2026-03-10',
    }),
    sampleEntry({
      id: 'sample-eligibility-network',
      title: 'Sample Network Associate Certification',
      issuer: 'Sample Certification Body',
      dateConferred: '2026-01-26',
    }),
  ],
  experience: {
    work: [
      sampleEntry({
        id: 'sample-work-support',
        organization: 'Sample Company',
        role: 'IT Support Assistant',
        period: '2025 – 2026',
        responsibilities: [
          'Recorded support requests and reproduced reported issues before escalation.',
          'Prepared setup notes for staff laptops and shared office equipment.',
        ],
        accomplishments: [
          'Built a clearer handover record for recurring support issues.',
        ],
      }),
    ],
    internship: [
      sampleEntry({
        id: 'sample-internship-security',
        organization: 'Sample Technology Office',
        role: 'Cybersecurity Intern',
        period: '2025',
        responsibilities: [
          'Reviewed access logs against a documented baseline.',
          'Documented findings and questions for the supervising analyst.',
        ],
        accomplishments: [
          'Produced a sample log review checklist for the team.',
        ],
      }),
    ],
    volunteer: [
      sampleEntry({
        id: 'sample-volunteer-literacy',
        organization: 'Sample Community Program',
        role: 'Computer Literacy Volunteer',
        period: '2025',
        responsibilities: [
          'Guided participants through basic file and account safety tasks.',
          'Prepared short, plain-language handouts for each session.',
        ],
        accomplishments: [
          'Turned the session notes into a reusable one-page guide.',
        ],
      }),
    ],
  },
  projects: [
    sampleEntry({
      id: 'sample-project-asset-inventory',
      title: 'Campus Asset Inventory',
      role: 'Front-end developer',
      purpose:
        'Organize equipment records so a small team can find an item and its owner without searching multiple files.',
      technologies: ['React', 'JavaScript', 'CSS', 'REST API'],
      features: [
        'Searchable equipment list with clear empty states.',
        'Record detail view with ownership history.',
        'Exportable inventory summary.',
      ],
      contributions: [
        'Built the list and detail views.',
        'Wrote the validation rules for new records.',
        'Documented the setup steps.',
      ],
      screenshots: sampleScreenshots,
    }),
    sampleEntry({
      id: 'sample-project-network-notes',
      title: 'Network Lab Notes',
      role: 'Designer and developer',
      purpose:
        'Keep lab steps, observations, and packet captures together so a repeated exercise can be reviewed later.',
      technologies: ['HTML', 'CSS', 'JavaScript'],
      features: [
        'Lab entries with a fixed observation format.',
        'Filter by topic and lab date.',
        'Printable review sheet.',
      ],
      contributions: [
        'Designed the entry structure.',
        'Built the filter and print view.',
        'Tested the layout at mobile and desktop widths.',
      ],
      screenshots: sampleScreenshots,
    }),
  ],
  education: {
    ...content.education,
    secondary: sampleEntry({
      level: 'Secondary',
      institution: 'Sample National High School',
      yearGraduated: '2023',
      achievement: 'Sample academic distinction',
    }),
    elementary: sampleEntry({
      level: 'Elementary',
      institution: 'Sample Central School',
      yearGraduated: '2019',
    }),
  },
  securityFocus: {
    profiles: [
      sampleEntry({
        id: 'sample-profile-ctf',
        name: 'Sample CTF Profile',
        detail: 'Practice profile for web and network challenges.',
        url: 'https://example.com/sample-ctf-profile',
      }),
      sampleEntry({
        id: 'sample-profile-lab',
        name: 'Sample Lab Journal',
        detail: 'Notes from a personal networking lab.',
        url: 'https://example.com/sample-lab-journal',
      }),
    ],
    writeups: [
      sampleEntry({
        id: 'sample-writeup-packets',
        title: 'Reading a packet capture without guesswork',
        summary:
          'A short method for stating the question, isolating traffic, and recording what the capture supports.',
      }),
      sampleEntry({
        id: 'sample-writeup-baseline',
        title: 'Building a small network baseline',
        summary:
          'How a documented baseline makes later changes easier to explain and review.',
      }),
    ],
  },
  contact: {
    ...content.contact,
    email: 'jasmine.rotugal@example.com',
    github: 'https://example.com/sample-github',
    linkedin: 'https://example.com/sample-linkedin',
    sample: true,
  },
};

export function getContent(isSample) {
  return isSample ? sampleContent : content;
}
