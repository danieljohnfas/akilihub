// Determine if the page appears to be a single job posting
let metaDesc = $('meta[name=description]').attr('content') || '';
let pageTitle = $('title').text().trim();
let isJobPage = /Job Title:/i.test(metaDesc) || /\b(at|@)\b/i.test(pageTitle);

if (isJobPage) {
  let job = {};

  // Extract canonical URL as sourceUrl
  let canonical = $('link[rel=canonical]').attr('href');
  if (canonical) job.sourceUrl = canonical.trim();

  // Try to parse structured info from meta description
  if (metaDesc) {
    let patterns = {
      title: /Job Title:\s*([^|]*?)(?:\s+Company:|$)/i,
      companyName: /Company:\s*([^|]*?)(?:\s+Job Type:|$)/i,
      jobType: /Job Type:\s*([^|]*?)(?:\s+Location:|$)/i,
      location: /Location:\s*([^|]*?)(?:\s+Category:|$)/i,
      postedDateIsoString: /Posted:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i,
      deadlineIsoString: /Deadline:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i,
      salaryMin: /Salary\s*from\s*\$?([\d,]+)/i,
      salaryMax: /Salary\s*to\s*\$?([\d,]+)/i,
      salaryCurrency: /Salary\s*currency[:\s]*([A-Z]{3})/i
    };
    for (let key in patterns) {
      let m = metaDesc.match(patterns[key]);
      if (m) {
        let value = m[1].trim();
        if (key === 'salaryMin' || key === 'salaryMax') {
          // convert to number
          value = parseInt(value.replace(/,/g, ''), 10);
          if (!isNaN(value)) job[key] = value;
        } else {
          job[key] = value;
        }
      }
    }
  }

  // Fallback: derive title and company from <title> if not already set
  if (!job.title || !job.companyName) {
    let titleMatch = pageTitle.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
    if (titleMatch) {
      if (!job.title) job.title = titleMatch[1].trim();
      if (!job.companyName) job.companyName = titleMatch[2].trim();
    }
  }

  // Description: try common article containers
  let desc = $('div.post-body, .entry-content, .post-content, article').text().trim();
  if (desc) job.description = desc;

  // Posted date from Open Graph or article meta tags
  if (!job.postedDateIsoString) {
    let pub = $('meta[property="article:published_time"]').attr('content') ||
              $('meta[name="date"]').attr('content');
    if (pub) job.postedDateIsoString = new Date(pub).toISOString();
  }

  // Standardize jobType values
  if (job.jobType) {
    let map = {
      'full time': 'full_time',
      'full-time': 'full_time',
      'part time': 'part_time',
      'part-time': 'part_time',
      'contract': 'contract',
      'internship': 'internship',
      'intern': 'internship',
      'remote': 'remote'
    };
    let normalized = job.jobType.toLowerCase().replace(/\s+/g, ' ');
    job.jobType = map[normalized] || normalized.replace(/\s+/g, '_');
  }

  // Push only if we have at least a title
  if (job.title) {
    result.push(job);
  }
}