const jobContainers = $('div.job-listing');
if (jobContainers.length === 0) {
  const jobTitle = $('title').text();
  const companyName = $('meta[property="og:title"]').attr('content');
  const description = $('meta[property="og:description"]').attr('content');
  const location = 'Zanzibar City';
  const sourceUrl = $('link[rel="canonical"]').attr('href');
  const jobType = 'full_time';
  const postedDateIsoString = new Date().toISOString();
  const deadlineIsoString = '';
  const salaryMin = 0;
  const salaryMax = 0;
  const salaryCurrency = '';
  const job = {
    title: jobTitle,
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
} else {
  jobContainers.each(function() {
    const jobTitle = $(this).find('h2.job-title').text().trim();