// Identify possible job containers using common selectors
var jobSelectors = [
  '.job', '.job-item', '.job-listing', '[data-job-id]', '.posting', '.career-item',
  '[class*="job"]', '[id*="job"]'
];
var jobContainers = $(jobSelectors.join(',')).filter(function () {
  // Ensure the element has a visible title-like text
  var txt = $(this).text().trim();
  return txt.length > 0 && /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(txt);
});

if (jobContainers.length === 0) {
  // No recognizable job listings; leave result empty
} else {
  jobContainers.each(function () {
    var elem = $(this);
    // Title
    var title = elem.find('h1, h2, h3, .title, .job-title, a').first().text().trim() ||
                elem.attr('data-title') || '';
    if (!title) return; // skip if no title

    // Company
    var companyName = elem.find('.company, .company-name, .employer').first().text().trim() ||
                      elem.attr('data-company') || '';

    // Description
    var description = elem.find('.description, .job-description, p').first().text().trim() || '';

    // Location
    var location = elem.find('.location, .job-location, .city').first().text().trim() || '';

    // Job Type
    var typeText = elem.find('.type, .job-type, .employment-type').first().text().toLowerCase().trim();
    var jobTypeMap = {
      'full time': 'full_time',
      'full-time': 'full_time',
      'part time': 'part_time',
      'part-time': 'part_time',
      'contract': 'contract',
      'internship': 'internship',
      'intern': 'internship',
      'remote': 'remote'
    };
    var jobType = jobTypeMap[typeText] || '';

    // Source URL
    var sourceUrl = elem.find('a').first().attr('href') || '';

    // Posted date
    var postedDateIsoString = '';
    var postedAttr = elem.find('time[datetime]').first().attr('datetime');
    if (postedAttr) {
      var d = new Date(postedAttr);
      if (!isNaN(d)) postedDateIsoString = d.toISOString();
    } else {
      var postedText = elem.find('.posted, .date-posted').first().text();
      var d2 = Date.parse(postedText);
      if (!isNaN(d2)) postedDateIsoString = new Date(d2).toISOString();
    }

    // Deadline
    var deadlineIsoString = '';
    var deadlineAttr = elem.find('time[deadline], time[datetime][class*=deadline]').first().attr('datetime');
    if (deadlineAttr) {
      var d3 = new Date(deadlineAttr);
      if (!isNaN(d3)) deadlineIsoString = d3.toISOString();
    }

    // Salary
    var salaryMin = null, salaryMax = null, salaryCurrency = '';
    var salaryText = elem.find('.salary, .compensation').first().text().replace(/,/g, '').trim();
    if (salaryText) {
      var currencyMatch = salaryText.match(/^[^\d]+/);
      if (currencyMatch) salaryCurrency = currencyMatch[0].trim();
      var numbers = salaryText.match(/(\d+(?:\.\d+)?)/g);
      if (numbers) {
        if (numbers.length === 1) {
          salaryMin = salaryMax = parseFloat(numbers[0]);
        } else if (numbers.length >= 2) {
          salaryMin = parseFloat(numbers[0]);
          salaryMax = parseFloat(numbers[1]);
        }
      }
    }

    // Assemble job object
    var job = {
      title: title,
      companyName: companyName,
      description: description,
      location: location,
      jobType: jobType,
      sourceUrl: sourceUrl,
      postedDateIsoString: postedDateIsoString,
      deadlineIsoString: deadlineIsoString,
      salaryMin: salaryMin,
      salaryMax: salaryMax,
      salaryCurrency: salaryCurrency
    };
    result.push(job);
  });
}