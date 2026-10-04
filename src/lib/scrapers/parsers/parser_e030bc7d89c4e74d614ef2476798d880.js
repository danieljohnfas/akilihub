$('.job_listing, .listing, .job, article').each(function() {
  const $el = $(this);
  const title = $el.find('h2 a, h3 a, .job-title, .title').first().text().trim();
  if (!title || title.length < 3) return;
  
  const typeText = ($el.find('.job-type, .type').first().text() || '').toLowerCase();
  let jobType = '';
  if (typeText.includes('full')) jobType = 'full_time';
  else if (typeText.includes('part')) jobType = 'part_time';
  else if (typeText.includes('contract')) jobType = 'contract';
  else if (typeText.includes('intern')) jobType = 'internship';
  else if (typeText.includes('remote')) jobType = 'remote';
  
  result.push({
    title: title,
    companyName: $el.find('.company, .employer').first().text().trim(),
    description: $el.find('.description, .excerpt').first().text().trim(),
    location: $el.find('.location').first().text().trim(),
    jobType: jobType,
    sourceUrl: $el.find('a').first().attr('href') || '',
    postedDateIsoString: $el.find('time').first().attr('datetime') || '',
    deadlineIsoString: '',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: ''
  });
});