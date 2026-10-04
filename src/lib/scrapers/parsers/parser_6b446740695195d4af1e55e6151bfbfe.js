var jobTitle = $('title').text();
var companyName = jobTitle.match(/at (.*) \(/);
var location = jobTitle.match(/\(.*, (.*)\)/);
var description = $('meta[name="description"]').attr('content');
var deadline = description.match(/Deadline: (.*)/);
var sourceUrl = $('link[rel="canonical"]').attr('href');

if (companyName && location && deadline) {
  var job = {
    title: jobTitle.replace(/ at .*/, '').replace(/ \(.*\)/, ''),
    companyName: companyName[1],
    description: description,
    location: location[1],
    sourceUrl: sourceUrl,
    deadlineIsoString: deadline[1]
  };
  result.push(job);
}