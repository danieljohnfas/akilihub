var selectors = [
  '.job',
  '.job-listing',
  '.posting',
  'article',
  'li'
];
$(selectors.join(',')).each(function () {
  var $el = $(this);
  var title = $el.find('h1, h2, h3, .title, .job-title').first().text().trim();
  if (!title) return;
  var job = { title: title };
  var company = $el.find('.company, .company-name').first().text().trim();
  if (company) job.companyName = company;
  var description = $el.find('.description, .job-description, p').first().text().trim();
  if (description) job.description = description;
  var location = $el.find('.location, .job-location').first().text().trim();
  if (location) job.location = location;
  var typeText = $el.find('.type, .job-type').first().text().trim().toLowerCase();
  if (typeText) {
    if (typeText.includes('full')) job.jobType = 'full_time';
    else if (typeText.includes('part')) job.jobType = 'part_time';
    else if (typeText.includes('contract')) job.jobType = 'contract';
    else if (typeText.includes('intern')) job.jobType = 'internship';
    else if (typeText.includes('remote')) job.jobType = 'remote';
  }
  var link = $el.find('a[href]').first().attr('href');
  if (link) job.sourceUrl = link;
  var posted = $el.find('.date-posted, .posted, time[datetime]').first().text().trim();
  if (posted) {
    var iso = new Date(posted).toISOString();
    if (!isNaN(Date.parse(iso))) job.postedDateIsoString = iso;
  }
  var deadline = $el.find('.deadline, .apply-by').first().text().trim();
  if (deadline) {
    var iso2 = new Date(deadline).toISOString();
    if (!isNaN(Date.parse(iso2))) job.deadlineIsoString = iso2;
  }
  var salaryText = $el.find('.salary, .compensation').first().text().trim();
  if (salaryText) {
    var m = salaryText.replace(/,/g, '').match(/([A-Z]{3})?\s*\$?([0-9]+)(?:\s*[-–]\s*\$?([0-9]+))?/i);
    if (m) {
      if (m[1]) job.salaryCurrency = m[1];
      job.salaryMin = Number(m[2]);
      if (m[3]) job.salaryMax = Number(m[3]);
    }
  }
  result.push(job);
});