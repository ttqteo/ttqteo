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
    title: "Finance App",
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
