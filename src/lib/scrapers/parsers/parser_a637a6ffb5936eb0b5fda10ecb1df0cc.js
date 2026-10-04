var jobTitle = $('title').text();
var companyName = jobTitle.match(/at (.*) –/);
var description = $('meta[property="og:description"]').attr('content');
var location = jobTitle.match(/– (.*)/);
var sourceUrl = $('meta[property="og:url"]').attr('content');

if (companyName && location) {
  var job = {
    title: jobTitle.replace(/ at .*/,'').replace(/ – .*/,''),
    companyName: companyName[1],
    description: description,
    location: location[1],
    sourceUrl: sourceUrl
  };
  result.push(job);
}