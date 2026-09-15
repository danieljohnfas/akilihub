var job = {};
var title = $('title').text();
var description = $('meta[name="description"]').attr('content');
var url = $('link[rel="canonical"]').attr('href');
var companyName = title.split('At')[1].split('Dar')[0].trim();
var location = title.split('Dar')[1].split('February')[0].trim();
var jobType = null;
var sourceUrl = url;
var postedDateIsoString = null;
var deadlineIsoString = null;
var salaryMin = null;
var salaryMax = null;
var salaryCurrency = null;

job.title = title.split('Job Vacancy At')[0].trim();
job.companyName = companyName;
job.description = description;
job.location = location;
job.jobType = jobType;
job.sourceUrl = sourceUrl;
job.postedDateIsoString = postedDateIsoString;
job.deadlineIsoString = deadlineIsoString;
job.salaryMin = salaryMin;
job.salaryMax = salaryMax;
job.salaryCurrency = salaryCurrency;

result.push(job);