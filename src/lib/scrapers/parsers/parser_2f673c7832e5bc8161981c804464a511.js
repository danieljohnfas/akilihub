const sourceUrl = $('meta[property="og:url"]').attr('content')?.trim() || '';
const postedDateIsoString = $('meta[property="article:published_time"]').attr('content')?.trim() || '';
const pageTitle = $('title').text().trim();
let companyName = '';
if (pageTitle) {
  const compMatch = pageTitle.match(/^([^:|—-]+?)\s+Vacancies/i);
  if (compMatch) companyName = compMatch[1].trim();
}
const contentRoot = $('.entry-content, .post-content, article').first().length ? $('.entry-content, .post-content, article').first() : $('body');

contentRoot.find('h2, h3, h4').each((_, elem) => {
  const $heading = $(elem);
  const title = $heading.text().trim();
  if (!title) return;

  // Gather description until the next heading of same or higher level
  const nextHeadings = $heading.nextAll('h2, h3, h4');
  const $descElems = nextHeadings.length ? $heading.nextUntil(nextHeadings.first()) : $heading.nextAll();
  const description = $descElems.map((i, el) => $(el).text().trim()).get().join(' ').replace(/\s+/g, ' ');

  // Simple location detection (looking for capitalized words or common patterns)
  let location = '';
  const locMatch = description.match(/(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (locMatch) location = locMatch[1];

  // Job type detection
  let jobType = '';
  const lowerDesc = description.toLowerCase();
  if (/full[-\s]?time/.test(lowerDesc)) jobType = 'full_time';
  else if (/part[-\s]?time/.test(lowerDesc)) jobType = 'part_time';
  else if (/contract/.test(lowerDesc)) jobType = 'contract';
  else if (/internship/.test(lowerDesc)) jobType = 'internship';
  else if (/remote/.test(lowerDesc)) jobType = 'remote';

  // Salary detection (first numeric range found)
  let salaryMin = null;
  let salaryMax = null;
  let salaryCurrency = null;
  const salaryMatch = description.match(/([£$€])\s?(\d{1,3}(?:[,\d]*\d)?)(?:\s?[-–]\s?([£$€])?\s?(\d{1,3}(?:[,\d]*\d)?))?/);
  if (salaryMatch) {
    salaryCurrency = salaryMatch[1] || salaryMatch[3] || null;
    salaryMin = Number(salaryMatch[2].replace(/,/g, '')) || null;
    if (salaryMatch[4]) salaryMax = Number(salaryMatch[4].replace(/,/g, '')) || null;
  }

  result.push({
    title,
    companyName,
    description,
    location,
    jobType,
    sourceUrl,
    postedDateIsoString,
    deadlineIsoString: '',
    salaryMin,
    salaryMax,
    salaryCurrency
  });
});