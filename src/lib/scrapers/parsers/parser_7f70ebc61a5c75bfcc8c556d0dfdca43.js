$('.job-description').each(function() {
  var job = {};
  job.title = $(this).find('h1').text().trim();
  job.companyName = $(this).find('.company-name').text().trim();
  job.description = $(this).find('.job-description-text').text().trim();
  job.location = $(this).find('.location').text().trim();
  job.sourceUrl = 'https://www.careerjunction.co.za' + window.location.pathname;
  
  var salaryText = $(this).find('.salary').text().trim();
  if (salaryText) {
    var salaryMatch = salaryText.match(/R(\d+,\d+) - R(\d+,\d+)/);
    if (salaryMatch) {
      job.salaryMin = parseInt(salaryMatch[1].replace(/,/g, ''));
      job.salaryMax = parseInt(salaryMatch[2].replace(/,/g, ''));
      job.salaryCurrency = 'ZAR';
    }
  }
  
  var postedDateText = $(this).find('.posted-date').text().trim();
  if (postedDateText) {
    var postedDateMatch = postedDateText.match(/Posted on (\d{1,2}