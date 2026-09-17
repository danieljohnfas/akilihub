// Define possible job container selectors
const containerSelectors = [
  '.job-listing',
  '.job-item',
  '.vacancy',
  '.career',
  '.post',
  '.card',
  'article',
  'section'
];

// Helper to map job type keywords
function mapJobType(text) {
  const t = text.toLowerCase();
  if (/full[-\s]?time/.test(t)) return 'full_time';
  if (/part[-\s]?time/.test(t)) return 'part_time';
  if (/contract/.test(t)) return 'contract';
  if (/internship/.test(t)) return 'internship';
  if (/remote/.test(t)) return 'remote';
  return '';
}

// Helper to parse ISO date from string
function parseIso(str) {
  const d = Date.parse(str);
  return isNaN(d) ? '' : new Date(d).toISOString();
}

// Helper to extract salary info
function extractSalary(text) {
  const re = /(?:(USD|ZMW|\$|£|€)\s*)?(\d{1,3}(?:[,\.\d]*\d))\s*(?:[-–to]{1,3}\s*(?:(USD|ZMW|\$|£|€)\s*)?(\d{1,3}(?:[,\.\d]*\d)))?/i;
  const m = re.exec(text.replace(/\s+/g, ' '));
  if (!m) return {};
  const cur1 = m[1] || m[3] || '';
  const cur2 = m[3] || '';
  const currency = cur1 || cur2 || '';
  const min = m[2] ? parseFloat(m[2].replace(/[,]/g, '')) : null;
  const max = m[4] ? parseFloat(m[4].replace(/[,]/g, '')) : null;
  return {
    salaryCurrency: currency,
    salaryMin: min,
    salaryMax: max
  };
}

// Iterate over each possible container
containerSelectors.forEach(sel => {
  $(sel).each((_, elem) => {
    const $elem = $(elem);
    const title = $elem.find('h1, h2, h3, .job-title, .title').first().text().trim();
    if (!title) return; // skip if no clear title

    const companyName = $elem.find('.company, .company-name, .employer').first().text().trim() || '';
    const location = $elem.find('.location, .job-location, .city, .place').first().text().trim() || '';
    const description = $elem.find('.description, .job-description, p').map((i, el) => $(el).text().trim()).get().join(' ') || '';
    const typeText = $elem.text();
    const jobType = mapJobType(typeText);
    const sourceUrl = $elem.find('a[href]').first().attr('href') || '';

    // Dates
    const postedRaw = $elem.find('time[datetime], .posted, .date, .post-date').first().attr('datetime') ||
                      $elem.find('.posted, .date, .post-date').first().text().trim();
    const deadlineRaw = $elem.find('.deadline, .apply-by, .closing-date').first().attr('datetime') ||
                        $elem.find('.deadline, .apply-by, .closing-date').first().text().trim();
    const postedDateIsoString = postedRaw ? parseIso(postedRaw) : '';
    const deadlineIsoString = deadlineRaw ? parseIso(deadlineRaw) : '';

    // Salary
    const salaryInfo = extractSalary($elem.text());

    const job = {
      title,
      companyName,
      description,
      location,
      jobType,
      sourceUrl,
      postedDateIsoString,
      deadlineIsoString,
      salaryMin: salaryInfo.salaryMin !== undefined ? salaryInfo.salaryMin : null,
      salaryMax: salaryInfo.salaryMax !== undefined ? salaryInfo.salaryMax : null,
      salaryCurrency: salaryInfo.salaryCurrency || ''
    };
    result.push(job);
  });
});