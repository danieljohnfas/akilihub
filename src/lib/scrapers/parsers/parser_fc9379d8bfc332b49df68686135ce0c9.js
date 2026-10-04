var jobSelectors = ['.ajzjp-job-item', '.job-item', '.job-listing', 'article.job', 'li.job'];
var $jobs = $(jobSelectors.join(', '));
$jobs.each(function () {
  var $job = $(this);
  var title = $job.find('.ajzjp-job-title, .job-title, h2, h3').first().text().trim();
  if (!title) return;
  var companyName = $job.find('.ajzjp-company, .company-name, .employer, .company').first().text().trim() || null;
  var location = $job.find('.ajzjp-location, .job-location, .location').first().text().trim() || null;
  var description = $job.find('.ajzjp-description, .job-description, .summary, .desc').first().text().trim() || null;
  var jobTypeText = $job.find('.ajzjp-job-type, .job-type, .type, .employment-type').first().text().trim().toLowerCase();
  var jobType = null;
  if (/full[-_]?time/.test(jobTypeText)) jobType = 'full_time';
  else if (/part[-_]?time/.test(jobTypeText)) jobType = 'part_time';
  else if (/contract/.test(jobTypeText)) jobType = 'contract';
  else if (/intern/.test(jobTypeText)) jobType = 'internship';
  else if (/remote/.test(jobTypeText)) jobType = 'remote';
  var sourceUrl = $job.find('a').first().attr('href') || null;
  var postedDateRaw = $job.find('.ajzjp-posted-date, .posted-date, .date-posted, time').first().attr('datetime') || $job.find('.ajzjp-posted-date, .posted-date, .date-posted, time').first().text().trim();
  var postedDateIsoString = postedDateRaw ? new Date(postedDateRaw).toISOString() : null;
  var deadlineRaw = $job.find('.ajzjp-deadline, .deadline, .application-deadline, .expires').first().attr('datetime') || $job.find('.ajzjp-deadline, .deadline, .application-deadline, .expires').first().text().trim();
  var deadlineIsoString = deadlineRaw ? new Date(deadlineRaw).toISOString() : null;
  var salaryText = $job.find('.ajzjp-salary, .salary, .wage, .remuneration').first().text().trim();
  var salaryMin = null, salaryMax = null, salaryCurrency = null;
  if (salaryText) {
    var currencyMatch = salaryText.match(/([A-Z]{3}|[$£€])/);
    if (currencyMatch) {
      var cur = currencyMatch[0];
      if (cur === '$') cur = 'USD';
      else if (cur === '£') cur = 'GBP';
      else if (cur === '€') cur = 'EUR';
      salaryCurrency = cur;
    }
    var numbers = salaryText.match(/\d[\d,]*(\.\d+)?/g).map(function (n) { return parseFloat(n.replace(/,/g, '')); });
    if (numbers.length >= 2) {
      salaryMin = numbers[0];
      salaryMax = numbers[1];
    } else if (numbers.length === 1) {
      salaryMin = numbers[0];
      salaryMax = numbers[0];
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