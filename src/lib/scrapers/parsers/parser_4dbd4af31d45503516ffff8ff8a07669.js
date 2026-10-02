let containers = $('.job, .job-item, .job-listing, .vacancy, article[data-job-id], li[data-job-id]');
containers.each(function () {
  let el = $(this);
  let title = el.find('.title, h1, h2, h3').first().text().trim();
  if (!title) return;
  let job = { title };
  let company = el.find('.company, .company-name').first().text().trim();
  if (company) job.companyName = company;
  let description = el.find('.description, .desc, .job-description').first().text().trim();
  if (description) job.description = description;
  let location = el.find('.location, .job-location').first().text().trim();
  if (location) job.location = location;
  let typeText = el.find('.type, .job-type').first().text().trim().toLowerCase();
  if (typeText) {
    if (typeText.includes('full')) job.jobType = 'full_time';
    else if (typeText.includes('part')) job.jobType = 'part_time';
    else if (typeText.includes('contract')) job.jobType = 'contract';
    else if (typeText.includes('intern')) job.jobType = 'internship';
    else if (typeText.includes('remote')) job.jobType = 'remote';
  }
  let url = el.find('a[href]').first().attr('href');
  if (url) job.sourceUrl = url;
  let posted = el.find('time[datetime]').first().attr('datetime');
  if (posted) job.postedDateIsoString = posted;
  let deadline = el.find('.deadline time[datetime]').first().attr('datetime');
  if (deadline) job.deadlineIsoString = deadline;
  let salaryText = el.find('.salary').first().text().trim();
  if (salaryText) {
    let numbers = salaryText.replace(/[^0-9.,-]/g, '').split(/[-–to]+/);
    if (numbers[0]) job.salaryMin = Number(numbers[0].replace(/,/g, ''));
    if (numbers[1]) job.salaryMax = Number(numbers[1].replace(/,/g, ''));
    let curMatch = salaryText.match(/[£$€]/);
    if (curMatch) job.salaryCurrency = curMatch[0];
  }
  result.push(job);
});