Since the provided HTML does not contain any job listings, the result array will remain empty. However, I'll provide a basic structure for a Cheerio script that can be used to extract job listings from a webpage. 

```javascript
// Check if the HTML contains job listings
if ($('.job-listing').length > 0 || $('.job').length > 0 || $('.job-posting').length > 0) {
  // Loop over job containers
  $('.job-listing, .job, .job-posting').each(function() {
    // Extract job details
    var title = $(this).find('.job-title').text().trim() || $(this).find('h2, h3').text().trim();
    var companyName = $(this).find('.company-name').text().trim() || $(this).find('.employer').text().trim();
    var description = $(this).find('.job-description').text().trim() || $(this).find('p').text().trim();
    var location = $(this).find('.job-location').text().trim() || $(this).find('.location').text().trim();
    var jobType = $(this).find('.job-type').text().trim() || $(this).find