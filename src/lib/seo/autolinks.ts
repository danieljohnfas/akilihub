export interface AutoLinkRule {
  keyword: string;
  href: string;
  // Use exact match (\b) or partial match? Usually exact word bounds are best for SEO.
  exact?: boolean; 
}

export const AUTO_LINK_RULES: AutoLinkRule[] = [
  // Top Countries
  { keyword: 'Kenya', href: '/jobs?country=Kenya', exact: true },
  { keyword: 'Tanzania', href: '/jobs?country=Tanzania', exact: true },
  { keyword: 'Uganda', href: '/jobs?country=Uganda', exact: true },
  { keyword: 'Rwanda', href: '/jobs?country=Rwanda', exact: true },
  { keyword: 'Ethiopia', href: '/jobs?country=Ethiopia', exact: true },
  { keyword: 'Burundi', href: '/jobs?country=Burundi', exact: true },
  { keyword: 'DRC', href: '/jobs?country=Democratic Republic of the Congo', exact: true },
  
  // Job Types & Categories
  { keyword: 'NGO', href: '/jobs?q=NGO', exact: true },
  { keyword: 'Non-Governmental Organization', href: '/jobs?q=NGO', exact: true },
  { keyword: 'Software Engineer', href: '/jobs?q=Software Engineer', exact: true },
  { keyword: 'Software Engineering', href: '/jobs?q=Software Engineering', exact: true },
  { keyword: 'Accounting', href: '/jobs?q=Accounting', exact: true },
  { keyword: 'Finance', href: '/jobs?q=Finance', exact: true },
  { keyword: 'Human Resources', href: '/jobs?q=Human Resources', exact: true },
  { keyword: 'Customer Service', href: '/jobs?q=Customer Service', exact: true },
  { keyword: 'Marketing', href: '/jobs?q=Marketing', exact: true },
  { keyword: 'Healthcare', href: '/jobs?q=Healthcare', exact: true },
  
  // High volume keywords
  { keyword: 'Government Tenders', href: '/tenders', exact: true },
  { keyword: 'Tenders in Kenya', href: '/tenders', exact: true },
  
  // High value companies
  { keyword: 'Safaricom', href: '/jobs?company=Safaricom', exact: true },
  { keyword: 'KRA', href: '/jobs?company=Kenya Revenue Authority', exact: true },
  { keyword: 'Kenya Revenue Authority', href: '/jobs?company=Kenya Revenue Authority', exact: true },
  { keyword: 'Equity Bank', href: '/jobs?company=Equity Bank', exact: true },
  { keyword: 'KCB', href: '/jobs?company=KCB', exact: true },
  { keyword: 'UNHCR', href: '/jobs?company=UNHCR', exact: true },
  { keyword: 'UNICEF', href: '/jobs?company=UNICEF', exact: true },
  { keyword: 'World Food Programme', href: '/jobs?company=World Food Programme', exact: true },
  { keyword: 'WFP', href: '/jobs?company=World Food Programme', exact: true },
];

/**
 * Pre-compile the rules into a single regex for maximum performance during React renders.
 * This pattern captures the keywords while respecting word boundaries if requested.
 */
export const AUTO_LINK_REGEX = new RegExp(
  '(' + 
  AUTO_LINK_RULES.map(rule => {
    const escaped = rule.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return rule.exact ? `\\b${escaped}\\b` : escaped;
  }).join('|') + 
  ')',
  'gi' // global, case-insensitive
);
