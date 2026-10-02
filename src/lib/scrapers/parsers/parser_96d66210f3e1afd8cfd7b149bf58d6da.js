var jobContainers = $('.job-detail, .single-job, .job-item, article.job, .career-detail, .post-job, .job-content');
jobContainers.each(function () {
  var el = $(this);
  var title = el.find('h1, h2, .title, .job-title').first().text().trim();
  if (!title) return;
  var description = el.find('.description, .job-description, .desc, p').first().text().trim();
  if (!description) description = el.text().trim();
  var company = el.find('.company, .company-name, .employer').first().text().trim();
  var location = el.find('.location, .job-location').first().text().trim();
  var typeText = el.find('.type, .job-type').first().text().toLowerCase();
  var jobType = null;
  if (/full\s?time/.test(typeText)) jobType = 'full_time';
  else if (/part\s?time/.test(typeText)) jobType = 'part_time';
  else if (/contract/.test(typeText)) jobType = 'contract';
  else if (/internship/.test(typeText)) jobType = 'internship';
  else if (/remote/.test(typeText)) jobType = 'remote';
  var posted = null;
  var postedText = el.find('.posted, .date-posted, .post-date').first().text();
  var postedMs = Date.parse(postedText);
  if (!isNaN(postedMs)) posted = new Date(postedMs).toISOString();
  var deadline = null;
  var deadlineText = el.find('.deadline, .apply-by, .closing-date').first().text();
  var deadlineMs = Date.parse(deadlineText);
  if (!isNaN(deadlineMs)) deadline = new Date(deadlineMs).toISOString();
  var salaryText = el.find('.salary, .pay, .compensation').first().text();
  var salaryMin = null,
    salaryMax = null,
    salaryCurrency = null;
  if (salaryText) {
    var curMatch = salaryText.match(/(USD|EUR|TZS|\$|£|€)\s?([\d.,]+)(?:\s?[-–]\s?(?:USD|EUR|TZS|\$|£|€)?\s?([\d.,]+))?/i);
    if (curMatch) {
      salaryCurrency = curMatch[1].replace('$', 'USD').replace('£', 'GBP').replace('€', 'EUR');
      salaryMin = parseFloat(curMatch[2].replace(/,/g, ''));
      if (curMatch[3]) salaryMax = parseFloat(curMatch[3].replace(/,/g, ''));
    }
  }
  var sourceUrl = $('meta[property="og:url"]').attr('content') || $('link[rel="canonical"]').attr('href') || '';
  result.push({
    title: title,
    companyName: company || null,
    description: description,
    location: location || null,
    jobType: jobType,
    sourceUrl: sourceUrl,
    postedDateIsoString: posted,
    deadlineIsoString: deadline,
    salaryMin: salaryMin,
    salaryMax: salaryMax,
    salaryCurrency: salaryCurrency
  });
});