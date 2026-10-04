var jobTitle = $('title').text().split('—')[0].trim();
var companyName = jobTitle.split('Job Vacancy')[0].trim();
var description = $('meta[property="og:description"]').attr('content');
var location = description.match(/across (.*) and/)[1];
var jobType = 'full_time';
var sourceUrl = $('meta[property="og:url"]').attr('content');
var postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
var deadlineIsoString = '';
var salaryMin = 0;
var salaryMax = 0;
var salaryCurrency = '';

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