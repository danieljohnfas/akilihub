// Determine if the page is a job posting
let isJobPage = false;
let jobTitle = $('meta[property="og:title"]').attr('content') || $('title').text();
if (jobTitle && /Jobs in/.test(jobTitle)) {
  isJobPage = true;
}

// Fallback check for typical job-detail containers
if (!isJobPage) {
  if ($('.job-title, .job-header, .detail-job, .job-detail').length) {
    isJobPage = true;
  }
}

// If not a job posting, leave result empty
if (!isJobPage) {
  // no jobs to extract
} else {
  // Extract basic fields
  const titleMeta = $('meta[property="og:title"]').attr('content') || '';
  const url = $('meta[property="og:url"]').attr('content') || '';
  const descriptionMeta = $('meta[property="og:description"]').attr('content') || '';
  const descriptionSel = $('.job-description, .description, #job-description').text().trim();
  const description = descriptionSel || descriptionMeta || '';

  // Parse title, company, location from the og:title when possible
  let title = '';
  let companyName = '';
  let location = '';

  const titlePattern = /^(.*?)\s+Jobs in\s+(.*?)\s+in\s+(.*?)\s*[-|–]/i;
  const titleMatch = titleMeta.match(titlePattern);
  if (titleMatch) {
    title = titleMatch[1].trim();
    companyName = titleMatch[2].trim();
    location = titleMatch[3].trim();
  } else {
    // Fallback: use first heading that looks like a title
    title = $('.job-title, h1, .title, .detail-job h1').first().text().trim() || titleMeta.split(' Jobs in')[0].trim();
    companyName = $('.company-name, .employer, .company').first().text().trim();
    location = $('.job-location, .location').first().text().trim();
  }

  // Job type detection
  const pageText = $.root().text().toLowerCase();
  let jobType = '';
  if (/\bfull\s*time\b/.test(pageText)) jobType = 'full_time';
  else if (/\bpart\s*time\b/.test(pageText)) jobType = 'part_time';
  else if (/\bcontract\b/.test(pageText)) jobType = 'contract';
  else if (/\binternship\b/.test(pageText)) jobType = 'internship';
  else if (/\bremote\b/.test(pageText)) jobType = 'remote';

  // Posted date
  let postedDateIsoString = $('meta[property="article:published_time"]').attr('content') || '';
  if (!postedDateIsoString) {
    const postedText = $('.posted-date, .date-posted, time[datetime]').first().attr('datetime') || $('.posted-date, .date-posted').first().text();
    if (postedText) {
      const d = new Date(postedText);
      if (!isNaN(d)) postedDateIsoString = d.toISOString();
    }
  }

  // Deadline
  let deadlineIsoString = '';
  const deadlineText = $('.deadline, .apply-deadline').first().text();
  if (deadlineText) {
    const d = new Date(deadlineText);
    if (!isNaN(d)) deadlineIsoString = d.toISOString();
  }

  // Salary extraction
  let salaryMin = null;
  let salaryMax = null;
  let salaryCurrency = null;
  const salaryText = $('.salary, .compensation, .pay-range').first().text();
  if (salaryText) {
    const salaryRegex = /([A-Z]{3}|[$€£])?\s*([\d.,]+)\s*(?:-|\sto\s)\s*([A-Z]{3}|[$€£])?\s*([\d.,]+)/;
    const match = salaryText.replace(/\s+/g, ' ').match(salaryRegex);
    if (match) {
      salaryCurrency = match[1] || match[3] || null;
      salaryMin = parseFloat(match[2].replace(/[,]/g, ''));
      salaryMax = parseFloat(match[4].replace(/[,]/g, ''));
    } else {
      // single value salary
      const singleRegex = /([A-Z]{3}|[$€£])\s*([\d.,]+)/;
      const singleMatch = salaryText.match(singleRegex);
      if (singleMatch) {
        salaryCurrency = singleMatch[1];
        salaryMin = salaryMax = parseFloat(singleMatch[2].replace(/[,]/g, ''));
      }
    }
  }

  // Assemble job object
  const job = {
    title: title || '',
    companyName: companyName || '',
    description: description || '',
    location: location || '',
    jobType: jobType || '',
    sourceUrl: url || '',
    postedDateIsoString: postedDateIsoString || '',
    deadlineIsoString: deadlineIsoString || '',
    salaryMin: salaryMin,
    salaryMax: salaryMax,
    salaryCurrency: salaryCurrency || ''
  };

  // Clean undefined/null numeric fields
  if (job.salaryMin === null) delete job.salaryMin;
  if (job.salaryMax === null) delete job.salaryMax;
  if (!job.salaryCurrency) delete job.salaryCurrency;

  result.push(job);
}