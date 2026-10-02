const jobContainers = $('[data-testid*="job"], .job-card, .job-listing, li, article[itemprop="jobTitle"]');
jobContainers.each(function() {
  var el = $(this);
  var title = $(el).find('h1, h2, h3').text().trim();
  var company = $(el).find('.company, .org-name').text().trim();
  var desc = $(el).find('.description, p').text().trim();
  var loc = $(el).find('.location, .city').text().trim();
  var type = $(el).find('.type, .employment-type').text().trim();
  var url = $(el).attr('href') || '';
  var date = $(el).attr('data-date') || $(el).attr('data-posted') || '';
  var deadline = $(el).attr('data-deadline') || '';
  var salaryMin = $(el).find('[itemprop="salaryMinimum"]').text().trim();
  var salaryMax = $(el).find('[itemprop="salaryMaximum"]').text().trim();
  var currency = $(el).find('[itemprop="currency"]').text().trim();

  if (title && company) {
    result.push({
      title: title,
      companyName: company,
      description: desc,
      location: loc,
      jobType: type || 'contract',
      sourceUrl: url,
      postedDateIsoString: date,
      deadlineIsoString: deadline,
      salaryMin: salaryMin ? Number(salaryMin) : null,
      salaryMax: salaryMax ? Number(salaryMax) : null,
      salaryCurrency: currency
    });
  }
});