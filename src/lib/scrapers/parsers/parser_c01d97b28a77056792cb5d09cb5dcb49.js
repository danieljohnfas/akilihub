var jobContainers = $('article.job, div.job, li.job, div[role="listitem"], .job-item, .posting, .career-item, .vacancy, .position');

jobContainers.each(function () {
  var el = $(this);
  var title = el.find('h1, h2, h3, .title, .job-title').first().text().trim();
  if (!title) return;

  var company = el.find('.company, .company-name').first().text().trim() || null;
  var description = el.find('.description, .job-description, p').first().text().trim() || null;
  var location = el.find('.location, .job-location').first().text().trim() || null;

  var typeText = el.find('.type, .job-type').first().text().toLowerCase().trim();
  var typeMap = {
    'full time': 'full_time',
    'full-time': 'full_time',
    'part time': 'part_time',
    'part-time': 'part_time',
    'contract': 'contract',
    'internship': 'internship',
    'remote': 'remote'
  };
  var jobType = typeMap[typeText] || null;

  var sourceUrl = null;
  var link = el.find('a[href]').first().attr('href');
  if (link) {
    try {
      sourceUrl = new URL(link, typeof window !== 'undefined' && window.location ? window.location.href : '').href;
    } catch (e) {}
  }

  var posted = el.find('time[datetime]').first().attr('datetime') || null;
  var deadline = el.find('.deadline time[datetime]').first().attr('datetime') || null;

  var salaryText = el.find('.salary').first().text().trim();
  var salaryMin = null,
    salaryMax = null,
    salaryCurrency = null;
  if (salaryText) {
    var rangeMatch = salaryText.match(/([A-Z]{3})\s?([\d,]+)\s?-\s?([\d,]+)/);
    if (rangeMatch) {
      salaryCurrency = rangeMatch[1];
      salaryMin = Number(rangeMatch[2].replace(/,/g, ''));
      salaryMax = Number(rangeMatch[3].replace(/,/g, ''));
    } else {
      var singleMatch = salaryText.match(/([A-Z]{3})\s?([\d,]+)/);
      if (singleMatch) {
        salaryCurrency = singleMatch[1];
        salaryMin = Number(singleMatch[2].replace(/,/g, ''));
        salaryMax = salaryMin;
      }
    }
  }

  result.push({
    title: title,
    companyName: company,
    description: description,
    location: location,
    jobType: jobType,
    sourceUrl: sourceUrl,
    postedDateIsoString: posted,
    deadlineIsoString: deadline,
    salaryMin: salaryMin,
    salaryMax: salaryMax,
    salaryCurrency: salaryCurrency
  });
});