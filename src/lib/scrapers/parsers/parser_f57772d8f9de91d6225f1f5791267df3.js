const containers = $('article, .entry-content, .post-content, .content, .job-listing, .jobs, .vacancies');

containers.each((_, container) => {
  const $container = $(container);
  const items = $container.find('li, .job-item, .vacancy-item, tr');
  items.each((_, el) => {
    const $item = $(el);
    let title = $item.find('h1, h2, h3, h4, a, strong').first().text().trim();
    if (!title) {
      const textLines = $item.text().trim().split('\n').map(t => t.trim()).filter(t => t);
      title = textLines[0] || '';
    }
    if (!title || title.length < 3) return;
    const lowerTitle = title.toLowerCase();
    const jobKeywords = [
      'vacancy', 'teacher', 'engineer', 'developer', 'manager', 'assistant',
      'analyst', 'officer', 'coordinator', 'specialist', 'consultant',
      'sales', 'marketing', 'designer', 'technician', 'nurse',
      'accountant', 'clerk', 'operator', 'intern'
    ];
    if (!jobKeywords.some(k => lowerTitle.includes(k))) return;

    const job = { title };

    // Company name
    let company = $item.find('.company, .employer').first().text().trim();
    if (!company) {
      const compMatch = $item.text().match(/Company\s*[:‑-]\s*([^\n\r]+)/i);
      if (compMatch) company = compMatch[1].trim();
    }
    if (company) job.companyName = company;

    // Description (text without the title)
    const desc = $item.clone().children().remove().end().text().trim();
    if (desc) job.description = desc;

    // Location
    const locMatch = $item.text().match(/Location\s*[:‑-]\s*([^\n\r]+)/i);
    if (locMatch) job.location = locMatch[1].trim();

    // Job type
    const typeMatch = $item.text().match(/(Full[-\s]?time|Part[-\s]?time|Contract|Internship|Remote)/i);
    if (typeMatch) {
      const map = {
        fulltime: 'full_time',
        parttime: 'part_time',
        contract: 'contract',
        internship: 'internship',
        remote: 'remote'
      };
      const key = typeMatch[0].toLowerCase().replace(/[\s-]/g, '');
      job.jobType = map[key] || null;
    }

    // Source URL
    const link = $item.find('a[href]').first();
    if (link && link.attr('href')) job.sourceUrl = link.attr('href');

    // Posted date
    const timeEl = $item.find('time[datetime]').first();
    if (timeEl && timeEl.attr('datetime')) job.postedDateIsoString = timeEl.attr('datetime');

    // Deadline
    const deadlineMatch = $item.text().match(/Deadline\s*[:‑-]\s*([^\n\r]+)/i);
    if (deadlineMatch) {
      const iso = new Date(deadlineMatch[1].trim()).toISOString();
      if (!isNaN(Date.parse(iso))) job.deadlineIsoString = iso;
    }

    // Salary
    const salaryRangeMatch = $item.text().match(/Salary\s*[:‑-]?\s*([\d,]+)\s*[-–]\s*([\d,]+)\s*([A-Z]{3})?/i);
    if (salaryRangeMatch) {
      job.salaryMin = Number(salaryRangeMatch[1].replace(/,/g, ''));
      job.salaryMax = Number(salaryRangeMatch[2].replace(/,/g, ''));
      if (salaryRangeMatch[3]) job.salaryCurrency = salaryRangeMatch[3];
    } else {
      const salarySingleMatch = $item.text().match(/Salary\s*[:‑-]?\s*([\d,]+)\s*([A-Z]{3})?/i);
      if (salarySingleMatch) {
        const val = Number(salarySingleMatch[1].replace(/,/g, ''));
        job.salaryMin = val;
        job.salaryMax = val;
        if (salarySingleMatch[2]) job.salaryCurrency = salarySingleMatch[2];
      }
    }

    result.push(job);
  });
});

if (result.length === 0) {
  // Fallback: try to treat the whole page as a single job posting
  const mainTitle = $('h1').first().text().trim();
  const lowerMain = mainTitle.toLowerCase();
  const jobKeywords = [
    'vacancy', 'teacher', 'engineer', 'developer', 'manager', 'assistant',
    'analyst', 'officer', 'coordinator', 'specialist', 'consultant',
    'sales', 'marketing', 'designer', 'technician', 'nurse',
    'accountant', 'clerk', 'operator', 'intern'
  ];
  if (mainTitle && jobKeywords.some(k => lowerMain.includes(k))) {
    const job = { title: mainTitle };
    const bodyText = $('body').text();

    const locMatch = bodyText.match(/Location\s*[:‑-]\s*([^\n\r]+)/i);
    if (locMatch) job.location = locMatch[1].trim();

    const typeMatch = bodyText.match(/(Full[-\s]?time|Part[-\s]?time|Contract|Internship|Remote)/i);
    if (typeMatch) {
      const map = {
        fulltime: 'full_time',
        parttime: 'part_time',
        contract: 'contract',
        internship: 'internship',
        remote: 'remote'
      };
      const key = typeMatch[0].toLowerCase().replace(/[\s-]/g, '');
      job.jobType = map[key] || null;
    }

    const deadlineMatch = bodyText.match(/Deadline\s*[:‑-]\s*([^\n\r]+)/i);
    if (deadlineMatch) {
      const iso = new Date(deadlineMatch[1].trim()).toISOString();
      if (!isNaN(Date.parse(iso))) job.deadlineIsoString = iso;
    }

    const salaryRangeMatch = bodyText.match(/Salary\s*[:‑-]?\s*([\d,]+)\s*[-–]\s*([\d,]+)\s*([A-Z]{3})?/i);
    if (salaryRangeMatch) {
      job.salaryMin = Number(salaryRangeMatch[1].replace(/,/g, ''));
      job.salaryMax = Number(salaryRangeMatch[2].replace(/,/g, ''));
      if (salaryRangeMatch[3]) job.salaryCurrency = salaryRangeMatch[3];
    }

    result.push(job);
  }
}