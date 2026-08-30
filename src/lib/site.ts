/* Hub-specific configuration. This is the file you rewrite for Hub 2.
   Everything that names, links, or describes the site lives here so the
   templates stay hub-agnostic. */

export const SITE = {
  name: 'Estimates',
  tagline: 'Mortgage and real estate calculators that show their work',
  description:
    'Free mortgage calculators with real amortization schedules, extra-payment ' +
    'modelling, refinance break-even analysis, and rental property returns. ' +
    'Every result is shareable by URL.',
  url: 'https://example.com', // TODO: real domain before launch
  locale: 'en_US',
} as const;

export interface Tool {
  slug: string;
  title: string;
  /** short label for nav and cards */
  nav: string;
  blurb: string;
  /** the plan's tool number, kept for traceability against the build plan */
  planId: number;
  group: 'buy' | 'refinance' | 'invest';
}

export const TOOLS: Tool[] = [
  {
    slug: 'amortization-calculator',
    title: 'Amortization Calculator with Extra Payments',
    nav: 'Amortization',
    blurb: 'Full payment schedule, plus what an extra $100 a month does to your payoff date and total interest.',
    planId: 1, group: 'buy',
  },
  {
    slug: 'refinance-break-even-calculator',
    title: 'Refinance Break-Even Calculator',
    nav: 'Refinance',
    blurb: 'How many months until the new rate pays back the closing costs — and whether you will still be there.',
    planId: 2, group: 'refinance',
  },
  {
    slug: 'rent-vs-buy-calculator',
    title: 'Rent vs Buy Calculator',
    nav: 'Rent vs buy',
    blurb: 'A ten-year net worth projection for both paths, including the opportunity cost of your down payment.',
    planId: 3, group: 'buy',
  },
  {
    slug: 'home-affordability-calculator',
    title: 'Home Affordability Calculator',
    nav: 'Affordability',
    blurb: 'What you can actually borrow, from your income, debts, and the property tax and insurance where you are buying.',
    planId: 4, group: 'buy',
  },
  {
    slug: 'closing-cost-calculator',
    title: 'Closing Cost Calculator',
    nav: 'Closing costs',
    blurb: 'Transfer tax, recording fees, title, lender and prepaid items, broken out by state.',
    planId: 5, group: 'buy',
  },
  {
    slug: 'rental-property-calculator',
    title: 'Rental Property Calculator',
    nav: 'Rental analysis',
    blurb: 'Cap rate, cash-on-cash, DSCR and a ten-year pro forma for a single-family or small multifamily deal.',
    planId: 6, group: 'invest',
  },
  {
    slug: 'heloc-vs-cash-out-refinance',
    title: 'HELOC vs Cash-Out Refinance',
    nav: 'HELOC vs cash-out',
    blurb: 'Two ways to pull equity, compared on total cost, payment shape, and what it does to your first-lien rate.',
    planId: 7, group: 'refinance',
  },
];

export const toolBySlug = (slug: string): Tool | undefined => TOOLS.find((t) => t.slug === slug);

export const toolsExcept = (slug: string): Tool[] => TOOLS.filter((t) => t.slug !== slug);

/** Primary nav — kept to five items; the rest are reachable from cards. */
export const NAV = TOOLS.slice(0, 5).map((t) => ({ href: `/tools/${t.slug}`, label: t.nav }));
