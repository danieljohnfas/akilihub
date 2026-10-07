const ldScripts = $('script[type="application/ld+json"]');
ldScripts.each((i, el) => {
  try {
    const data = JSON.parse($(el).contents().text());
    const items = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : [data]);
    items.forEach(item => {
      const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
      if (types.includes('JobPosting')) {
        const job = {};
        job.title = item.title || item.headline || item.name || '';
        const org = item.hiringOrganization || {};
        job.companyName = org.name || '';
        job.description = item.description || '';
        if (item.jobLocation && item.jobLocation[0] && item.jobLocation[0].address) {
          const addr = item.jobLocation[0].address;
          job.location = addr.addressLocality ? addr.addressLocality + (addr.addressRegion ? ', ' + addr.addressRegion : '') : '';
        }
        const typeMap = {fulltime:'full_time',parttime:'part_time',contract:'contract',internship:'internship',temporary:'contract',remote:'remote'};
        if (item.employmentType) {
          const emp = Array.isArray(item.employmentType) ? item.employmentType[0] : item.employmentType;
          const key = emp.replace(/\s/g, '').toLowerCase();
          job.jobType = typeMap[key] || key;
        }
        const urlMeta = $('meta[property="og:url"]').attr('content') || $('link[rel="canonical"]').attr('href') || '';
        job.sourceUrl = urlMeta;
        job.postedDateIsoString = item.datePosted || '';
        job.deadlineIsoString = item.validThrough || '';
        if (item.baseSalary && item.baseSalary.value) {
          const sal = item.baseSalary.value;
          job.salaryMin = sal.minValue ? Number(sal.minValue) : (sal.value ? Number(sal.value) : undefined);
          job.salaryMax = sal.maxValue ? Number(sal.maxValue) : (sal.value ? Number(sal.value) : undefined);
          job.salaryCurrency = sal.currency || '';
        }
        result.push(job);
      }
    });
  } catch (e) {}
});
if (result.length === 0) {
  const titleText = $('h1').first().text().trim() || $('title').text().trim();
  if (titleText && /job|vacancy|position|opening|role/i.test(titleText)) {
    const job = { title: titleText };
    const desc = $('.entry-content, .post-content, .job-description').text().trim();
    if (desc) job.description = desc;
    const company = $('.company-name, .company, .org').first().text().trim();
    if (company) job.companyName = company;
    const location = $('.job-location, .location').first().text().trim();
    if (location) job.location = location;
    const type = $('.employment-type, .job-type').first().text().trim().toLowerCase();
    if (type) {
      const map = { fulltime: 'full_time', parttime: 'part_time', contract: 'contract', internship: 'internship', remote: 'remote' };
      job.jobType = map[type.replace(/\s/g, '')] || type;
    }
    const url = $('meta[property="og:url"]').attr('content') || $('link[rel="canonical"]').attr('href') || '';
    if (url) job.sourceUrl = url;
    const posted = $('meta[property="article:published_time"]').attr('content') || '';
    if (posted) job.postedDateIsoString = posted;
    result.push(job);
  }
}