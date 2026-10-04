var jobElems = $('[itemtype*="JobPosting"]');
jobElems.each(function () {
  var $job = $(this);
  var job = {};

  var title = $job.find('[itemprop="title"]').first().text().trim();
  if (!title) title = $job.attr('title') || $job.find('h1, h2, h3').first().text().trim();
  if (title) job.title = title;

  var company = $job.find('[itemprop="hiringOrganization"] [itemprop="name"]').first().text().trim();
  if (!company) company = $job.find('[itemprop="employer"] [itemprop="name"]').first().text().trim();
  if (company) job.companyName = company;

  var desc = $job.find('[itemprop="description"]').first().text().trim();
  if (desc) job.description = desc;

  var loc = $job.find('[itemprop="jobLocation"] [itemprop="addressLocality"], [itemprop="jobLocation"] [itemprop="address"], [itemprop="address"]').first().text().trim();
  if (loc) job.location = loc;

  var emp = $job.find('[itemprop="employmentType"]').first().text().trim().toLowerCase();
  if (emp) {
    if (emp.includes('full')) job.jobType = 'full_time';
    else if (emp.includes('part')) job.jobType = 'part_time';
    else if (emp.includes('contract')) job.jobType = 'contract';
    else if (emp.includes('intern')) job.jobType = 'internship';
    else if (emp.includes('remote')) job.jobType = 'remote';
    else job.jobType = emp;
  }

  var url = $job.find('a').first().attr('href');
  if (url) job.sourceUrl = url;

  var posted = $job.find('[itemprop="datePosted"]').first().attr('content') || $job.find('[itemprop="datePosted"]').first().text().trim();
  if (posted) {
    var d = new Date(posted);
    if (!isNaN(d)) job.postedDateIsoString = d.toISOString();
  }

  var deadline = $job.find('[itemprop="validThrough"]').first().attr('content') || $job.find('[itemprop="validThrough"]').first().text().trim();
  if (deadline) {
    var d2 = new Date(deadline);
    if (!isNaN(d2)) job.deadlineIsoString = d2.toISOString();
  }

  var $salary = $job.find('[itemprop="baseSalary"]');
  if ($salary.length) {
    var salaryText = $salary.text().replace(/[\$,]/g, '').trim();
    var parts = salaryText.split(/[\s-]+|to/);
    var nums = parts.map(function (p) { return parseFloat(p); }).filter(function (n) { return !isNaN(n); });
    if (nums.length === 1) {
      job.salaryMin = job.salaryMax = nums[0];
    } else if (nums.length >= 2) {
      job.salaryMin = nums[0];
      job.salaryMax = nums[1];
    }
    var currencyMatch = $salary.text().match(/([A-Z]{3}|\$|£|€)/);
    if (currencyMatch) job.salaryCurrency = currencyMatch[1];
  }

  result.push(job);
});