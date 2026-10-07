const sourceUrl =
  $('link[rel="canonical"]').attr('href') ||
  $('meta[property="og:url"]').attr('content') ||
  '';

const postedDateIsoString =
  $('meta[property="article:published_time"]').attr('content') ||
  $('meta[property="og:published_time"]').attr('content') ||
  '';

let companyName = '';
const pageTitle =
  $('meta[property="og:title"]').attr('content') ||
  $('title').text() ||
  '';
if (pageTitle) {
  const m = pageTitle.match(/Vacancies\s+At\s+([^,]+)/i);
  if (m) companyName = m[1].trim();
}

let content = $('.entry-content');
if (!content.length) content = $('article');
if (!content.length) content = $('body');

const jobKeywordPattern = /\b(assistant|analyst|engineer|manager|officer|specialist|coordinator|consultant|developer|designer|technician|clerk|sales|marketing|intern|trainee|director|lead|head)\b/i;

const headingSelector = 'h1, h2, h3, h4, h5, h6';
const headings = content.find(headingSelector).filter(function () {
  const txt = $(this).text().trim();
  return txt && jobKeywordPattern.test(txt);
});

headings.each(function () {
  const title = $(this).text().trim();
  if (!title) return;

  // Gather description until the next heading
  const descParts = [];
  let nxt = $(this).next();
  while (nxt.length && !nxt.is(headingSelector)) {
    const txt = nxt.text().trim();
    if (txt) descParts.push(txt);
    nxt = nxt.next();
  }
  const description = descParts.join('\n').trim();

  // Extract location
  let location = '';
  const locMatch = description.match(/Location[:\s]*([A-Za-z0-9 ,.-]+)/i);
  if (locMatch) location = locMatch[1].trim();

  // Extract job type
  let jobType = '';
  const typeMap = {
    full_time: /\bfull[-\s]?time\b/i,
    part_time: /\bpart[-\s]?time\b/i,
    contract: /\bcontract\b/i,
    internship: /\binternship\b/i,
    remote: /\bremote\b/i,
  };
  for (const [type, regex] of Object.entries(typeMap)) {
    if (regex.test(description)) {
      jobType = type;
      break;
    }
  }

  // Extract salary
  let salaryMin = null,
    salaryMax = null,
    salaryCurrency = null;
  const salaryRegex = /([\$€£]|USD|EUR|GBP|KES|TZS)?\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)(?:\s*[-–]\s*([\$€£]?|\bUSD\b|\bEUR\b|\bGBP\b|\bKES\b|\bTZS\b)?\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?))?/i;
  const salaryMatch = description.match(salaryRegex);
  if (salaryMatch) {
    const cur1 = salaryMatch[1] ? salaryMatch[1].replace(/[^A-Z$€£]/gi, '') : null;
    const cur2 = salaryMatch[3] ? salaryMatch[3].replace(/[^A-Z$€£]/gi, '') : null;
    salaryCurrency = cur1 || cur2 || null;
    const minVal = salaryMatch[2].replace(/,/g, '');
    salaryMin = parseFloat(minVal);
    if (salaryMatch[4]) {
      const maxVal = salaryMatch[4].replace(/,/g, '');
      salaryMax = parseFloat(maxVal);
    }
  }

  // Assemble job object
  const job = {
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
    salaryCurrency,
  };
  result.push(job);
});