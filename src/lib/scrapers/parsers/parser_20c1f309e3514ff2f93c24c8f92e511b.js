$('[data-job], .job-card, .listing, .position, [class*="job"], [class*="position"]').each(function() {
  var $container = $(this);
  
  // Extract title - prefer h2/h3/a tags, fallback to first heading
  var title = $container.find('h2, h3, h4, a').eq(0) ? $container.find('h2, h3, h4, a').text().trim() : '';
  
  // Skip if no meaningful title
  if (!title || title === '') return;
  
  // Company name - look for organization/company indicators
  var company = $container.find('.company, .org-name, .name, [class*="company"]').eq(0) ? $container.find('.company, .org-name, .name, [class*="company"]').text().trim() : '';
  
  // Description
  var desc = $container.find('.job-description, .description, p').eq(0) ? $container.find('.job-description, .description, p').text().trim() : '';
  
  // Location
  var loc = $container.find('.location, .city, .place, [class*="location"]').eq(0) ? $container.find('.location, .city, .place, [class*="location"]').text().trim() : '';
  
  // Job type inference
  var jobType = 'unknown';
  if (desc.toLowerCase().includes('remote') || desc.toLowerCase().includes('work from home')) {
    jobType = 'remote';
  } else if (desc.toLowerCase().includes('part-time') || desc.toLowerCase().includes('part time')) {
    jobType = 'part_time';
  } else if (desc.toLowerCase().includes('contract') || desc.toLowerCase().includes('contractual')) {
    jobType = 'contract';
  } else if (desc.toLowerCase().includes('internship') || desc.toLowerCase().includes('intern')) {
    jobType = 'internship';
  } else if ($container.find('.job-type')).length > 0) {
    jobType = $container.find('.job-type').text().trim().toLowerCase();
  }
  
  // Source URL
  var url = $container.find('a[href]').eq(0) ? $container.find('a[href]').attr('href') : '';
  
  // Posted date
  var postedDate = $container.find('.posted-date, .date, .published, [class*="date"]').eq(0) ? $container.find('.posted-date, .date, .published, [class*="date"]').text().trim() : '';
  
  // Deadline
  var deadline = $container.find('.deadline, .end-date, .due, [class*="deadline"]').eq(0) ? $container.find('.deadline, .end-date, .due, [class*="deadline"]').text().trim() : '';
  
  // Salary information
  var salaryText = $container.find('.salary, .compensation, .pay, [class*="salary"]').eq(0) ? $container.find('.salary, .compensation, .pay, [class*="salary"]').text().trim() : '';
  
  // Parse salary numbers safely
  var salaryMin = parseFloat(salaryText.replace(/[^0-9.-]/g, '')) || 0;
  var salaryMax = parseFloat(salaryText.replace(/[^0-9.-]/g, '')) || 0;
  var currency = '$' || 'USD' || 'TZS';
  
  // Build job object with all required keys
  var job = {
    title: title,
    companyName: company,
    description: desc,
    location: loc,
    jobType: jobType,
    sourceUrl: url,
    postedDateIsoString: postedDate,
    deadlineIsoString: deadline,
    salaryMin: salaryMin,
    salaryMax: salaryMax,
    salaryCurrency: currency
  };
  
  result.push(job);
});