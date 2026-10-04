const possibleSelectors = ['.job','.job-listing','.vacancy','.posting','article.job','li.job-item','[data-job]','.career-item'];
const jobs = $(possibleSelectors.join(','));
if (jobs.length) {
  jobs.each(function () {
    const el = $(this);
    const title = el.find('h1,h2,h3,.title,.job-title').first().text().trim();
    if (!title) return;
    const company = el.find('.company,.company-name').first().text().trim() || null;
    const description = el.find('.description,.job-description,p').first().text().trim() || null;
    const location = el.find('.location,.job-location').first().text().trim() || null;
    const typeRaw = el.find('.type,.job-type').first().text().trim().toLowerCase();
    const typeMap = {
      'full time': 'full_time',
      'full-time': 'full_time',
      'part time': 'part_time',
      'part-time': 'part_time',
      contract: 'contract',
      internship: 'internship',
      remote: 'remote'
    };
    const jobType = typeMap[typeRaw] || null;
    const sourceUrl = el.find('a').first().attr('href') || null;
    const posted = el.find('time[datetime]').first().attr('datetime') || null;
    const deadline = el.find('.deadline time[datetime]').first().attr('datetime') || null;
    const salaryText = el.find('.salary').first().text().trim();
    let salaryMin = null,
        salaryMax = null,
        salaryCurrency = null;
    if (salaryText) {
      const m = salaryText.match(/([A-Za-z$€£]+)?\s*([\d,]+)\s*(?:-|\s+to\s+)\s*([A-Za-z$€£]+)?\s*([\d,]+)/);
      if (m) {
        salaryCurrency = (m[1] || m[3] || null);
        salaryMin = Number(m[2].replace(/,/g, ''));
        salaryMax = Number(m[4].replace(/,/g, ''));
      }
    }
    result.push({
      title,
      companyName: company,
      description,
      location,
      jobType,
      sourceUrl,
      postedDateIsoString: posted,
      deadlineIsoString: deadline,
      salaryMin,
      salaryMax,
      salaryCurrency
    });
  });
}