export interface GlobalSearchParams {
  q?: string;
  country?: string; // Standardized geography parameter
  status?: string; // Tenders (open/closed) & Compliance (active/inactive)
  type?: string; // Jobs (full-time, part-time)
  level?: string; // Salaries (entry, mid, senior)
  company?: string; // Jobs
  time?: string; // Jobs
  layout?: 'grid' | 'list'; // View mode (grid/list)
  page: number; // Parsed to integer, defaults to 1
}

export function parseGlobalSearchParams(
  searchParams: { [key: string]: string | string[] | undefined }
): GlobalSearchParams {
  const getParam = (val: string | string[] | undefined) => {
    if (typeof val === 'string' && val !== 'all' && val !== '') return val;
    return undefined;
  };

  const params: GlobalSearchParams = {
    q: getParam(searchParams.q),
    country: getParam(searchParams.country) || getParam(searchParams.location),
    status: getParam(searchParams.status),
    type: getParam(searchParams.type),
    level: getParam(searchParams.level),
    company: getParam(searchParams.company),
    time: getParam(searchParams.time),
    layout: (getParam(searchParams.layout) === 'list' ? 'list' : 'grid'),
    page: typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) || 1 : 1,
  };
  return params;
}
