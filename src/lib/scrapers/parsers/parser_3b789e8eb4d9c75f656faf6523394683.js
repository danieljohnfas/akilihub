const jobCards = $('div[class*="card"]:has(a[href*="/job/"]), div[class*="project"]:has(a[href*="/job/"]), article[class*="job"], div[class*="job-listing"], .job-item, .project-item');
if (jobCards.length === 0) {
  $('a[href*="/job/"]').each((i, a) => {
    const card = $(a).closest('div[class], article[class], li[class]');
    if (card.length && !card.hasClass('navbar') && !card.hasClass('footer') && !card.hasClass('header')) {
      jobCards.push(card[0]);
    }
  });
}
const seen = new Set();
jobCards.each((i, el) => {
  const $card = $(el);
  const titleEl = $card.find('h2, h3, h4, .title, [class*="title"]').first();
  const title = titleEl.text().trim();
  if (!title || seen.has(title)) return;
  seen.add(title);
  const linkEl = $card.find('a[href*="/job/"]').first();
  let sourceUrl = linkEl.attr('href') || '';
  if (sourceUrl && !sourceUrl.startsWith('http')) sourceUrl = 'https://www.twine.net' + sourceUrl;
  const companyEl = $card.find('[class*="company"], [class*="client"], [class*="employer"]').first();
  const companyName = companyEl.text().trim() || 'Twine Client';
  const locationEl = $card.find('[class*="location"], [class*="city"], [class*="country"]').first();
  const location = locationEl.text().trim() || 'Mbeya, Tanzania';
  const descEl = $card.find('[class*="description"], [class*="excerpt"], [class*="summary"], p').first();
  const description = descEl.text().trim().slice(0, 500);
  const typeEl = $card.find('[class*="type"], [class*="contract"], [class*="remote"]').first();
  const typeText = typeEl.text().toLowerCase();
  let jobType = 'contract';
  if (typeText.includes('full')) jobType = 'full_time';
  else if (typeText.includes('part')) jobType = 'part_time';
  else if (typeText.includes('intern')) jobType = 'internship';
  else if (typeText.includes('remote')) jobType = 'remote';
  const dateEl = $card.find('time, [class*="date"], [class*="posted"]').first();
  let postedDateIsoString = '';
  const datetime = dateEl.attr('datetime');
  if (datetime) postedDateIsoString = datetime;
  else {
    const dateText = dateEl.text().trim();
    const parsed = Date.parse(dateText);
    if (!isNaN(parsed)) postedDateIsoString = new Date(parsed).toISOString();
  }
  const salaryEl = $card.find('[class*="salary"], [class*="budget"], [class*="rate"]').first();
  const salaryText = salaryEl.text().trim();
  let salaryMin = null, salaryMax = null, salaryCurrency = 'USD';
  const salaryMatch = salaryText.match(/([$£€])?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*[-–]\s*([$£€])?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/);
  if (salaryMatch) {
    salaryCurrency = salaryMatch[1] || salaryMatch[3] || '$';
    salaryMin = parseFloat(salaryMatch[2].replace(/,/g, ''));
    salaryMax = parseFloat(salaryMatch[4].replace(/,/g, ''));
  } else {
    const singleMatch = salaryText.match(/([$£€])\s*(\d+(?:,\d{3})*(?:\.\d+)?)/);
    if (singleMatch) {
      salaryCurrency = singleMatch[1];
      salaryMin = salaryMax = parseFloat(singleMatch[2].replace(/,/g, ''));
    }
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