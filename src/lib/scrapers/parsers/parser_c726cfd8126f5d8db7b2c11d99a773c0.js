var jobContainers = $('div.job-container, div.job-listing, div.job-post, div.job-opening, div.job-vacancy, div.job-ad');
if (jobContainers.length === 0) {
  var jobContainers = $('article, div.card, div.listing, div.post, div.item');
}
if (jobContainers.length === 0) {
  result = [];
} else {
  jobContainers.each(function() {
    var title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
    if (!title) return;
    var companyName = $(this).find('span.company, span.employer, span.organization').text().trim();
    var description = $(this).find('div.description, div.job-description, div.post-content').text().trim();
    var location = $(this).find('span.location, span.place, span.region').text().trim();
    var jobType = $(this).find('span.job-type, span.employment-type, span.contract-type').text().trim();
    var sourceUrl = $(this).find('a').attr('href');
    if (!sourceUrl) sourceUrl = 'https://nafasi.io