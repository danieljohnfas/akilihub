const jobSelectors = [
  '.job',
  '.job-item',
  '.career-item',
  '.vacancy',
  '.job-listing',
  '.listing-item',
  '.position',
  '.career-opportunity',
  '.openings .item'
];

const containers = $(jobSelectors.join(','));

if (containers.length) {
  containers.each((_, el) => {
    const elem = $(el);
    const title = elem.find('h1, h2, h3, .title, .job-title, .position-title').first().text().trim() ||
                  elem.attr('data-title') || '';
    if (!title) return;

    const companyName = elem.find('.company, .company-name, .employer').first().text().trim() || '';
    const description = elem.find('.description, .job-description, .details, .summary').first().text().trim() || '';
    const location = elem.find('.location, .job-location, .place').first().text().trim() || '';
    const typeText = elem.find('.job-type, .type, .employment-type').first().text().toLowerCase();
    let jobType = '';
    if (/full\s*time/.test(typeText)) jobType = 'full_time';
    else if (/part\s*time/.test(typeText)) jobType = 'part_time';
    else if (/contract/.test(typeText)) jobType = 'contract';
    else if (/internship/.test(typeText)) jobType = 'internship';
    else if (/remote/.test(typeText)) jobType = 'remote';

    const sourceUrl = elem.find('a.apply-link, a.apply, a[href*="apply"]').first().attr('href') || '';
    const postedDate = elem.find('time.posted, .posted-date, .date-posted').first().attr('datetime') ||
                       elem.find('time.posted, .posted-date, .date-posted').first().text();
    const deadline = elem.find('time.deadline, .deadline-date, .date-deadline').first().attr('datetime') ||
                     elem.find('time.deadline, .deadline-date, .date-deadline').first().text();

    const salaryText = elem.find('.salary, .compensation').first().text();
    const salaryMatch = salaryText && salaryText.replace(/[,]/g, '').match(/([\d\.]+)\s*-\s*([\d\.]+)\s*([A-Z]{3})|([\d\.]+)\s*([A-Z]{3})/i);
    let salaryMin = null, salaryMax = null, salaryCurrency = null;
    if (salaryMatch) {
      if (salaryMatch[1] && salaryMatch[2] && salaryMatch[3]) {
        salaryMin = parseFloat(salaryMatch[1]);
        salaryMax = parseFloat(salaryMatch[2]);
        salaryCurrency = salaryMatch[3];
      } else if (salaryMatch[4] && salaryMatch[5]) {
        salaryMin = salaryMax = parseFloat(salaryMatch[4]);
        salaryCurrency = salaryMatch[5];
      }
    }

    result.push({
      title,
      companyName,
      description,
      location,
      jobType,
      sourceUrl,
      postedDateIsoString: postedDate ? new Date(postedDate).toISOString() : '',
      deadlineIsoString: deadline ? new Date(deadline).toISOString() : '',
      salaryMin,
      salaryMax,
      salaryCurrency
    });
  });
}