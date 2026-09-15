var jobPostings = $('script[type="application/ld+json"]');
if (jobPostings.length === 0) {
  result = [];
} else {
  jobPostings.each(function() {
    var jobData = JSON.parse($(this).html());
    jobData = jobData[0];
    if (jobData['@type'] === 'JobPosting') {
      var job = {};
      job.title = jobData.title;
      job.companyName = jobData.hiringOrganization.name;
      job.description = jobData.description;
      job.location = jobData.jobLocation.name;
      job.jobType = jobData.employmentType;
      job.sourceUrl = 'https://kilimanjaroyetu.com' + window.location.pathname;
      job.postedDateIsoString = jobData.datePosted;
      var deadline = new Date(jobData.description.match(/closing on (.*)\./)[1]);
      job.deadlineIsoString = deadline.toISOString();
      var salary = jobData.baseSalary;
      job.salaryMin = parseFloat(salary.value.split('-')[0].trim());
      job.salaryMax = parseFloat(salary.value.split('-')[1].trim());
      job.salaryCurrency = salary.currency;
      result.push(job);
    }
  });
}