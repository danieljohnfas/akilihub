let jobTitle = ($('h1').first().text().trim() || $('title').text().trim()).replace(/\\s+\\|\\s+.*$/,'');

if (jobTitle) {
  let job = {title: jobTitle};

  let company = $('[class*="company"], .employer, .client-name').first().text().trim();
  if (company) job.companyName = company;

  let desc = $('[class*="description"], #description, .job-description, .description').first().text().trim();
  if (desc) job.description = desc;

  let loc = $('[class*="location"], .job-location, .location').first().text().trim();
  if (loc) job.location = loc;

  let typeText = ($('[class*="type"], .job-type, .type').first().text().toLowerCase() || '').trim();
  if (typeText) {
    if (/full\\s?time/.test(typeText)) job.jobType = 'full_time';
    else if (/part\\s?time/.test(typeText)) job.jobType = 'part_time';
    else if (/contract/.test(typeText)) job.jobType = 'contract';
    else if (/internship/.test(typeText)) job.jobType = 'internship';
    else if (/remote/.test(typeText)) job.jobType = 'remote';
  }

  let src = $('link[rel="canonical"]').attr('href') || $('meta[property="og:url"]').attr('content');
  if (src) job.sourceUrl = src;

  let posted = $('time[datetime]').first().attr('datetime') || $('meta[property="article:published_time"]').attr('content');
  if (posted) job.postedDateIsoString = new Date(posted).toISOString();

  let deadline = $('meta[property="article:expiration_time"]').attr('content');
  if (deadline) job.deadlineIsoString = new Date(deadline).toISOString();

  let salaryText = ($('[class*="salary"], .pay, .budget, .salary').first().text() || '').replace(/,/g,'');
  if (salaryText) {
    let nums = salaryText.match(/\\d+(?:\\.\\d+)?/g);
    if (nums) {
      if (nums.length >= 2) {
        job.salaryMin = Number(nums[0]);
        job.salaryMax = Number(nums[1]);
      } else if (nums.length === 1) {
        job.salaryMin = job.salaryMax = Number(nums[0]);
      }
    }
    let curMatch = salaryText.match(/([A-Z]{3}|\\$)/);
    if (curMatch) {
      job.salaryCurrency = curMatch[1] === '$' ? 'USD' : curMatch[1];
    }
  }

  result.push(job);
}