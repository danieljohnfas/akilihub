const jobListings = $('div.job-listing');

jobListings.each((index, element) => {
  const title = $(element).find('h2.job-title').text().trim();
  const companyName = $(element).find('div.company-name').text().trim();
  const description = $(element).find('div.job-description').text().trim();
  const location = $(element).find('div.job-location').text().trim();
  const jobType = $(element).find('div.job-type').text().trim().toLowerCase();
  const sourceUrl = $(element).find('a.job-link').attr('href');
  const postedDateIsoString = $(element).find('div.posted-date').attr('data-date');
  const deadlineIsoString = $(element).find('div.deadline-date').attr('data-date');
  const salaryMin = $(element).find('div.salary-min').text().trim().replace(/[^0-9]/g, '') || null;
  const salaryMax = $(element).find('div.salary-max').text().trim().replace(/[^0-9]/g, '') || null;
  const salaryCurrency = $(element).find('div.salary-currency').text().trim();

  const job = {
    title,
    companyName,
    description,
    location,
    jobType,
    sourceUrl,
    postedDateIsoString,
    deadlineIsoString,
    salaryMin: salaryMin ? parseInt(salaryMin, 10) : null,
    salaryMax: salaryMax ? parseInt(salaryMax, 10) : null,
    salaryCurrency
  };

  result.push(job);
});