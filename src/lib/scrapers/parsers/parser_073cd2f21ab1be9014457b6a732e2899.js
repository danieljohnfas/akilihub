let job = {};

let titleMeta = $('meta[property="og:title"]').attr('content');
let titleTag = $('title').text();
let title = (titleMeta || titleTag || '').trim();
if (title) job.title = title;

if (title && / at /i.test(title)) {
  let afterAt = title.split(/ at /i)[1];
  let company = afterAt.split(/[-–|]/)[0].trim();
  if (company) job.companyName = company;
}

let descContainer = $('.entry-content, .post-content, article, .content').first();
let description = descContainer.text().trim();
if (description) job.description = description;

let posted = $('meta[property="article:published_time"]').attr('content') ||
             $('meta[property="og:published_time"]').attr('content');
if (posted) job.postedDateIsoString = posted;

let source = $('meta[property="og:url"]').attr('content');
if (source) job.sourceUrl = source;

if (description) {
  let locMatch = description.match(/Location[:\s]+([A-Za-z0-9 ,\-\+]+)/i);
  if (locMatch) job.location = locMatch[1].trim();

  let typeMatch = description.match(/Job\s*Type[:\s]+(\w+)/i);
  if (typeMatch) {
    const map = {fulltime:'full_time',parttime:'part_time',contract:'contract',internship:'internship',remote:'remote'};
    let key = typeMatch[1].toLowerCase();
    job.jobType = map[key] || key;
  }

  let salaryMatch = description.match(/Salary[:\s]+(?:([A-Z]{3})\s*)?([\d,]+)\s*[-–]\s*(?:([A-Z]{3})\s*)?([\d,]+)/i);
  if (salaryMatch) {
    let cur = salaryMatch[1] || salaryMatch[3] || '';
    if (cur) job.salaryCurrency = cur;
    job.salaryMin = parseInt(salaryMatch[2].replace(/,/g, ''), 10);
    job.salaryMax = parseInt(salaryMatch[4].replace(/,/g, ''), 10);
  }
}

if (job.title) result.push(job);