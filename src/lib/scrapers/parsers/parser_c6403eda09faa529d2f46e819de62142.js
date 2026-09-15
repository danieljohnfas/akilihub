var jobPostings = $('script[type="application/ld+json"]');
if (jobPostings.length === 0) {
  result = [];
} else {
  jobPostings.each(function() {
    var job = JSON.parse($(this).html());
    var jobObject = {};
    jobObject.title = job.title;
    jobObject.companyName = job.hiringOrganization.name;
    jobObject.description = job.description;
    jobObject.location = job.jobLocation.address.addressLocality + ', ' + job.jobLocation.address.addressRegion;
    jobObject.jobType = job.employmentType.toLowerCase();
    jobObject.sourceUrl = $('link[rel="canonical"]').attr('href');
    jobObject.postedDateIsoString = job.datePosted;
    jobObject.deadlineIsoString = job.validThrough;
    jobObject.salaryMin = job.baseSalary.value.minValue;
    jobObject.salaryMax = job.baseSalary.value.maxValue;
    jobObject.salaryCurrency = job.baseSalary.currency;
    result.push(jobObject);
  });
}