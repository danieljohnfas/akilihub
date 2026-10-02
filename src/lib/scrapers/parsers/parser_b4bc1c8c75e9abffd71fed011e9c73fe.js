let $jobContainers = $('.job-listing, .job-item');
$jobContainers.each(function(i, container){
  const $c = $(container);
  const title = $c.find('.job-title, h2, .title').text().trim();
  if (!title) return;
  const job = {
    title: title,
    companyName: $c.find('.company-name, .company').text().trim(),
    location: $c.find('.location').text().trim(),
    description: $c.find('.description, .summary').text().trim(),
    sourceUrl: $c.find('a').attr('href') || '',
    postedDateIsoString: $c.find('[datetime]').attr('datetime') || null,
    deadlineIsoString: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    jobType: $c.find('.job-type').attr('data-type') || null
  };
  result.push(job);
});