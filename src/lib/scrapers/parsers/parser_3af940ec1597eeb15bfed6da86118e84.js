$('article').each((i, el) => {
  const jobElement = $(el);

  const titleElement = jobElement.find('h2 a, h3 a').first();
  const title = titleElement.text().trim();
  const sourceUrlRelative = titleElement.attr('href');

  if (title) {
    const job = {
      title: title,
      companyName: 'University of Zambia',
      description: jobElement.find('.node__content, .field--name-body, .description').text().trim(),
      location: jobElement.find('.location, .field--name-field-location').text().replace(/Location:\s*/i, '').trim(),
      jobType: null,
      sourceUrl: sourceUrlRelative ? new URL(sourceUrlRelative, 'https://www.unza.zm/').href : null,
      postedDateIsoString: null,
      deadlineIsoString: null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null
    };

    const jobTypeText = jobElement.text().toLowerCase();
    if (jobTypeText.includes('full-time')) job.jobType = 'full_time';
    else if (jobTypeText.includes('part-time')) job.jobType = 'part_time';
    else if (jobTypeText.includes('contract')) job.jobType = 'contract';
    else if (jobTypeText.includes('internship')) job.jobType = 'internship';
    else if (jobTypeText.includes('remote')) job.jobType = 'remote';

    const dateText = jobElement.text();
    const postedDateMatch = dateText.match(/(?:Posted|Date):\s*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i);
    if (postedDateMatch && postedDateMatch[1]) {
      try {
        const datePart = postedDateMatch[1];
        let dateObj;
        if (datePart.includes('-')) {
          dateObj = new Date(datePart);
        } else if (datePart.includes('/')) {
          const parts = datePart.split('/');
          if (parts.length === 3) {
            dateObj = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
          }
        }
        if (dateObj && !isNaN(dateObj.getTime())) {
          job.postedDateIsoString = dateObj.toISOString();
        }
      } catch (e) { }
    }

    result.push(job);
  }
});