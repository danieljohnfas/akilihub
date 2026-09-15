const jobContainers = $('.job-listing, .job, .job-posting, .job-opening, .career-opportunity');
if (jobContainers.length === 0) {
  const genericContainers = $('article, .post, .listing, .item');
  jobContainers = genericContainers.filter(function() {
    return $(this).find('h1, h2, h3, h4, h5, h6').text().toLowerCase().includes('job') || 
           $(this).find('h1, h2, h3, h4, h5, h6').text().toLowerCase().includes('career');
  });
}

jobContainers.each(function() {
  const job = {};
  job.title = $(this).find('h1, h2, h3, h4, h5, h6').first().text().trim();
  if (!job.title) return;
  
  job.companyName = $(this).find('.company, .employer, .organization').text().trim();
  job.description = $(this).find('.description, .job-description, .summary').text().trim();
  job.location = $(this).find('.location, .place, .city, .country').text().trim