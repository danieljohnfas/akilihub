var article = $('article, .post, .entry-content').first();
if (article.length) {
  var headings = article.find('h2, h3, h4');
  headings.each(function () {
    var title = $(this).text().trim();
    if (!title) return;
    var job = { title: title };
    var container = $(this);
    var sibling = container.next();
    var descriptionParts = [];
    while (sibling.length && !/^h[2-4]$/i.test(sibling[0].tagName)) {
      descriptionParts.push(sibling.text().trim());
      sibling = sibling.next();
    }
    if (descriptionParts.length) job.description = descriptionParts.join('\n').trim();
    var fullText = container.parent().text();
    var locMatch = fullText.match(/Location[:\s]+([^\n\r]+)/i);
    if (locMatch) job.location = locMatch[1].trim();
    var typeMatch = fullText.match(/Job\s*Type[:\s]+([^\n\r]+)/i);
    if (typeMatch) {
      var type = typeMatch[1].toLowerCase();
      if (/full.?time/.test(type)) job.jobType = 'full_time';
      else if (/part.?time/.test(type)) job.jobType = 'part_time';
      else if (/contract/.test(type)) job.jobType = 'contract';
      else if (/intern/.test(type)) job.jobType = 'internship';
      else if (/remote/.test(type)) job.jobType = 'remote';
    }
    var salaryMatch = fullText.match(/Salary[:\s]+(?:([A-Z]{3})\s*)?([\d,]+)\s*(?:[-–]\s*(?:([A-Z]{3})\s*)?([\d,]+))?/i);
    if (salaryMatch) {
      var cur = salaryMatch[1] || salaryMatch[3] || '';
      if (cur) job.salaryCurrency = cur;
      if (salaryMatch[2]) job.salaryMin = Number(salaryMatch[2].replace(/,/g, ''));
      if (salaryMatch[4]) job.salaryMax = Number(salaryMatch[4].replace(/,/g, ''));
    }
    var ogUrl = $('meta[property="og:url"]').attr('content');
    if (ogUrl) job.sourceUrl = ogUrl;
    var pubDate = $('meta[property="article:published_time"]').attr('content');
    if (pubDate) job.postedDateIsoString = pubDate;
    var deadlineMatch = fullText.match(/Application\s*Deadline[:\s]+([^\n\r]+)/i);
    if (deadlineMatch) {
      var d = new Date(deadlineMatch[1].trim());
      if (!isNaN(d)) job.deadlineIsoString = d.toISOString();
    }
    result.push(job);
  });
}