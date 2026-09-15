var jobTitle = $('title').text();
var jobDescription = $('meta[name="description"]').attr('content');
var companyName = $('meta[property="og:site_name"]').attr('content');
var location = jobDescription.match(/([A-Za-z ]+, [A-Za-z ]+, [A-Za-z ]+)/);
var sourceUrl = $('meta[property="og:url"]').attr('content');

if (jobTitle && jobDescription && companyName && location) {
    var job = {
        title: jobTitle,
        companyName: companyName,
        description: jobDescription,
        location: location[0],
        sourceUrl: sourceUrl
    };
    result.push(job);
}