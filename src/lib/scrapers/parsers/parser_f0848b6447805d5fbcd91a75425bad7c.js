var jobTitle = $('title').text();
var metaDescription = $('meta[name="description"]').attr('content');
var metaKeywords = $('meta[name="keywords"]').attr('content');
var url = $('meta[property="og:url"]').attr('content');
var companyName = $('meta[name="twitter:site"]').attr('content');
var jobType = null;
var location = null;
var description = null;
var sourceUrl = url;
var postedDateIsoString = null;
var deadlineIsoString = null;
var salaryMin = null;
var salaryMax = null;
var salaryCurrency = null;

if (jobTitle && jobTitle.includes('-')) {
  var parts = jobTitle.split('-');
  jobTitle = parts[1].trim();
  companyName = parts[0].trim();
}

if (metaDescription) {
  description = metaDescription;
}

if (metaKeywords) {
  var keywords = metaKeywords.split('.');
  keywords.forEach(function(keyword) {
    if (keyword.includes('in')) {
      location = keyword.split('in')[1].trim();
    }
  });
}

result.push({
  title: jobTitle,
  companyName: companyName,
  description: description,
  location: location,
  jobType: jobType,
  sourceUrl: