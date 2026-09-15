let title = ($('meta[property="og:title"]').attr('content') || '').trim() || $('h1').first().text().trim();
if (!title) {
  // No clear job title found; leave result empty
} else {
  let description = $('.entry-content').text().trim() || $('article').text().trim() || '';
  let metaDesc = $('meta[property="og:description"]').attr('content') || '';
  if (!description && metaDesc) description = metaDesc.trim();

  let companyName = '';
  // Try to extract company name from description using common pattern "at CompanyName"
  let companyMatch = description.match(/at\s+([A-Z][\w\s&\-\.,']+)/i);
  if (companyMatch) companyName = companyMatch[1].trim();

  // Fallback: look for "Company:" label
  if (!companyName) {
    let compLabel = description.match(/Company\s*[:\-]\s*([^\n\r]+)/i);
    if (compLabel) companyName = compLabel[1].trim();
  }

  let location = '';
  let locMatch = description.match(/Location\s*[:\-]\s*([^\n\r]+)/i);
  if (locMatch) location = locMatch[1].trim();

  let jobType = '';
  let typeMap = {
    'full time': 'full_time',
    'full-time': 'full_time',
    'part time': 'part_time',
    'part-time': 'part_time',
    'contract': 'contract',
    'internship': 'internship',
    'intern': 'internship',
    'remote': 'remote'
  };
  for (let key in typeMap) {
    let re = new RegExp('\\b' + key + '\\b', 'i');
    if (re.test(description)) {
      jobType = typeMap[key];
      break;
    }
  }

  let sourceUrl = $('link[rel="canonical"]').attr('href') || '';

  let postedDateIsoString = $('meta[property="article:published_time"]').attr('content') || '';

  let deadlineIsoString = $('meta[property="article:expiration_time"]').attr('content') || '';

  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  let salaryMatch = description.match(/([\$€£])\s?([\d,]+)(?:\s?-\s?([\$€£])?\s?([\d,]+))?/);
  if (salaryMatch) {
    salaryCurrency = salaryMatch[1];
    salaryMin = parseInt(salaryMatch[2].replace(/,/g, ''), 10);
    if (salaryMatch[3] && salaryMatch[4]) {
      salaryCurrency = salaryMatch[3] || salaryCurrency;
      salaryMax = parseInt(salaryMatch[4].replace(/,/g, ''), 10);
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
}