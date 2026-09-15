// Identify job links that likely point to individual vacancy pages
const jobLinks = $('a[href*="/map/vacancy/"]').toArray();

jobLinks.forEach(linkElem => {
  const link = $(linkElem);
  const title = link.text().trim();
  if (!title) return; // no clear job title, skip

  // Determine a container that holds the job details
  const container = link.closest('.vacancy-item, .listing, .job-card, .panel, .well, .col-md-12, .col-sm-12')
                         .length ? link.closest('.vacancy-item, .listing, .job-card, .panel, .well, .col-md-12, .col-sm-12')
                         : link.parent();

  // Helper to clean text
  const clean = txt => txt.replace(/\s+/g, ' ').trim();

  const companyName = clean(container.find('.company, .org, .organization, .employer, .company-name').first().text() || '');
  const location = clean(container.find('.location, .city, .place, .job-location').first().text() || '');
  const description = clean(container.find('.description, .details, .job-description, p').first().text() || '');

  // Job type detection from known keywords
  const typeMap = {
    full_time: /full\s?time/i,
    part_time: /part\s?time/i,
    contract: /contract/i,
    internship: /internship/i,
    remote: /remote/i
  };
  let jobType = '';
  const lowerText = (title + ' ' + description + ' ' + location).toLowerCase();
  for (const [type, regex] of Object.entries(typeMap)) {
    if (regex.test(lowerText)) { jobType = type; break; }
  }

  // Dates
  const postedDateIsoString = container.find('time[datetime]').first().attr('datetime') || '';
  const deadlineIsoString = container.find('.deadline time[datetime]').first().attr('datetime') || '';

  // Salary extraction
  const salaryText = clean(container.find('.salary, .pay, .remuneration').first().text() || '');
  const salaryPattern = /([\d,.]+)\s*-\s*([\d,.]+)\s*([A-Z]{3}|[a-z]{3}|£|\$|€)?/i;
  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  const match = salaryPattern.exec(salaryText);
  if (match) {
    salaryMin = parseFloat(match[1].replace(/[,]/g, ''));
    salaryMax = parseFloat(match[2].replace(/[,]/g, ''));
    salaryCurrency = match[3] ? match[3].trim() : null;
  }

  // Build job object
  const job = {
    title,
    companyName,
    description,
    location,
    jobType,
    sourceUrl: link.attr('href') || '',
    postedDateIsoString,
    deadlineIsoString,
    salaryMin,
    salaryMax,
    salaryCurrency
  };

  result.push(job);
});