const jobSelectors = [
  '.job-listing',
  '.job-item',
  '.career-item',
  '.vacancy',
  '.job-card',
  '.post-job',
  'article.job',
  'li.job',
  '[data-job]',
  '.listing-item[data-type="job"]'
];

let container = null;
for (const sel of jobSelectors) {
  const elems = $(sel);
  if (elems.length) {
    container = elems;
    break;
  }
}

if (container) {
  container.each((_, el) => {
    const elem = $(el);
    const title = elem.find('h1, h2, h3, .job-title, .title, a[href*="job"]').first().text().trim() ||
                  elem.attr('data-title') || '';

    if (!title) return; // skip if no clear title

    const job = {
      title,
      companyName: elem.find('.company, .company-name, .employer').first().text().trim() || '',
      description: elem.find('.description, .job-description, .desc').first().text().trim() || '',
      location: elem.find('.location, .job-location').first().text().trim() || '',
      jobType: (function () {
        const txt = elem.find('.job-type, .type').first().text().toLowerCase();
        if (/full\s*time/.test(txt)) return 'full_time';
        if (/part\s*time/.test(txt)) return 'part_time';
        if (/contract/.test(txt)) return 'contract';
        if (/internship/.test(txt)) return 'internship';
        if (/remote/.test(txt)) return 'remote';
        return '';
      })(),
      sourceUrl: elem.find('a[href*="job"]').first().attr('href') || '',
      postedDateIsoString: (function () {
        const dateStr = elem.find('time[datetime], .posted-date').first().attr('datetime') ||
                        elem.find('.posted-date').first().text();
        const d = new Date(dateStr);
        return isNaN(d) ? '' : d.toISOString();
      })(),
      deadlineIsoString: (function () {
        const dateStr = elem.find('.deadline, time[datetime][class*="deadline"]').first().attr('datetime') ||
                        elem.find('.deadline').first().text();
        const d = new Date(dateStr);
        return isNaN(d) ? '' : d.toISOString();
      })(),
      salaryMin: (function () {
        const txt = elem.find('.salary, .salary-range').first().text().replace(/[^0-9\-]/g, '');
        const parts = txt.split('-');
        const val = parseInt(parts[0], 10);
        return isNaN(val) ? null : val;
      })(),
      salaryMax: (function () {
        const txt = elem.find('.salary, .salary-range').first().text().replace(/[^0-9\-]/g, '');
        const parts = txt.split('-');
        const val = parts.length > 1 ? parseInt(parts[1], 10) : null;
        return isNaN(val) ? null : val;
      })(),
      salaryCurrency: (function () {
        const txt = elem.find('.salary, .salary-range').first().text();
        const match = txt.match(/[\$€£₹]/);
        return match ? match[0] : '';
      })()
    };

    result.push(job);
  });
}