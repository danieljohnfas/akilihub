let containers = $('[itemtype="https://schema.org/JobPosting"], .job-listing, .job, .career-item, .posting]');
containers.each((i, el) => {
  let elem = $(el);
  let title = elem.find('[itemprop="title"], .title, h1, h2, h3').first().text().trim();
  if (!title) return;
  let job = { title };
  let company = elem.find('[itemprop="hiringOrganization"], .company, .company-name').first().text().trim();
  if (company) job.companyName = company;
  let description = elem.find('[itemprop="description"], .description, .desc').first().text().trim();
  if (description) job.description = description;
  let location = elem.find('[itemprop="jobLocation"], .location').first().text().trim();
  if (location) job.location = location;
  let type = elem.find('[itemprop="employmentType"], .employment-type, .job-type').first().text().trim().toLowerCase();
  if (type) {
    let map = { 'full time':'full_time','full-time':'full_time','part time':'part_time','part-time':'part_time','contract':'contract','internship':'internship','remote':'remote' };
    job.jobType = map[type] || type;
  }
  let url = elem.find('a').first().attr('href');
  if (url) job.sourceUrl = url;
  let posted = elem.find('[itemprop="datePosted"], .date-posted, .posted').first().attr('datetime') || elem.find('[itemprop="datePosted"], .date-posted, .posted').first().text().trim();
  if (posted) {
    let d = new Date(posted);
    if (!isNaN(d)) job.postedDateIsoString = d.toISOString();
  }
  let deadline = elem.find('[itemprop="validThrough"], .deadline, .deadline-date').first().attr('datetime') || elem.find('[itemprop="validThrough"], .deadline, .deadline-date').first().text().trim();
  if (deadline) {
    let d2 = new Date(deadline);
    if (!isNaN(d2)) job.deadlineIsoString = d2.toISOString();
  }
  let salaryText = elem.find('[itemprop="baseSalary"], .salary').first().text().trim();
  if (salaryText) {
    let match = salaryText.replace(/,/g,'').match(/([A-Za-z$€£]+)?\s*([\d\.]+)\s*(?:-|\sto\s)?\s*([\d\.]+)?/);
    if (match) {
      if (match[1]) job.salaryCurrency = match[1];
      if (match[2]) job.salaryMin = parseFloat(match[2]);
      if (match[3]) job.salaryMax = parseFloat(match[3]);
    }
  }
  result.push(job);
});