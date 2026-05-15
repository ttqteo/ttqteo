export interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  problem: string;
  solution: string;
  techStack: string[];
  features: string[];
  image?: string;
  codeSnippet?: {
    language: string;
    code: string;
  };
  links: {
    github?: string;
    npm?: string;
    docs?: string;
    live?: string;
  };
  isFlagship?: boolean;
}

export const featuredProjects: Project[] = [
  {
    id: "neurite",
    title: "neurite",
    tagline: "AI-native neural knowledge system for learning and research",
    description:
      "A lightweight self-hosted AI workspace that combines note-taking, semantic search, AI memory, document ingestion, and knowledge graphs into a single connected-thinking environment for students, developers, and researchers.",
    problem:
      "Knowledge tools today are fragmented — notes, PDFs, web clippings, and AI chats live in separate silos with no long-term memory or semantic connections. Researchers and learners lose context across sessions and struggle to synthesize what they already know.",
    solution:
      "Built a self-hosted workspace where notes, ingested documents (PDF/YouTube/Web), and AI conversations share a vector memory and knowledge graph. Capture → Organize → Connect → Recall → Synthesize as a single workflow, powered by pgvector and pluggable LLM backends (OpenRouter/Ollama).",
    techStack: [
      "Next.js",
      "Supabase",
      "PostgreSQL",
      "pgvector",
      "OpenRouter",
      "Ollama",
      "Docker",
      "Python",
    ],
    features: [
      "AI-native notes and workspace",
      "Semantic search with vector memory",
      "Knowledge graph visualization",
      "PDF / YouTube / Web ingestion",
      "AI summaries and long-term recall",
      "Learning planner and schedules",
      "Self-hosted and lightweight architecture",
    ],
    links: {
      github: "https://github.com/ttqteo/neurite",
    },
    isFlagship: true,
  },
  {
    id: "vnstock-js",
    title: "vnstock-js",
    tagline: "Open-source TypeScript package for Vietnam stock market data",
    description:
      "A lightweight NPM package for fetching Vietnam stock market data from VCI. Inspired by thinh-vu/vnstock (Python), this brings the same capabilities to the JavaScript/TypeScript ecosystem.",
    problem:
      "The Vietnam stock market data ecosystem was dominated by Python libraries. JavaScript/TypeScript developers had no native solution for accessing Vietnamese stock data programmatically.",
    solution:
      "Built a TypeScript-first NPM package with simple, intuitive API for fetching stock quotes, price boards, top gainers/losers, and commodity prices (gold, etc.). Fully typed with comprehensive documentation.",
    techStack: ["TypeScript", "NPM", "VCI API", "Node.js"],
    features: [
      "Fetch historical stock data with customizable timeframes",
      "Real-time price board and market statistics",
      "Top gainers/losers tracking",
      "Commodity prices (SJC Gold, etc.)",
      "Full TypeScript support with type definitions",
      "Simple and advanced API patterns",
    ],
    codeSnippet: {
      language: "typescript",
      code: `import { stock, commodity } from 'vnstock-js';

// Ticker history data
const history = await stock.quote({
  ticker: 'VCI',
  start: '2025-01-01'
});

// Ticker price board
const priceBoard = await stock.priceBoard({
  ticker: 'VCI'
});

// Top gainers in day
const gainers = await stock.topGainers();

// Gold Price from SJC
const goldPrices = await commodity.gold.priceSJC();`,
    },
    links: {
      github: "https://github.com/ttqteo/vnstock-js",
      npm: "https://www.npmjs.com/package/vnstock-js",
      docs: "https://vnstock-js-docs.vercel.app/",
    },
    isFlagship: true,
  },
  {
    id: "finance-app",
    title: "finance app",
    tagline: "Full-stack finance & stock tracking platform",
    description:
      "A comprehensive finance platform for tracking stocks, analyzing market trends, and managing personal finance. Built with modern web technologies for performance and scalability.",
    problem:
      "Needed a centralized platform to track Vietnamese stock market data, analyze trends, and manage personal financial portfolios with real-time updates.",
    solution:
      "Developed a full-stack application with data crawling pipeline, backend API, and interactive frontend. Integrated with vnstock-js for market data and built custom analytics.",
    techStack: [
      "Next.js",
      "TypeScript",
      "React",
      "TailwindCSS",
      "PostgreSQL",
      "Prisma",
      "vnstock-js",
    ],
    features: [
      "Real-time stock price tracking",
      "Portfolio management and analytics",
      "Market trend visualization with charts",
      "News aggregation from multiple sources",
      "Custom watchlists and alerts",
      "Historical data analysis",
    ],
    links: {
      github: "https://github.com/ttqteo/finance-app",
      live: "https://ttqteo-finance.vercel.app/",
    },
  },
  {
    id: "crawl-news",
    title: "Crawl News",
    tagline: "Python-based news aggregation and data normalization system",
    description:
      "A simple yet effective web scraping system for crawling financial news from Vietnamese sources, normalizing the data, and exposing it via public API endpoints.",
    problem:
      "Financial news is scattered across multiple Vietnamese sources with inconsistent formats. Manual aggregation is time-consuming and not scalable.",
    solution:
      "Built a Python scraper that crawls multiple news sources, normalizes data structure (title, content, publish date, source), stores in database, and provides public API access.",
    techStack: ["Python", "BeautifulSoup", "Requests", "FastAPI", "PostgreSQL"],
    features: [
      "Multi-source news scraping with schedule automation",
      "Data normalization and cleaning",
      "Duplicate detection and filtering",
      "RESTful API for public data access",
      "Search and filtering capabilities",
      "Data export in JSON/CSV formats",
    ],
    links: {
      github: "https://github.com/ttqteo/crawl-news",
    },
  },
];

import type { IndexEntry } from "@/components/portfolio/IndexTable";

export const projectIndex: IndexEntry[] = [
  {
    year: 2026,
    title: "neurite",
    description:
      "AI-native neural knowledge system combining notes, semantic search, knowledge graphs, and document ingestion into a self-hosted workspace for learning and research.",
    stack: ["Next.js", "Supabase", "pgvector"],
    href: "https://github.com/ttqteo/neurite",
    external: true,
  },
  {
    year: 2025,
    title: "vnstock-js",
    description:
      "Open-source TypeScript package for Vietnam stock market data. Fetch historical prices, real-time boards, top movers, and commodity prices from VCI.",
    stack: ["TypeScript", "Node"],
    metric: "npm",
    href: "https://www.npmjs.com/package/vnstock-js",
    external: true,
  },
  {
    year: 2025,
    title: "finance app",
    description:
      "Full-stack finance platform for tracking Vietnamese stocks, managing personal portfolios, and aggregating market news in real time.",
    stack: ["Next.js", "Prisma", "Postgres"],
    href: "https://ttqteo-finance.vercel.app/",
    external: true,
  },
  {
    year: 2024,
    title: "news-crawler",
    description:
      "Python scraper that crawls Vietnamese financial news sources, normalizes content, deduplicates, and exposes a public REST API.",
    stack: ["Python", "FastAPI", "Postgres"],
    href: "https://github.com/ttqteo/crawl-news",
    external: true,
  },
];
