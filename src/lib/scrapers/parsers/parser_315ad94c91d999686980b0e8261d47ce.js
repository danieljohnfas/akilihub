let jobSelectors = '.job,.job-item,.vacancy,.position,.career-item,.listing-item,.job-listing';
let jobs = $(jobSelectors);
if (jobs.length) {
  jobs.each(function () {
    const container = $(this);
    let title = container.find('h1, h2, h3, a').first().text().trim();
    if (!title) title = container.attr('title') ? container.attr('title').trim() : '';
    if (!title) return;
    let companyName = container.find('.company,.company-name').first().text().trim();
    let description = container.find('.description,.job-description,p').first().text().trim();
    let location = container.find('.location').first().text().trim();
    let jobTypeText = container.find('.job-type,.type').first().text().toLowerCase();
    let jobType = '';
    if (jobTypeText.includes('full')) jobType = 'full_time';
    else if (jobTypeText.includes('part')) jobType = 'part_time';
    else if (jobTypeText.includes('contract')) jobType = 'contract';
    else if (jobTypeText.includes('intern')) jobType = 'internship';
    else if (jobTypeText.includes('remote')) jobType = 'remote';
    let sourceUrl = $('meta[property="og:url"]').attr('content') || '';
    let postedDateIsoString = $('meta[property="article:published_time"]').attr('content') || '';
    let deadlineIsoString = $('meta[property="article:modified_time"]').attr('content') || '';
    let salaryText = container.find('.salary').first().text();
    let salaryMin = null,
        salaryMax = null,
        salaryCurrency = null;
    if (salaryText) {
      let cleaned = salaryText.replace(/,/g, '');
      let match = cleaned.match(/([A-Za-z$£€]+)?\s*([0-9]+)(?:\s*[-–]\s*([0-9]+))?/);
      if (match) {
        salaryCurrency = match[1] ? match[1].trim() : null;
        salaryMin = Number(match[2]) || null;
        salaryMax = match[3] ? Number(match[3]) : null;
      }
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