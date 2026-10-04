var sourceUrl = $('meta[property="og:url"]').attr('content') || '';
var pageTitle = $('title').text() || '';
var defaultCompany = pageTitle.toLowerCase().includes('united nations') ? 'United Nations' : '';
var headings = $('h1, h2, h3, h4, h5, h6');
headings.each(function (_, elem) {
  var $head = $(elem);
  var titleText = $head.text().trim();
  if (!titleText) return;
  var lowerTitle = titleText.toLowerCase();
  if (lowerTitle.includes('related') || lowerTitle.includes('comment') || lowerTitle.includes('share')) return;
  var jobKeywords = ['vacancy', 'position', 'job', 'opportunity', 'opening', 'career'];
  var isJob = jobKeywords.some(function (kw) { return lowerTitle.includes(kw); });
  if (!isJob) return;
  var descParts = [];
  var $next = $head.next();
  while ($next.length && !$next.is('h1, h2, h3, h4, h5, h6')) {
    if ($next.is('p, div, li')) {
      var txt = $next.text().trim();
      if (txt) descParts.push(txt);
    }
    $next = $next.next();
  }
  var description = descParts.join(' ');
  var job = {
    title: titleText,
    description: description,
    sourceUrl: sourceUrl,
    companyName: defaultCompany
  };
  var locMatch = description.match(/location[:\s]+([^\n\r\.]+)/i);
  if (locMatch) job.location = locMatch[1].trim();
  var postedMatch = description.match(/posted[:\s\-]+([A-Za-z0-9 ,\/\-\:]+)/i);
  if (postedMatch) {
    var d = new Date(postedMatch[1]);
    if (!isNaN(d.getTime())) job.postedDateIsoString = d.toISOString();
  }
  var deadlineMatch = description.match(/deadline[:\s]+([A-Za-z0-9 ,\/\-\:]+)/i);
  if (deadlineMatch) {
    var d2 = new Date(deadlineMatch[1]);
    if (!isNaN(d2.getTime())) job.deadlineIsoString = d2.toISOString();
  }
  var salaryMatch = description.match(/salary[:\s]+([\d,]+)\s*[-to]+\s*([\d,]+)\s*([A-Z]{3})/i);
  if (salaryMatch) {
    job.salaryMin = parseInt(salaryMatch[1].replace(/,/g, ''), 10);
    job.salaryMax = parseInt(salaryMatch[2].replace(/,/g, ''), 10);
    job.salaryCurrency = salaryMatch[3];
  }
  var typeMap = {
    full_time: /full[-\s]?time/i,
    part_time: /part[-\s]?time/i,
    contract: /contract/i,
    internship: /internship/i,
    remote: /remote/i
  };
  for (var key in typeMap) {
    if (typeMap[key].test(description)) {
      job.jobType = key;
      break;
    }
  }
  result.push(job);
});