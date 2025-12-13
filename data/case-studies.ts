export interface CaseStudy {
  id: string;
  title: string;
  tagline: string;
  problem: string;
  role: string;
  technicalDecisions: string[];
  scale: string;
  techStack: string[];
}

export const caseStudies: CaseStudy[] = [
  {
    id: "tram-daily-web",
    title: "tram daily web",
    tagline: "daily operations management platform for transport services",
    problem:
      "a transport service company needed a centralized platform to manage daily operations, track drivers, schedule routes, and monitor vehicle maintenance. excel sheets were causing data inconsistencies and communication gaps.",
    role: "solo-developer",
    technicalDecisions: [],
    scale: "",
    techStack: [],
  },
];
