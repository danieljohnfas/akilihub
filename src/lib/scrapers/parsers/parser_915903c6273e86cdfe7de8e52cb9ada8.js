var articleTitle = $('title').first().text().trim();
var company = null;
if (articleTitle) {
  var match = articleTitle.match(/^(.*?)\s+Yatangaza/i);
  if (match) {
    company = match[1].trim();
  }
}
var sourceUrl = $('link[rel="canonical"]').attr('href') || $('meta[property="og:url"]').attr('content') || null;
var posted = $('meta[property="article:published_time"], meta[name="article:published_time"]').attr('content') || null;
var postedIso = posted ? new Date(posted).toISOString() : null;
var keywords = ['Assistant','Lecturer','Engineer','Manager','Officer','Coordinator','Specialist','Technician','Analyst','Supervisor','Consultant'];
var jobElems = $('li').filter(function(){
  var txt = $(this).text().trim();
  if (!txt) return false;
  for (var i = 0; i < keywords.length; i++) {
    if (txt.toLowerCase().includes(keywords[i].toLowerCase())) return true;
  }
  return false;
});
jobElems.each(function(){
  var txt = $(this).text().trim();
  var title = txt;
  var dashIdx = txt.indexOf(' - ');
  if (dashIdx === -1) dashIdx = txt.indexOf(' – ');
  if (dashIdx > 0) title = txt.substring(0, dashIdx).trim();
  result.push({
    title: title,
    companyName: company,
    description: txt,
    location: null,
    jobType: null,
    sourceUrl: sourceUrl,
    postedDateIsoString: postedIso,
    deadlineIsoString: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null
  });
});