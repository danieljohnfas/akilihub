// Extract JobPosting data from JSON‑LD scripts
$('script[type="application/ld+json"]').each((_, el) => {
  let data;
  try {
    data = JSON.parse($(el).contents().first().text());
  } catch (e) {
    return;
  }
  const items = Array.isArray(data) ? data : [data];
  items.forEach(item => {
    if (!item || (item['@type'] !== 'JobPosting' && !(Array.isArray(item['@type']) && item['@type'].includes('JobPosting')))) return;
    const job = {};
    job.title = item.title || item.name || '';
    if (item.hiringOrganization && item.hiringOrganization.name) job.companyName = item.hiringOrganization.name;
    if (item.description) job.description = item.description;
    if (item.jobLocation && item.jobLocation.address) {
      const addr = item.jobLocation.address;
      const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
      job.location = parts.join(', ');
    }
    if (item.employmentType) {
      const map = { FULL_TIME: 'full_time', PART_TIME: 'part_time', CONTRACT: 'contract', INTERNSHIP: 'internship', TEMPORARY: 'contract', REMOTE: 'remote' };
      const typeKey = Array.isArray(item.employmentType) ? item.employmentType[0] : item.employmentType;
      job.jobType = map[typeKey.toUpperCase()] || typeKey.toLowerCase();
    }
    if (item.sameAs) job.sourceUrl = item.sameAs;
    else if (item.url) job.sourceUrl = item.url;
    if (item.datePosted) job.postedDateIsoString = item.datePosted;
    if (item.validThrough) job.deadlineIsoString = item.validThrough;
    if (item.baseSalary) {
      const salary = item.baseSalary;
      if (salary.currency) job.salaryCurrency = salary.currency;
      if (salary.value) {
        if (salary.value.minValue != null) job.salaryMin = Number(salary.value.minValue);
        if (salary.value.maxValue != null) job.salaryMax = Number(salary.value.maxValue);
        if (salary.value.unitText) {
          // ignore unitText for now
        }
      } else if (salary.minValue != null || salary.maxValue != null) {
        if (salary.minValue != null) job.salaryMin = Number(salary.minValue);
        if (salary.maxValue != null) job.salaryMax = Number(salary.maxValue);
        if (salary.currency) job.salaryCurrency = salary.currency;
      }
    }
    result.push(job);
  });
});

// Fallback DOM extraction if no JSON‑LD jobs were found
if (result.length === 0) {
  const containers = $('.job-card, .job-item, .vacancy, .listing-item, .post, .job-listing, .search-result, .grid > div, .col-md-4 .p-4');
  containers.each((_, el) => {
    const $c = $(el);
    const titleEl = $c.find('a[href][title], a[href] > h2, a[href] > h3, h2, h3, .job-title, .title').first();
    const title = titleEl.text().trim();
    if (!title) return;
    const job = { title };
    const link = titleEl.is('a') ? titleEl.attr('href') : $c.find('a[href]').first().attr('href');
    if (link) job.sourceUrl = link;
    const company = $c.find('.company, .employer, .job-company, .org-name').first().text().trim();
    if (company) job.companyName = company;
    const location = $c.find('.location, .job-location, .place').first().text().trim();
    if (location) job.location = location;
    const desc = $c.find('.description, .job-summary, p').first().text().trim();
    if (desc) job.description = desc;
    const type = $c.find('.type, .job-type, .employment-type').first().text().trim().toLowerCase();
    if (type) {
      const map = { fulltime: 'full_time', parttime: 'part_time', contract: 'contract', internship: 'internship', remote: 'remote' };
      job.jobType = map[type.replace(/\s+/g, '')] || type;
    }
    const posted = $c.find('[data-posted], .posted, .date-posted').first().attr('datetime') || $c.find('.posted, .date-posted').first().text().trim();
    if (posted) {
      const iso = new Date(posted).toISOString();
      if (!isNaN(Date.parse(iso))) job.postedDateIsoString = iso;
    }
    const deadline = $c.find('[data-deadline], .deadline, .date-deadline').first().attr('datetime') || $c.find('.deadline, .date-deadline').first().text().trim();
    if (deadline) {
      const iso = new Date(deadline).toISOString();
      if (!isNaN(Date.parse(iso))) job.deadlineIsoString = iso;
    }
    const salaryText = $c.find('.salary, .pay, .compensation').first().text().trim();
    if (salaryText) {
      const m = salaryText.replace(/,/g, '').match(/([A-Z]{3})?\s?(\d+(?:\.\d+)?)(?:\s*-\s*([A-Z]{3})?\s?(\d+(?:\.\d+)?))?/i);
      if (m) {
        if (m[1]) job.salaryCurrency = m[1].toUpperCase();
        job.salaryMin = Number(m[2]);
        if (m[4]) {
          job.salaryMax = Number(m[4]);
          if (!job.salaryCurrency && m[3]) job.salaryCurrency = m[3].toUpperCase();
        }
      }
    }
    result.push(job);
  });
}