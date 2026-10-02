const $jobContainers = $('.job-listing, .job-card, .job-post, article.job, .career-item');
if ($jobContainers.length) {
  $jobContainers.each((i, container) => {
    const $c = $(container);
    const job = {};
    const $title = $c.find('.job-title, h2, h3, [data-title]').eq(0);
    if ($title.length) job.title = $title.text().trim();
    const $company = $c.find('.company-name, .company, [data-company]').eq(0);
    if ($company.length) job.companyName = $company.text().trim();
    const $location = $c.find('.location, [data-location]').eq(0);
    if ($location.length) job.location = $location.text().trim();
    const $jobType = $c.find('.job-type, .type, [data-job-type]').eq(0);
    if ($jobType.length) job.jobType = $jobType.text().trim().toLowerCase();
    const $link = $c.find('a[href]').eq(0);
    if ($link.length) job.sourceUrl = $link.attr('href');
    const $posted = $c.find('time[datetime], [data-posted], .posted-date').eq(0);
    if ($posted.length) {
      const dt = $posted.attr('datetime') || $posted.attr('data-posted') || $posted.text().trim();
      if (dt) job.postedDateIsoString = dt;
    }
    const $deadline = $c.find('time[datetime], [data-deadline], .deadline').eq(0);
    if ($deadline.length) {
      const dl = $deadline.attr('datetime') || $deadline.attr('data-deadline') || $deadline.text().trim();
      if (dl) job.deadlineIsoString = dl;
    }
    const $salary = $c.find('.salary, [data-salary]').eq(0);
    if ($salary.length) {
      const sal = $salary.text().trim();
      const m = sal.match(/([$€£¥])?\s?([0-9]+(?:,[0-9]+)*)/);
      if (m) {
        job.salaryCurrency = m[1] || '';
        const num = parseFloat(m[2].replace(/,/g, ''));
        if (!isNaN(num)) job.salaryMin = num;
      }
    }
    const $desc = $c.find('.description, .summary, p').eq(0);
    if ($desc.length && (!$title || $desc.text().trim().length > 0)) job.description = $desc.text().trim();
    result.push(job);
  });
}