var jobs = [];
$('div.job, article.job, li.job, .job-listing, .vacancy, .position').each(function(){
 var $el = $(this);
 var title = $el.find('h2, h3, .job-title, .title').first().text().trim();
 if(!title) return;
 var companyName = $el.find('.company, .company-name, .employer').first().text().trim();
 var location = $el.find('.location, .job-location').first().text().trim();
 var description = $el.find('.description, .summary, .job-description').first().text().trim();
 var jobTypeText = $el.find('.job-type, .employment-type').first().text().trim();
 var jobType = '';
 if(jobTypeText){
  var lower = jobTypeText.toLowerCase();
  if(lower.includes('full')) jobType = 'full_time';
  else if(lower.includes('part')) jobType = 'part_time';
  else if(lower.includes('contract')) jobType = 'contract';
  else if(lower.includes('intern')) jobType = 'internship';
  else if(lower.includes('remote')) jobType = 'remote';
 }
 var sourceUrl = $el.find('a').first().attr('href') || '';
 var postedDateText = $el.find('.date, .posted-date').first().text().trim();
 var postedDateIsoString = '';
 if(postedDateText){
  var parsed = new Date(postedDateText);
  if(!isNaN(parsed.getTime())) postedDateIsoString = parsed.toISOString();
 }
 var deadlineText = $el.find('.deadline, .application-deadline').first().text().trim();
 var deadlineIsoString = '';
 if(deadlineText){
  var parsed = new Date(deadlineText);
  if(!isNaN(parsed.getTime())) deadlineIsoString = parsed.toISOString();
 }
 var salaryText = $el.find('.salary, .compensation').first().text().trim();
 var salaryMin = null, salaryMax = null, salaryCurrency = '';
 if(salaryText){
  var match = salaryText.match(/([\d\s,]+)\s*[-–]\s*([\d\s,]+)\s*([^\d\s]+)/);
  if(match){
   salaryMin = parseInt(match[1].replace(/[\s,]/g,''),10);
   salaryMax = parseInt(match[2].replace(/[\s,]/g,''),10);
   salaryCurrency = match[3].trim();
  }else{
   var singleMatch = salaryText.match(/([\d\s,]+)\s*([^\d\s]+)/);
   if(singleMatch){
    salaryMin = parseInt(singleMatch[1].replace(/[\s,]/g,''),10);
    salaryMax = salaryMin;
    salaryCurrency = singleMatch[2].trim();
   }
  }
 }
 jobs.push({
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
result.push.apply(result, jobs);