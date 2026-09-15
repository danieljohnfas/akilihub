var jobTitle = $('meta[property="og:title"]').attr('content');
var companyName = $('meta[property="og:site_name"]').attr('content');
var description = $('meta[property="og:description"]').attr('content');
var location = '';
var jobType = '';
var sourceUrl = $('meta[property="og:url"]').attr('content');
var postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
var deadlineIsoString = '';
var salaryMin = 0;
var salaryMax = 0;
var salaryCurrency = '';

if (jobTitle) {
  var jobObject = {
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
  result.push(jobObject);
}