let title = ($('meta[property="og:title"]').attr('content') || $('title').text()).trim();
let sourceUrl = ($('meta[property="og:url"]').attr('content') || '').trim();
let description = '';
let descContainer = $('.post-body, .entry-content, article, .content, .post');
if (descContainer.length) description = descContainer.text().trim();
let companyName = '';
if (title) {
  let parts = title.split('-');
  if (parts.length > 1) companyName = parts.slice(-1)[0].trim();
}
let location = '';
if (description) {
  let locMatch = description.match(/\b(Tanga|Dar\s+es\s+Salaam|Arusha|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
  if (locMatch) location = locMatch[0];
}
let postedDateIsoString = ($('meta[property="article:published_time"]').attr('content') || '').trim();
let deadlineIsoString = ($('meta[property="article:expiration_time"]').attr('content') || '').trim();
let salaryMin = null, salaryMax = null, salaryCurrency = null;
if (description) {
  let salaryMatch = description.match(/(\$|USD|KES|TZS|£|EUR)\s?([\d,]+)(?:\s?[-–]\s?(?:\$|USD|KES|TZS|£|EUR)?\s?([\d,]+))?/i);
  if (salaryMatch) {
    salaryCurrency = salaryMatch[1].replace(/[^\w]/g, '');
    salaryMin = parseInt(salaryMatch[2].replace(/,/g, ''), 10);
    if (salaryMatch[3]) salaryMax = parseInt(salaryMatch[3].replace(/,/g, ''), 10);
  }
}
if (title && /job|career|opportunity|vacancy|position|opening/i.test(title) && description) {
  result.push({
    title: title,
    companyName: companyName || undefined,
    description: description,
    location: location || undefined,
    jobType: undefined,
    sourceUrl: sourceUrl || undefined,
    postedDateIsoString: postedDateIsoString || undefined,
    deadlineIsoString: deadlineIsoString || undefined,
    salaryMin: salaryMin,
    salaryMax: salaryMax,
    salaryCurrency: salaryCurrency
  });
}