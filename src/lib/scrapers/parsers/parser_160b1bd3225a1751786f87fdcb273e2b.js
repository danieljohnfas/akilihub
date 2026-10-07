var pageTitle = $('title').text().trim();
var company = $('meta[property="og:site_name"]').attr('content') || pageTitle;
var container = $('div.post-body');
if (container.length) {
  var headings = container.find('h2, h3, h4');
  headings.each(function () {
    var $el = $(this);
    var titleText = $el.text().trim();
    if (!titleText) return;
    var lower = titleText.toLowerCase();
    if (
      !(lower.includes('vacancy') ||
        lower.includes('job') ||
        lower.includes('position') ||
        lower.includes('opening'))
    ) {
      return;
    }
    var job = { title: titleText };
    job.companyName = company;
    var descParts = [];
    var next = $el.next();
    while (next.length && !next.is('h2, h3, h4')) {
      descParts.push(next.text().trim());
      next = next.next();
    }
    job.description = descParts.join('\n').trim();
    var locMatch = job.description.match(/location[:\s]*([^\n\r]+)/i);
    if (locMatch) job.location = locMatch[1].trim();
    var typeMap = {
      full_time: ['full time', 'full-time', 'permanent'],
      part_time: ['part time', 'part-time', 'temporary'],
      contract: ['contract', 'contractual'],
      internship: ['internship', 'intern', 'trainee'],
      remote: ['remote', 'work from home', 'wfh']
    };
    var lowerDesc = job.description.toLowerCase();
    for (var key in typeMap) {
      var arr = typeMap[key];
      for (var i = 0; i < arr.length; i++) {
        if (lowerDesc.includes(arr[i])) {
          job.jobType = key;
          break;
        }
      }
      if (job.jobType) break;
    }
    var src = $('meta[property="og:url"]').attr('content') || $('link[rel="canonical"]').attr('href');
    if (src) job.sourceUrl = src;
    var posted = $('meta[property="article:published_time"]').attr('content');
    if (posted) job.postedDateIsoString = posted;
    var deadlineMatch = job.description.match(/deadline[:\s]*([^\n\r]+)/i);
    if (deadlineMatch) {
      var d = new Date(deadlineMatch[1].trim());
      if (!isNaN(d)) job.deadlineIsoString = d.toISOString();
    }
    var salaryMatch = job.description.match(/salary[:\s]*([\d,]+)\s*([A-Z]{3}|[A-Za-z]{3,})/i);
    if (salaryMatch) {
      var amount = salaryMatch[1].replace(/,/g, '');
      job.salaryMin = Number(amount);
      job.salaryCurrency = salaryMatch[2];
    }
    result.push(job);
  });
}