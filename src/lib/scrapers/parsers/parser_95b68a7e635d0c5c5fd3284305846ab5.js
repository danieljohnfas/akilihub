var jobContainers = $('.job-item, .job-listing, .vacancy, .career-item, .position');
jobContainers.each(function () {
  var $item = $(this);
  var title = $item.find('h1, h2, h3, a, .title, .job-title').first().text().trim();
  if (!title) return;
  var job = { title: title };
  var company = $item.find('.company, .company-name, .employer').first().text().trim();
  if (company) job.companyName = company;
  var desc = $item.find('.description, .desc, p').first().text().trim();
  if (desc) job.description = desc;
  var location = $item.find('.location, .loc, .job-location').first().text().trim();
  if (location) job.location = location;
  var typeText = $item.find('.type, .job-type').first().text().trim().toLowerCase();
  if (typeText) {
    if (/full\s?time/.test(typeText)) job.jobType = 'full_time';
    else if (/part\s?time/.test(typeText)) job.jobType = 'part_time';
    else if (/contract/.test(typeText)) job.jobType = 'contract';
    else if (/intern/.test(typeText)) job.jobType = 'internship';
    else if (/remote/.test(typeText)) job.jobType = 'remote';
  }
  var link = $item.find('a[href]').first().attr('href');
  if (link) {
    try {
      job.sourceUrl = new URL(link, 'https://example.com').href;
    } catch (e) {}
  }
  var posted = $item.find('.posted-date, time[datetime]').first().attr('datetime') || $item.find('.posted-date, time').first().text().trim();
  if (posted) {
    var d = new Date(posted);
    if (!isNaN(d)) job.postedDateIsoString = d.toISOString();
  }
  var deadline = $item.find('.deadline, .apply-by').first().text().trim();
  if (deadline) {
    var d2 = new Date(deadline);
    if (!isNaN(d2)) job.deadlineIsoString = d2.toISOString();
  }
  var salaryText = $item.find('.salary, .pay').first().text().trim();
  if (salaryText) {
    var match = salaryText.match(/([\d,]+)\s*-\s*([\d,]+)\s*([A-Za-z$]+)/);
    if (match) {
      job.salaryMin = parseInt(match[1].replace(/,/g, ''), 10);
      job.salaryMax = parseInt(match[2].replace(/,/g, ''), 10);
      job.salaryCurrency = match[3];
    } else {
      var single = salaryText.match(/([\d,]+)\s*([A-Za-z$]+)/);
      if (single) {
        job.salaryMin = job.salaryMax = parseInt(single[1].replace(/,/g, ''), 10);
        job.salaryCurrency = single[2];
      }
    }
  }
  result.push(job);
});