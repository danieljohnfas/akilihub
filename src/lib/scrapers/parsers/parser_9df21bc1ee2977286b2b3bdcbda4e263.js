const selectors = [
  '.job',
  '.job-item',
  '.job-card',
  '.posting',
  '[data-job]',
  '.vacancy',
  '.career-item',
  '.listing-item',
  '.position',
  '.listing',
  '.career-opportunity'
];

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function parseDate(str) {
  const d = new Date(str);
  return isNaN(d) ? null : d.toISOString();
}

function parseSalary(text) {
  if (!text) return {};
  const currencyMatch = text.match(/[\p{Sc}]/u);
  const currency = currencyMatch ? currencyMatch[0] : null;
  const numbers = text.match(/[\d.,]+/g);
  if (!numbers) return { salaryCurrency: currency };
  const vals = numbers.map(n => parseFloat(n.replace(/,/g, '')));
  if (vals.length === 1) return { salaryMin: vals[0], salaryMax: vals[0], salaryCurrency: currency };
  return { salaryMin: Math.min(...vals), salaryMax: Math.max(...vals), salaryCurrency: currency };
}

function normalizeJobType(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes('full')) return 'full_time';
  if (lower.includes('part')) return 'part_time';
  if (lower.includes('contract')) return 'contract';
  if (lower.includes('intern')) return 'internship';
  if (lower.includes('remote')) return 'remote';
  return null;
}

let found = false;

for (const sel of selectors) {
  $(sel).each((_, elem) => {
    const $elem = $(elem);
    let title = cleanText($elem.find('h1, h2, h3, a.title, .title, .job-title').first().text());
    if (!title) title = cleanText($elem.attr('title') || '');
    if (!title) return;
    found = true;

    const companyName = cleanText($elem.find('.company, .company-name, .employer').first().text());
    const description = cleanText($elem.find('.description, .job-description, .desc').first().text());
    const location = cleanText($elem.find('.location, .job-location, .place').first().text());

    const typeText = cleanText($elem.find('.type, .job-type, .employment-type').first().text());
    const jobType = normalizeJobType(typeText);

    const link = $elem.find('a[href]').first().attr('href');
    const sourceUrl = link ? (link.startsWith('http') ? link : (new URL(link, (typeof window !== 'undefined' && window.location) ? window.location.origin : '')).href) : null;

    const postedRaw = $elem.find('time[datetime], .posted, .date-posted').first().attr('datetime') ||
                      $elem.find('time, .posted, .date-posted').first().text();
    const postedDateIsoString = postedRaw ? parseDate(postedRaw) : null;

    const deadlineRaw = $elem.find('.deadline, .apply-by, time.deadline[datetime]').first().attr('datetime') ||
                        $elem.find('.deadline, .apply-by, time.deadline').first().text();
    const deadlineIsoString = deadlineRaw ? parseDate(deadlineRaw) : null;

    const salaryRaw = $elem.find('.salary, .compensation, .pay').first().text();
    const { salaryMin, salaryMax, salaryCurrency } = parseSalary(salaryRaw);

    const job = {
      title,
      companyName: companyName || undefined,
      description: description || undefined,
      location: location || undefined,
      jobType: jobType || undefined,
      sourceUrl: sourceUrl || undefined,
      postedDateIsoString: postedDateIsoString || undefined,
      deadlineIsoString: deadlineIsoString || undefined,
      salaryMin: salaryMin !== undefined ? salaryMin : undefined,
      salaryMax: salaryMax !== undefined ? salaryMax : undefined,
      salaryCurrency: salaryCurrency || undefined
    };
    result.push(job);
  });
  if (found) break;
}
if (!found) {
  // No job listings detected; result remains empty.
}