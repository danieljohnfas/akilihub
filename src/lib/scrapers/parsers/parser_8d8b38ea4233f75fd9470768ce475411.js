const jobContainers = $('.job, .job-item, .listing, .vacancy, .post, .career-item');
if (jobContainers.length) {
  jobContainers.each((_, elem) => {
    const container = $(elem);
    const title = (container.find('h1, h2, .title, .job-title, .post-title').first().text() || '').trim();
    if (!title) return;
    const companyName = (container.find('.company, .company-name, .employer, .org-name').first().text() || '').trim();
    const description = (container.find('.description, .job-description, .desc, .content').first().text() || '').trim();
    const location = (container.find('.location, .job-location, .place').first().text() || '').trim();

    const typeText = (container.find('.type, .job-type, .employment-type').first().text() || '').toLowerCase();
    let jobType = '';
    if (/full[\s-]?time/.test(typeText)) jobType = 'full_time';
    else if (/part[\s-]?time/.test(typeText)) jobType = 'part_time';
    else if (/contract/.test(typeText)) jobType = 'contract';
    else if (/internship/.test(typeText)) jobType = 'internship';
    else if (/remote/.test(typeText)) jobType = 'remote';

    const sourceUrl = (container.find('a.apply-link, a.apply, a[href*="apply"]').attr('href') || '').trim();

    const postedRaw = (container.find('.posted, .date-posted, .post-date').first().text() || '').trim();
    const postedDateIsoString = postedRaw ? new Date(postedRaw).toISOString() : '';

    const deadlineRaw = (container.find('.deadline, .apply-by, .closing-date').first().text() || '').trim();
    const deadlineIsoString = deadlineRaw ? new Date(deadlineRaw).toISOString() : '';

    const salaryText = (container.find('.salary, .pay, .compensation').first().text() || '').replace(/\s+/g, ' ');
    let salaryMin = null;
    let salaryMax = null;
    let salaryCurrency = null;
    if (salaryText) {
      const currencyMatch = salaryText.match(/([\p{Sc}€£¥])/u);
      if (currencyMatch) salaryCurrency = currencyMatch[1];
      const numbers = salaryText.match(/[\d,.]+/g);
      if (numbers && numbers.length) {
        const nums = numbers.map(n => parseFloat(n.replace(/[,]/g, '')));
        if (nums.length === 1) {
          salaryMin = salaryMax = nums[0];
        } else if (nums.length >= 2) {
          salaryMin = Math.min(...nums);
          salaryMax = Math.max(...nums);
        }
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