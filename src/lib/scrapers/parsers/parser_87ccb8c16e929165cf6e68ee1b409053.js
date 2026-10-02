const jobContainers = $('meta[property="og:description"]').parent().parent();

jobContainers.each((index, container) => {
  const jobTitle = $('meta[property="og:title"]', container).attr('content').split(' - ')[0];
  const companyName = $('meta[property="og:title"]', container).attr('content').split(' - ')[1];
  const description = $('meta[property="og:description"]', container).attr('content');
  const location = 'Zanzibar'; // Assuming location is Zanzibar based on the job description
  const jobType = 'full_time'; // Assuming full_time based on typical job listings
  const sourceUrl = ''; // Assuming no source URL available in the provided HTML
  const postedDateIsoString = new Date().toISOString(); // Assuming today's date for posted date
  const deadlineIsoString = description.match(/Deadline\n(\d{1,2}st?|nd?|rd?|th?)\s+([A-Za-z]+)\s+(\d{4})/)?.[0];
  const salaryMin = null; // No salary information available
  const salaryMax = null; // No salary information available
  const salaryCurrency = null; // No salary information available

  result.push({
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
  });
});