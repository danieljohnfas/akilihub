const baseUrl = ($('meta[property="og:url"]').attr('content') || '').replace(/\/+$/, '');
const jobContainers = $('.job-card, .jobItem, .job, .listing, .card, .job-listing, .cR.d');
jobContainers.each((_, elem) => {
  const $elem = $(elem);
  let title = $elem.find('h1 a, h2 a, h3 a, h4 a, h1, h2, h3, h4').first().text().trim();
  if (!title) return;
  const link = $elem.find('h1 a, h2 a, h3 a, h4 a').first().attr('href');
  const sourceUrl = link ? (link.startsWith('http') ? link : `${baseUrl}/${link.replace(/^\/+/, '')}`) : '';
  const companyName = $elem.find('.company, .company-name, .employer, .cR__company').first().text().trim() ||
                      $elem.find('[data-company]').attr('data-company') || '';
  const location = $elem.find('.location, .job-location, .cR__location').first().text().trim() || '';
  const description = $elem.find('.description, .job-description, .cR__description').first().text().trim() || '';
  const typeText = $elem.find('.job-type, .type, .cR__type').first().text().toLowerCase();
  let jobType = '';
  if (/full[-\s]?time/.test(typeText)) jobType = 'full_time';
  else if (/part[-\s]?time/.test(typeText)) jobType = 'part_time';
  else if (/contract/.test(typeText)) jobType = 'contract';
  else if (/internship|intern/.test(typeText)) jobType = 'internship';
  else if (/remote/.test(typeText)) jobType = 'remote';
  const postedText = $elem.find('.posted, .date-posted, time[datetime]').first().attr('datetime') ||
                     $elem.find('.posted, .date-posted').first().text();
  const postedDateIsoString = postedText ? new Date(postedText).toISOString() : '';
  const deadlineText = $elem.find('.deadline, .date-deadline, time[datetime][data-deadline]').first().attr('datetime') ||
                       $elem.find('.deadline, .date-deadline').first().text();
  const deadlineIsoString = deadlineText ? new Date(deadlineText).toISOString() : '';
  const salaryText = $elem.find('.salary, .compensation, .cR__salary').first().text();
  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  if (salaryText) {
    const currencyMatch = salaryText.match(/[$€£¥]/);
    if (currencyMatch) salaryCurrency = currencyMatch[0];
    const numbers = salaryText.replace(/[^0-9.,-]+/g, '').split(/[-–to]/i).map(n => parseFloat(n.replace(/,/g, '').trim()));
    if (numbers.length === 2) {
      salaryMin = numbers[0];
      salaryMax = numbers[1];
    } else if (numbers.length === 1) {
      salaryMin = salaryMax = numbers[0];
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
});