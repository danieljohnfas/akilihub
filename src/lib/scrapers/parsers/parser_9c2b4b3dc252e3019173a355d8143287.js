const jobListings = $('#content .post').length > 0 ? $('#content .post') : [];

jobListings.each((index, jobListing) => {
  const job = {};
  job.title = $(jobListing).find('.entry-title').text().trim();
  job.companyName = $(jobListing).find('.entry-content').text().match(/at\s+(.*?)[\s\n-]+/)[1].trim();
  job.description = $(jobListing).find('.entry-content').text().replace(/Apply for .*? at .*?\.?/, '').trim();
  job.location = $(jobListing).find('.entry-content').text().match(/Location:\s*(.*?)[\s\n-]+/)?.[1]?.trim() || '';
  job.jobType = $(jobListing).find('.entry-content').text().match(/Job Type:\s*(.*?)[\s\n-]+/)?.[1]?.trim() || '';
  job.sourceUrl = $(jobListing).find('.entry-content a').attr('href');
  job.postedDateIsoString = new Date().toISOString(); // Assuming it's the current date since the HTML doesn't provide a posted date
  job.deadlineIsoString = $(jobListing).find('.entry-content').text().match(/Deadline:\s*(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1]?.trim() ? new Date($(jobListing).find('.entry-content').text().match(/Deadline:\s*(\d{1,2}\/\d{1,2}\/\d{4})/)[1]).toISOString() : '';
  job.salaryMin = $(jobListing).find('.entry-content').text().match(/Salary:\s*(\d+)[\s-]+to[\s-]+(\d+)/)?.[1] ? parseFloat($(jobListing).find('.entry-content').text().match(/Salary:\s*(\d+)[\s-]+to[\s-]+(\d+)/)[1]) : null;
  job.salaryMax = $(jobListing).find('.entry-content').text().match(/Salary:\s*(\d+)[\s-]+to[\s-]+(\d+)/)?.[2] ? parseFloat($(jobListing).find('.entry-content').text().match(/Salary:\s*(\d+)[\s-]+to[\s-]+(\d+)/)[2]) : null;
  job.salaryCurrency = $(jobListing).find('.entry-content').text().match(/Salary:\s*(\d+)[\s-]+to[\s-]+(\d+)\s*(\w+)/)?.[3]?.trim() || '';
  
  result.push(job);
});