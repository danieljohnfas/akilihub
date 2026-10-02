const containers = $('.node--type-vacancy, .vacancy-announcement, .job-listing, article, .view-content .node');
containers.each((_, el) => {
  const c = $(el);
  const title = c.find('h1, h2, .field--name-title, .title').first().text().trim();
  if (!title) return;
  const description = c.find('.field--name-body, .content, p')
    .map((i, p) => $(p).text().trim())
    .get()
    .join('\n')
    .trim();
  const fullText = c.text();
  let location = '';
  let jobType = '';
  let postedDateIsoString = '';
  let deadlineIsoString = '';
  let salaryMin, salaryMax, salaryCurrency;
  const locMatch = fullText.match(/Location[:\s]+([A-Za-z0-9 ,.-]+)/i);
  if (locMatch) location = locMatch[1].trim();
  const typeMatch = fullText.match(/Job\s*Type[:\s]+(Full[- ]?Time|Part[- ]?Time|Contract|Internship|Remote)/i);
  if (typeMatch) jobType = typeMatch[1].toLowerCase().replace(/\s+/g, '_');
  const postedMatch = fullText.match(/Posted[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  if (postedMatch) {
    const d = new Date(postedMatch[1]);
    if (!isNaN(d)) postedDateIsoString = d.toISOString();
  }
  const deadlineMatch = fullText.match(/Deadline[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  if (deadlineMatch) {
    const d = new Date(deadlineMatch[1]);
    if (!isNaN(d)) deadlineIsoString = d.toISOString();
  }
  const salaryMatch = fullText.match(/Salary[:\s]+(?:([A-Z]{3})\s*)?([\d,]+)(?:\s*-\s*(?:([A-Z]{3})\s*)?([\d,]+))?/i);
  if (salaryMatch) {
    salaryCurrency = salaryMatch[1] || salaryMatch[3] || '';
    salaryMin = parseInt(salaryMatch[2].replace(/,/g, ''), 10);
    if (salaryMatch[4]) salaryMax = parseInt(salaryMatch[4].replace(/,/g, ''), 10);
  }
  const sourceUrl = $('link[rel="canonical"]').attr('href') || '';
  result.push({
    title,
    companyName: 'University of Dar es Salaam',
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