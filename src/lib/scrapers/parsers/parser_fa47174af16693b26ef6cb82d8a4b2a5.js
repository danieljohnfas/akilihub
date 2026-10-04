const sourceUrl = $('link[rel="canonical"]').attr('href') || '';
let postedDateIsoString = null;
const urlDateMatch = sourceUrl.match(/\/(\d{4})\/(\d{2})\//);
if (urlDateMatch) {
  postedDateIsoString = new Date(`${urlDateMatch[1]}-${urlDateMatch[2]}-01T00:00:00Z`).toISOString();
}
$('h2, h3').each((_, el) => {
  const title = $(el).text().trim();
  if (!title) return;
  let desc = '';
  let next = $(el).next();
  while (next.length && !next.is('h2, h3')) {
    desc += ' ' + next.text().trim();
    next = next.next();
  }
  desc = desc.trim();
  const locationMatch = desc.match(/Location[:\s]*([\w ,.-]+)/i);
  const location = locationMatch ? locationMatch[1].trim() : null;
  const lowerDesc = desc.toLowerCase();
  let jobType = null;
  if (lowerDesc.includes('full-time') || lowerDesc.includes('full time')) jobType = 'full_time';
  else if (lowerDesc.includes('part-time') || lowerDesc.includes('part time')) jobType = 'part_time';
  else if (lowerDesc.includes('contract')) jobType = 'contract';
  else if (lowerDesc.includes('internship') || lowerDesc.includes('intern')) jobType = 'internship';
  else if (lowerDesc.includes('remote')) jobType = 'remote';
  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  const salaryMatch = desc.match(/([\$£€]\s?\d[\d,]*)\s?[-–]\s?([\$£€]?\s?\d[\d,]*)\s?([A-Z]{3})?/i);
  if (salaryMatch) {
    const parseAmount = s => Number(s.replace(/[^0-9.]/g, ''));
    salaryMin = parseAmount(salaryMatch[1]);
    salaryMax = parseAmount(salaryMatch[2]);
    salaryCurrency = salaryMatch[3] ? salaryMatch[3].toUpperCase() : (salaryMatch[1].trim()[0] || '').replace(/[^A-Z]/g, '');
  }
  const job = {
    title,
    companyName: null,
    description: desc || null,
    location,
    jobType,
    sourceUrl,
    postedDateIsoString,
    deadlineIsoString: null,
    salaryMin,
    salaryMax,
    salaryCurrency
  };
  result.push(job);
});