const jobs = $('.job-card, .job-listing, .career-item, article.job, .job-posting');
jobs.each((i, el) => {
  const job = $(el);
  const title = job.find('h1, h2, h3, .job-title, .title').first().text().trim();
  if (!title) return;
  const companyName = job.find('.company, .company-name, .employer').first().text().trim() || 
                      $('title').text().split(' - ')[0].trim() ||
                      $('meta[property="og:site_name"]').attr('content') || '';
  const description = job.find('.description, .job-description, .details').first().text().trim();
  const location = job.find('.location, .job-location, .city').first().text().trim();
  const jobTypeText = job.find('.job-type, .type, .employment-type').first().text().trim().toLowerCase();
  let jobType = 'full_time';
  if (jobTypeText.includes('part') || jobTypeText.includes('part-time')) jobType = 'part_time';
  else if (jobTypeText.includes('contract')) jobType = 'contract';
  else if (jobTypeText.includes('internship')) jobType = 'internship';
  else if (jobTypeText.includes('remote')) jobType = 'remote';
  const sourceUrl = job.find('a').attr('href') || 
                    $('link[rel="canonical"]').attr('href') ||
                    $('meta[property="og:url"]').attr('content') || '';
  const postedDateText = job.find('.posted-date, .date-posted, .pubdate').first().text().trim();
  let postedDateIsoString = '';
  if (postedDateText) {
    const parsed = Date.parse(postedDateText);
    if (!isNaN(parsed)) postedDateIsoString = new Date(parsed).toISOString();
  }
  const deadlineText = job.find('.deadline, .apply-by, .close-date').first().text().trim();
  let deadlineIsoString = '';
  if (deadlineText) {
    const parsed = Date.parse(deadlineText);
    if (!isNaN(parsed)) deadlineIsoString = new Date(parsed).toISOString();
  }
  const salaryText = job.find('.salary, .salary-min, .salary-max, . compensation').first().text().trim();
  let salaryMin = 0, salaryMax = 0, salaryCurrency = '';
  if (salaryText) {
    const match = salaryText.match(/([₤$€₩₴₺₵₡₦₴₫₭₪₴₵₠₡₢₣₤₥₯₰₱₲₳₴₵₶₷₸₹₺₻]/g);
    salaryCurrency = match ? match[0] : 'USD';
    const nums = salaryText.match(/\d[\d,]*/g);
    if (nums) {
      salaryMin = parseInt(nums[0].replace(/,/g, ''), 10) || 0;
      if (nums.length > 1) salaryMax = parseInt(nums[1].replace(/,/g, ''), 10) || salaryMin;
      else salaryMax = salaryMin;
    }
  }
  result.push({ title, companyName, description, location, jobType, sourceUrl, postedDateIsoString, deadlineIsoString, salaryMin, salaryMax, salaryCurrency });
});