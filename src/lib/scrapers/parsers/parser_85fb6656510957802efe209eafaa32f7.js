var jobTitle = $('meta[property="og:title"]').attr('content');
var companyName = $('meta[property="og:site_name"]').attr('content');
var description = $('meta[property="og:description"]').attr('content');
var sourceUrl = $('meta[property="og:url"]').attr('content');
var postedDateIsoString = $('meta[property="article:published_time"]').attr('content');

if (jobTitle && jobTitle.includes('Vacancy Announcement')) {
  var job = {
    title: jobTitle,
    companyName: companyName,
    description: description,
    sourceUrl: sourceUrl,
    postedDateIsoString: postedDateIsoString
  };
  result.push(job);
}