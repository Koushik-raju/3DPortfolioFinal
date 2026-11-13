// ---------------------------------------------------------------------------
// Everything the site says about you lives here. Edit this file to update the
// room, the panels and the contact links without touching the 3D code.
// ---------------------------------------------------------------------------

export const person = {
  first: 'Koushik',
  last: 'Raju',
  initials: 'KR',
  role: 'Developer · Tester · Designer',
  tagline: 'I build digital things that work.',
  intro:
    'A developer and QA engineer with an eye for detail — I like the part where a product stops being a demo and starts being reliable.',
  availability: 'Open to work',
  email: 'koushikrajusr@gmail.com',
  github: 'https://github.com/Koushik-raju',
  linkedin: 'https://www.linkedin.com/in/koushik-raju-s-r-0a0871231/',
  certificationsPage: 'Certification.html',
};

export const projects = [
  {
    id: 'lms',
    name: 'Library Management System',
    kind: 'Full stack',
    year: '2024',
    stack: ['Python', 'MySQL', 'XAMPP'],
    summary: 'Catalogue, lending and returns for a real library — without the paperwork.',
    detail:
      'A desktop-first library system with member records, book catalogue search, issue and return handling and fine calculation. Built on Python with a MySQL schema behind XAMPP, and designed so a librarian can finish the common tasks in a few clicks.',
    notes: [
      ['Focus', 'Catalogue search, issue / return, member records'],
      ['Storage', 'Normalised MySQL schema, seeded test data'],
      ['Takeaway', 'First project where data integrity mattered more than the UI'],
    ],
    href: 'https://github.com/Koushik-raju/Library-Management-System',
    cta: 'View on GitHub',
  },
  {
    id: 'aws',
    name: 'Website Hosting on AWS',
    kind: 'Cloud',
    year: '2023',
    stack: ['AWS EC2', 'S3', 'IAM', 'Linux'],
    summary: 'A static site, served from S3 and a hardened EC2 instance.',
    detail:
      'Hands-on hosting exercise: a static front end served from an S3 bucket, an EC2 instance running the server side, security groups and an IAM user scoped to exactly what the deployment needs. Documented end to end as a repeatable runbook.',
    notes: [
      ['Compute', 'EC2 instance with a minimal Linux server'],
      ['Storage', 'S3 bucket for static assets'],
      ['Security', 'Least-privilege IAM user, tight security group'],
    ],
    href: 'https://github.com/Koushik-raju/AWS-Website-Hosting',
    cta: 'View on GitHub',
  },
  {
    id: 'chain',
    name: 'Decentralized Website Hosting',
    kind: 'Blockchain',
    year: '2023',
    stack: ['Solidity', 'Truffle', 'Ganache', 'Web3.js', 'Node.js'],
    summary: 'Publishing a site through a smart contract instead of a server.',
    detail:
      'A smart contract that stores a site’s content records, deployed and tested on a local Ganache chain with Truffle migrations. A Node.js + Web3.js front end reads the contract to render the published page — an experiment in what hosting looks like without a central host.',
    notes: [
      ['Contract', 'Solidity, deployed through Truffle migrations'],
      ['Chain', 'Ganache for a local development network'],
      ['Client', 'Node.js + Web3.js reading contract state'],
    ],
    href: 'https://github.com/Koushik-raju/Blockchain-Website-Hosting',
    cta: 'View on GitHub',
  },
];

export const experiments = [
  { name: 'Snake', stack: 'Canvas · JS', href: 'Snake.html' },
  { name: '2048', stack: 'Grid logic · JS', href: '2048.html' },
  { name: 'Tic Tac Toe', stack: 'Game logic · JS', href: 'TicTacToe.html' },
  { name: 'Pong', stack: 'Canvas · JS', href: 'Pong.html' },
  { name: 'Memory Card', stack: 'State · JS', href: 'MemoryCard.html' },
  { name: 'Task Manager', stack: 'CRUD · LocalStorage', href: 'ScheduleManager.html' },
];

export const experience = [
  {
    period: '2023 — 2024',
    role: 'Junior Software Tester',
    org: 'EXAR',
    meta: 'Manual + automated QA · ~8 months',
    points: [
      'Wrote and executed test cases across web flows, then turned the failures into clear, reproducible bug reports.',
      'Ran regression passes before releases and kept coverage visible in Notion so nothing slipped between sprints.',
      'Worked alongside developers to reproduce edge cases — and to confirm the fixes actually held.',
    ],
  },
  {
    period: '2022 — Present',
    role: 'Web Developer',
    org: 'Independent builds',
    meta: 'Front end, cloud, blockchain experiments',
    points: [
      'Built responsive interfaces with HTML, CSS, JavaScript and React, backed by Java and MySQL or MongoDB.',
      'Deployed work on AWS (EC2, S3) and explored smart-contract hosting on Ethereum.',
      'Shipped a set of small browser games and utilities to keep the fundamentals sharp.',
    ],
  },
];

export const education = [
  {
    period: 'Graduated',
    title: 'Bachelor of Computer Applications',
    org: 'BCA',
    meta: 'Computer science fundamentals, databases, software testing',
  },
];

export const certifications = [
  { name: 'Cloud Computing (AWS)', issuer: 'Indigeneous Tech Pvt Ltd', date: 'Apr 2022' },
  { name: 'Blockchain Professional', issuer: 'Indigeneous Tech Pvt Ltd', date: 'Sep 2022' },
  { name: 'JavaScript', issuer: 'Simplilearn', date: 'Oct 2022' },
  { name: 'React JS', issuer: 'Simplilearn', date: 'Nov 2022' },
  { name: 'NodeJS', issuer: 'Simplilearn', date: 'Nov 2022' },
  { name: 'Cyber Security & Ethical Hacking', issuer: 'Ditto Security', date: 'Apr 2022' },
  { name: 'MS Office', issuer: 'Prajwal Systems', date: 'May 2012' },
  { name: 'Science in Action (Volunteer)', issuer: 'B.V. Jagadeesh Science Centre', date: 'May 2012' },
];

export const skills = [
  { group: 'Front end', items: ['HTML', 'CSS', 'JavaScript', 'React'] },
  { group: 'Back end', items: ['Java', 'Node.js', 'Python'] },
  { group: 'Data', items: ['MySQL', 'MongoDB'] },
  { group: 'Quality', items: ['Manual testing', 'Automated testing', 'Regression', 'Bug reporting'] },
  { group: 'Tools', items: ['Git & GitHub', 'Notion', 'XAMPP', 'Linux', 'AWS'] },
];

export const about = {
  paragraphs: [
    'Hey — I’m Koushik. I started out building interfaces, then spent close to a year testing them, which changed how I write code: I now design for the edge cases first.',
    'I work across the stack where it helps — React and JavaScript on the front, Java and Node behind, MySQL or MongoDB underneath — and I care about the unglamorous parts: clear states, honest error messages, and a build that behaves the same on a slow connection.',
    'Outside of work I read a lot and skate to clear my head. Both are good reminders that repetition, not inspiration, is what makes something look effortless.',
  ],
  facts: [
    ['Based', 'India · open to remote'],
    ['Focus', 'Front end & QA'],
    ['Education', 'BCA'],
    ['Currently', 'Building a 3D portfolio'],
  ],
  interests: ['Reading', 'Skating', 'Design systems', 'Testing'],
};

export const contact = {
  headline: 'Let’s build something that holds up.',
  note: 'Open to front-end roles, QA and testing work, and projects where the details matter. I reply to everything.',
  links: [
    { label: 'Email', value: 'koushikrajusr@gmail.com', href: 'mailto:koushikrajusr@gmail.com' },
    { label: 'GitHub', value: 'github.com/Koushik-raju', href: 'https://github.com/Koushik-raju' },
    { label: 'LinkedIn', value: 'linkedin.com/in/koushik-raju', href: 'https://www.linkedin.com/in/koushik-raju-s-r-0a0871231/' },
    { label: 'Certifications', value: 'Eight certificates', href: 'Certification.html' },
  ],
};
