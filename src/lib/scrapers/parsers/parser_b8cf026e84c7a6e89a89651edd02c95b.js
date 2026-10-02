// Extract basic fields
let title = $('meta[property="og:title"]').attr('content')?.trim() || $('title').text().trim();
let sourceUrl = $('meta[property="og:url"]').attr('content')?.trim() || '';
let description = $('meta[name="description"]').attr('content')?.trim() || '';
let posted = $('meta[property="article:published_time"]').attr('content')?.trim() || '';
let deadline = $('meta[property="article:expiration_time"]').attr('content')?.trim() || '';

// Derive company name from title if pattern "Job Title - Company"
let companyName = '';
if (title && title.includes(' - ')) {
  const parts = title.split(' - ');
  title = parts[0].trim();
  companyName = parts.slice(1).join(' - ').trim();
}

// Additional optional fields
let location = $('[data-test="job-location"], .job-location, .location').first().text().trim() || '';
let jobTypeRaw = $('[data-test="job-type"], .job-type').first().text().trim() || '';
let jobTypeMap = {
  'full time': 'full_time',
  'full-time': 'full_time',
  'part time': 'part_time',
  'part-time': 'part_time',
  'contract': 'contract',
  'internship': 'internship',
  'intern': 'internship',
  'remote': 'remote'
};
let jobType = jobTypeMap[jobTypeRaw.toLowerCase()] || '';

// Salary extraction (basic)
let salaryText = $('[data-test="salary"], .salary, .compensation').first().text().trim() || '';
let salaryMin, salaryMax, salaryCurrency;
if (salaryText) {
  // Find currency symbol and numbers
  let currencyMatch = salaryText.match(/[\$£€¥]/);
  salaryCurrency = currencyMatch ? currencyMatch[0] : undefined;
  let numbers = salaryText.match(/[\d,]+/g);
  if (numbers && numbers.length) {
    salaryMin = parseInt(numbers[0].replace(/,/g, ''), 10);
    if (numbers.length > 1) {
      salaryMax = parseInt(numbers[1].replace(/,/g, ''), 10);
    } else {
      salaryMax = salaryMin;
    }
  }
}

// Build job object only if a clear title exists
if (title) {
  const job = {
    title,
    sourceUrl,
    description,
    postedDateIsoString: posted,
    deadlineIsoString: deadline
  };
  if (companyName) job.companyName = companyName;
  if (location) job.location = location;
  if (jobType) job.jobType = jobType;
  if (salaryCurrency) job.salaryCurrency = salaryCurrency;
  if (salaryMin !== undefined) job.salaryMin = salaryMin;
  if (salaryMax !== undefined) job.salaryMax = salaryMax;

  result.push(job);
}