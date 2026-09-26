var jobContainers = $('.job-listing, .job-item, .vacancy, .career-item, .job-card'); 
if (jobContainers.length) {
  jobContainers.each(function(){
    var el = $(this);
    var title = el.find('.job-title, h1, h2, h3, a').first().text().trim();
    if (!title) return;
    var job = {title: title};
    var company = el.find('.company-name, .employer, .company').first().text().trim();
    if (company) job.companyName = company;
    var location = el.find('.location, .job-location, .city').first().text().trim();
    if (location) job.location = location;
    var description = el.find('.description, .job-description, .summary').first().text().trim();
    if (description) job.description = description;
    var type = el.find('.job-type, .employment-type').first().text().trim().toLowerCase();
    if (type) {
      if (type.includes('full')) job.jobType = 'full_time';
      else if (type.includes('part')) job.jobType = 'part_time';
      else if (type.includes('contract')) job.jobType = 'contract';
      else if (type.includes('intern')) job.jobType = 'internship';
      else if (type.includes('remote')) job.jobType = 'remote';
    }
    var posted = el.find('.posted-date, time[datetime]').first().attr('datetime') || el.find('.posted-date').first().text().trim();
    if (posted) job.postedDateIsoString = posted;
    var deadline = el.find('.deadline-date, .apply-by').first().attr('datetime') || el.find('.deadline-date').first().text().trim();
    if (deadline) job.deadlineIsoString = deadline;
    var salary = el.find('.salary, .pay').first().text().trim();
    if (salary) {
      var match = salary.match(/([A-Z]{3})?\s*([0-9,.]+)\s*(?:-|\sto\s)\s*([0-9,.]+)/i);
      if (match) {
        job.salaryCurrency = match[1] ? match[1].toUpperCase() : undefined;
        job.salaryMin = parseFloat(match[2].replace(/,/g, ''));
        job.salaryMax = parseFloat(match[3].replace(/,/g, ''));
      } else {
        var single = salary.match(/([A-Z]{3})?\s*([0-9,.]+)/i);
        if (single) {
          job.salaryCurrency = single[1] ? single[1].toUpperCase() : undefined;
          job.salaryMin = parseFloat(single[2].replace(/,/g, ''));
        }
      }
    }
    var sourceLink = el.find('a.apply-link, a[href*="apply"], a[href*="job"]').first().attr('href');
    if (sourceLink) job.sourceUrl = sourceLink;
    result.push(job);
  });
}