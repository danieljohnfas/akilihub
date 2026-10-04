const jobSelectors = [
  '[itemscope][itemtype="https://schema.org/JobPosting"]',
  '[itemscope][itemtype="http://schema.org/JobPosting"]',
  '.job',
  '.job-listing',
  '.posting',
  '[data-job-id]',
  '[class*="job-"]'
];
let jobs = $(jobSelectors.join(','));

if (jobs.length) {
  jobs.each((_, el) => {
    const container = $(el);
    const getText = (sel) => container.find(sel).first().text().trim() || null;
    const getAttr = (sel, attr) => container.find(sel).first().attr(attr) || null;

    const title = getText('[itemprop="title"], [itemprop="name"], .title, h1, h2, h3') ||
                  container.attr('title') || null;

    const companyName = getText('[itemprop="hiringOrganization"] [itemprop="name"], .company, .employer') || null;

    const description = getText('[itemprop="description"], .description, .job-desc') || null;

    const location = getText('[itemprop="jobLocation"] [itemprop="address"], .location, .job-location') || null;

    let jobType = getText('[itemprop="employmentType"], .job-type') || null;
    if (jobType) {
      const map = {
        'FULL_TIME': 'full_time',
        'FULL-TIME': 'full_time',
        'PART_TIME': 'part_time',
        'PART-TIME': 'part_time',
        'CONTRACT': 'contract',
        'INTERNSHIP': 'internship',
        'REMOTE': 'remote'
      };
      const normalized = jobType.toUpperCase().replace(/\s+/g, '_');
      jobType = map[normalized] || normalized.toLowerCase();
    }

    const sourceUrl = getAttr('[itemprop="url"], a', 'href') ||
                      container.closest('a').attr('href') ||
                      null;

    const postedDateIsoString = getAttr('[itemprop="datePosted"]', 'content') ||
                                (function() {
                                  const txt = getText('[itemprop="datePosted"]');
                                  return txt ? new Date(txt).toISOString() : null;
                                })() ||
                                null;

    const deadlineIsoString = getAttr('[itemprop="validThrough"]', 'content') ||
                              (function() {
                                const txt = getText('[itemprop="validThrough"]');
                                return txt ? new Date(txt).toISOString() : null;
                              })() ||
                              null;

    let salaryMin = null;
    let salaryMax = null;
    let salaryCurrency = null;

    const salaryEl = container.find('[itemprop="baseSalary"], .salary').first();
    if (salaryEl.length) {
      const salaryText = salaryEl.text().replace(/[\$,€£]/g, '').replace(/[^0-9\-\s]/g, '').trim();
      if (salaryText) {
        const parts = salaryText.split(/[-–]/).map(p => parseInt(p.trim(), 10)).filter(Number.isFinite);
        if (parts.length === 1) {
          salaryMin = salaryMax = parts[0];
        } else if (parts.length >= 2) {
          salaryMin = parts[0];
          salaryMax = parts[1];
        }
      }
      const cur = salaryEl.text().match(/[\$,€£]/);
      salaryCurrency = cur ? cur[0] : null;
    }

    result.push({
      title,
      companyName,
      description,
      location,
      jobType,
      sourceUrl,
      postedDateIsoString,
      deadlineIsoString,
      salaryMin,
      salaryMax,
      salaryCurrency
    });
  });
}