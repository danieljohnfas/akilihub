var jobLinks = $('a[href*="/map/vacancy/"]');
if (jobLinks.length) {
  jobLinks.each(function () {
    var $link = $(this);
    var title = $link.text().trim();
    if (!title) return;
    var $container = $link.closest('.vacancy, .vacancy-item, .job, .list-group-item, .panel, .col-md-12');
    var job = { title: title };
    var company = $container.find('.company, .org, .organization, .company-name').first().text().trim();
    if (company) job.companyName = company;
    var location = $container.find('.location, .city, .place').first().text().trim();
    if (location) job.location = location;
    var description = $container.find('.description, .summary, p').first().text().trim();
    if (description) job.description = description;
    var typeText = $container.text().toLowerCase();
    if (/full[-\s]?time/.test(typeText)) job.jobType = 'full_time';
    else if (/part[-\s]?time/.test(typeText)) job.jobType = 'part_time';
    else if (/contract/.test(typeText)) job.jobType = 'contract';
    else if (/internship/.test(typeText)) job.jobType = 'internship';
    else if (/remote/.test(typeText)) job.jobType = 'remote';
    var href = $link.attr('href');
    if (href) {
      if (!href.match(/^https?:\/\//i)) {
        var baseMatch = html.match(/<base\s+href=["']([^"']+)["']/i);
        var base = baseMatch ? baseMatch[1].replace(/\/+$/, '') : '';
        job.sourceUrl = base ? base + '/' + href.replace(/^\/+/, '') : href;
      } else {
        job.sourceUrl = href;
      }
    }
    var $posted = $container.find('time[datetime], .posted, .date').first();
    if ($posted.length) {
      var iso = $posted.attr('datetime') || $posted.text().trim();
      if (iso) {
        var d = new Date(iso);
        if (!isNaN(d)) job.postedDateIsoString = d.toISOString();
      }
    }
    var $deadline = $container.find('.deadline, .closing, .deadline-date').first();
    if ($deadline.length) {
      var iso2 = $deadline.attr('datetime') || $deadline.text().trim();
      if (iso2) {
        var d2 = new Date(iso2);
        if (!isNaN(d2)) job.deadlineIsoString = d2.toISOString();
      }
    }
    var salaryText = $container.text();
    var salaryMatch = salaryText.match(/([A-Z]{3})?\s?\$?([\d,]+)\s?[–-]\s?\$?([\d,]+)/i);
    if (salaryMatch) {
      job.salaryCurrency = (salaryMatch[1] || '').trim();
      job.salaryMin = parseInt(salaryMatch[2].replace(/,/g, ''), 10);
      job.salaryMax = parseInt(salaryMatch[3].replace(/,/g, ''), 10);
    }
    result.push(job);
  });
}