var jobContainers = $('.job-item, .listing-item, .job-card, .vacancy, .career-item');

jobContainers.each(function () {
  var el = $(this);
  var title = el.find('.job-title, h2, h3, .title').first().text().trim();
  if (!title) return;
  var job = {
    title: title,
    companyName: el.find('.company, .company-name').first().text().trim() || null,
    description: el.find('.job-description, .description, p').first().text().trim() || null,
    location: el.find('.location, .job-location').first().text().trim() || null,
    jobType: (function () {
      var txt = el.find('.job-type, .type').first().text().toLowerCase();
      if (/full\s?time/.test(txt)) return 'full_time';
      if (/part\s?time/.test(txt)) return 'part_time';
      if (/contract/.test(txt)) return 'contract';
      if (/internship/.test(txt)) return 'internship';
      if (/remote/.test(txt)) return 'remote';
      return null;
    })(),
    sourceUrl: typeof window !== 'undefined' && window.location ? window.location.href : null,
    postedDateIsoString: null,
    deadlineIsoString: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null
  };
  result.push(job);
});