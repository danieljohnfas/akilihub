var $jobEls = $('.entry-content .job, .entry-content .vacancy, .entry-content li.job, article .job, .job-posting, .vacancy-listing');
if ($jobEls.length === 0) {
  $jobEls = $('.entry-content h2, .entry-content h3, .entry-content strong').filter(function() {
    var txt = $(this).text().trim();
    return /officer|engineer|assistant|manager|specialist|analyst|technician|supervisor|coordinator|consultant/i.test(txt);
  }).map(function() { return $(this).parent(); }).get();
}
$jobEls.each(function() {
  var $job = $(this);
  var title = $job.find('.job-title, h2, h3, .title').first().text().trim();
  if (!title) {
    var firstLine = $job.text().split('\n')[0];
    title = firstLine.trim();
  }
  if (!title) return;
  var companyName = '';
  var $company = $job.find('.company, .employer, [itemprop="hiringOrganization"]').first();
  if ($company.length) {
    companyName = $company.text().trim();
  } else {
    var m = $job.text().match(/Company:\s*([^\n]+)/i);
    if (m) companyName = m[1].trim();
  }
  var location = '';
  var $loc = $job.find('.location, [itemprop="jobLocation"]').first();
  if ($loc.length) {
    location = $loc.text().trim();
  } else {
    var m = $job.text().match(/Location:\s*([^\n]+)/i);
    if (m) location = m[1].trim();
  }
  var description = $job.find('.description, .job-description, .summary').first().text().trim();
  if (!description) description = $job.text().trim();
  var jobType = '';
  var lowerTxt = $job.text().toLowerCase();
  if (/full[- ]time/.test(lowerTxt)) jobType = 'full_time';
  else if (/part[- ]time/.test(lowerTxt)) jobType = 'part_time';
  else if (/contract/.test(lowerTxt)) jobType = 'contract';
  else if (/intern/.test(lowerTxt)) jobType = 'internship';
  else if (/remote/.test(lowerTxt)) jobType = 'remote';
  var sourceUrl = '';
  var postedDateIsoString = '';
  var $date = $job.find('.date, .posted-date, time').first();
  if ($date.length) {
    var dateStr = $date.attr('datetime') || $date.text().trim();
    var parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) postedDateIsoString = parsed.toISOString();
  }
  var deadlineIsoString = '';
  var $deadline = $job.find('.deadline, .closing-date').first();
  if ($deadline.length) {
    var dlStr = $deadline.attr('datetime') || $deadline.text().trim();
    var parsed = new Date(dlStr);
    if (!isNaN(parsed.getTime())) deadlineIsoString = parsed.toISOString();
  }
  var salaryMin = null, salaryMax = null, salaryCurrency = '';
  var salaryText = $job.find('.salary, .remuneration').first().text() || $job.text();
  var m = salaryText.match(/(\d[\d,\s]*)\s*[-–]\s*(\d[\d,\s]*)\s*(\w+)/);
  if (m) {
    salaryMin = parseInt(m[1].replace(/[^\d]/g,''),10);
    salaryMax = parseInt(m[2].replace(/[^\d]/g,''),10);
    salaryCurrency = m[3];
  } else {
    var m2 = salaryText.match(/(\d[\d,\s]*)\s*(\w+)/);
    if (m2) {
      salaryMin = parseInt(m2[1].replace(/[^\d]/g,''),10);
      salaryCurrency = m2[2];
    }
  }
  result.push({
    title: title,
    companyName: companyName,
    description: description,
    location: location,
    jobType: jobType,
    sourceUrl: sourceUrl,
    postedDateIsoString: postedDateIsoString,
    deadlineIsoString: deadlineIsoString,
    salaryMin: salaryMin,
    salaryMax: salaryMax,
    salaryCurrency: salaryCurrency
  });
});