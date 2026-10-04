const sourceUrl = $('meta[property="og:url"]').attr('content')?.trim() || '';
const postedDateIsoString = $('meta[property="article:published_time"]').attr('content')?.trim() || '';
const contentContainer = $('.entry-content').length ? $('.entry-content') : $('article').length ? $('article') : $('body');
const headings = contentContainer.find('h1, h2, h3, h4, h5, h6');

headings.each((_, heading) => {
  const $heading = $(heading);
  const title = $heading.text().trim();
  if (!title) return;

  // Gather description text until the next heading
  let descriptionParts = [];
  let $next = $heading.next();
  while ($next.length && !$next.is('h1, h2, h3, h4, h5, h6')) {
    descriptionParts.push($next.text().trim());
    $next = $next.next();
  }
  const description = descriptionParts.filter(Boolean).join('\n').trim();
  if (!description) return;

  const lowerDesc = description.toLowerCase();

  // Location extraction
  let location = '';
  const locMatch = description.match(/location[:\s]+([^\n]+)/i);
  if (locMatch) location = locMatch[1].trim();

  // Job type extraction
  let jobType = '';
  if (lowerDesc.includes('full time')) jobType = 'full_time';
  else if (lowerDesc.includes('part time')) jobType = 'part_time';
  else if (lowerDesc.includes('contract')) jobType = 'contract';
  else if (lowerDesc.includes('internship') || lowerDesc.includes('intern')) jobType = 'internship';
  else if (lowerDesc.includes('remote')) jobType = 'remote';

  // Salary extraction
  let salaryMin = null;
  let salaryMax = null;
  let salaryCurrency = null;
  const salaryRegex = /([\d,.]+)\s*(?:-|–|to)\s*([\d,.]+)\s*([A-Z]{3}|USD|EUR|GBP|KES|TZS|UGX|NGN)?/i;
  const singleSalaryRegex = /([\d,.]+)\s*([A-Z]{3}|USD|EUR|GBP|KES|TZS|UGX|NGN)?/i;
  const salaryMatch = description.match(salaryRegex);
  if (salaryMatch) {
    salaryMin = parseFloat(salaryMatch[1].replace(/,/g, ''));
    salaryMax = parseFloat(salaryMatch[2].replace(/,/g, ''));
    salaryCurrency = salaryMatch[3] ? salaryMatch[3].toUpperCase() : null;
  } else {
    const singleMatch = description.match(singleSalaryRegex);
    if (singleMatch) {
      salaryMin = salaryMax = parseFloat(singleMatch[1].replace(/,/g, ''));
      salaryCurrency = singleMatch[2] ? singleMatch[2].toUpperCase() : null;
    }
  }

  // Company name extraction (fallback to meta author or first paragraph)
  let companyName = '';
  const authorMeta = $('meta[name="author"]').attr('content');
  if (authorMeta) companyName = authorMeta.trim();
  if (!companyName) {
    const firstPara = contentContainer.find('p').first().text();
    const compMatch = firstPara.match(/(?:company|employer)[:\s]+([^\.\n]+)/i);
    if (compMatch) companyName = compMatch[1].trim();
  }

  result.push({
    title,
    companyName: companyName || null,
    description: description || null,
    location: location || null,
    jobType: jobType || null,
    sourceUrl: sourceUrl || null,
    postedDateIsoString: postedDateIsoString || null,
    deadlineIsoString: null,
    salaryMin,
    salaryMax,
    salaryCurrency: salaryCurrency || null
  });
});