var title = $('h3.post-title').first().text().trim() || $('.post-title').first().text().trim() || $('h1').first().text().trim();
if (title && title.length > 0) {
  var desc = $('.post-body').first().text().trim() || $('.entry-content').first().text().trim() || $('[itemprop="description"]').first().text().trim();
  var url = $('link[rel="canonical"]').attr('href') || '';
  var metaDesc = $('meta[name="description"]').attr('content') || '';
  var companyMatch = metaDesc.match(/Organization:\s*(.+?)(?:\s*Position|$)/);
  var locationMatch = metaDesc.match(/Location:\s*(.+?)(?:\s*\(|$)/);
  var companyName = companyMatch ? companyMatch[1].trim() : '';
  var location = locationMatch ? locationMatch[1].trim() : '';
  if (!companyName && desc) {
    var orgMatch = desc.match(/Organization[:\s]+(.+?)(?:\n|$)/);
    if (orgMatch) companyName = orgMatch[1].trim();
  }
  if (!location && desc) {
    var locMatch = desc.match(/Location[:\s]+(.+?)(?:\n|$)/);
    if (locMatch) location = locMatch[1].trim();
  }
  var jobType = '';
  if (desc) {
    var dtLower = desc.toLowerCase();
    if (dtLower.indexOf('full-time') !== -1 || dtLower.indexOf('full time') !== -1) jobType = 'full_time';
    else if (dtLower.indexOf('part-time') !== -1 || dtLower.indexOf('part time') !== -1) jobType = 'part_time';
    else if (dtLower.indexOf('contract') !== -1) jobType = 'contract';
    else if (dtLower.indexOf('internship') !== -1) jobType = 'internship';
    else if (dtLower.indexOf('remote') !== -1) jobType = 'remote';
  }
  var postedDateIsoString = '';
  var deadlineIsoString = '';
  var dateText = title.match(/February\s+2026/i);
  if (dateText) postedDateIsoString = '2026-02-01T00:00:00.000Z';
  result.push({
    title: title,
    companyName: companyName,
    description: desc,
    location: location,
    jobType: jobType,
    sourceUrl: url,
    postedDateIsoString: postedDateIsoString,
    deadlineIsoString: deadlineIsoString,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: ''
  });
}