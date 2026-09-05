export interface GlobalSearchParams {
  q?: string;
  country?: string; // Standardized geography parameter
  status?: string; // Tenders (open/closed) & Compliance (active/inactive)
  type?: string; // Jobs (full-time, part-time)
  level?: string; // Salaries (entry, mid, senior)
  category?: string; // Health (maternal, child, infectious)
  company?: string; // Jobs
  time?: string; // Jobs
  source?: string; // Health
  organization?: string; // Tenders
  layout?: 'grid' | 'list'; // View mode (grid/list)
  /** When true, include deadline-expired and stale (no-deadline, older than 45d) jobs */
  includeExpired?: boolean;
  page: number; // Parsed to integer, defaults to 1
}

export function parseGlobalSearchParams(
  searchParams: { [key: string]: string | string[] | undefined }
): GlobalSearchParams {
  const getParam = (val: string | string[] | undefined) => {
    if (typeof val === 'string' && val !== 'all' && val !== '') return val;
    return undefined;
  };

  const includeExpiredRaw = typeof searchParams.includeExpired === 'string'
    ? searchParams.includeExpired
    : undefined;
  const includeExpired = includeExpiredRaw === '1' || includeExpiredRaw === 'true';

  const params: GlobalSearchParams = {
    q: getParam(searchParams.q),
    country: getParam(searchParams.country) || getParam(searchParams.location),
    status: getParam(searchParams.status),
    type: getParam(searchParams.type),
    level: getParam(searchParams.level),
    category: getParam(searchParams.category),
    company: getParam(searchParams.company),
    time: getParam(searchParams.time),
    source: getParam(searchParams.source),
    organization: getParam(searchParams.organization),
    layout: (getParam(searchParams.layout) === 'list' ? 'list' : 'grid'),
    includeExpired: includeExpired || undefined,
    page: typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) || 1 : 1,
  };
  return params;
}
