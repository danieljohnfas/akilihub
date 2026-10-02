$(document).ready(function() {
  const jobListings = $('div.job-listing'); // Adjust this selector based on the actual HTML structure

  jobListings.each(function() {
    const jobTitle = $(this).find('h2.job-title').text().trim(); // Adjust selector for job title
    const companyName = $(this).find('div.company-name').text().trim(); // Adjust selector for company name
    const description = $(this).find('div.job-description').text().trim(); // Adjust selector for job description
    const location = $(this).find('div.job-location').text().trim(); // Adjust selector for job location
    const jobType = $(this).find('div.job-type').text().trim().toLowerCase(); // Adjust selector for job type
    const sourceUrl = $(this).find('a.job-link').attr('href'); // Adjust selector for job link
    const postedDateIsoString = $(this).find('time.posted-date').attr('datetime'); // Adjust selector for posted date
    const deadlineIsoString = $(this).find('time.deadline-date').attr('datetime'); // Adjust selector for deadline date
    const salaryText = $(this).find('div.salary').text().trim(); // Adjust selector for salary
    const salaryMatch = salaryText.match(/(\d+),?(\d+)?/g);
    const salaryMin = salaryMatch ? parseInt(salaryMatch[0].replace(/,/g, '')) : null;
    const salaryMax = salaryMatch && salaryMatch.length > 1 ? parseInt(salaryMatch[1].replace(/,/g, '')) : null;
    const salaryCurrency = salaryText.match(/[A-Z]{3}/) ? salaryText.match(/[A-Z]{3}/)[0] : null;

    if (jobTitle) {
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
    }
  });
});