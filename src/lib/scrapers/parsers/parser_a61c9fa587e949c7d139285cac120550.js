var jobTitle = $('meta[property="og:title"]').attr('content');
var companyName = jobTitle.match(/at (.*)/);
if (companyName) companyName = companyName[1];
else companyName = '';

var description = $('meta[property="og:description"]').attr('content');
var location = '';
var jobType = '';
var sourceUrl = $('meta[property="og:url"]').attr('content');
var postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
var deadlineIsoString = '';
var salaryMin = '';
var salaryMax = '';
var salaryCurrency = '';

var job = {
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