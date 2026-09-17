$('.job-listing, .job, [data-job], article.listing, .listing-item').each(function() {
  const $el = $(this);
  const title = $el.find('.job-title, h2, h3, [class*="title"]').first().text().trim();
  if (!title) return;
  result.push({
    title,
    companyName: $el.find('.company, .company-name').first().text().trim() || undefined,
    description: $el.find('.description, .desc').first().text().trim() || undefined,
    location: $el.find('.location, [class*="location"]').first().text().trim() || undefined,
    jobType: undefined,
    sourceUrl: undefined,
    postedDateIsoString: undefined,
    deadlineIsoString: undefined,
    salaryMin: undefined,
    salaryMax: undefined,
    salaryCurrency: undefined
  });
});