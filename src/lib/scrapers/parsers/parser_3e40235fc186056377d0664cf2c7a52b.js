// Extract title tag text
const pageTitle = $('title').first().text().trim();

// Try to match pattern: "Career Opportunity: <Job Title> at <Company> (<Location>)"
const jobMatch = pageTitle.match(/Career Opportunity:\s*([^@]+?)\s+at\s+([^(\r\n]+?)\s*\(([^)]+)\)/i);

if (jobMatch) {
  const [, rawTitle, rawCompany, rawLocation] = jobMatch;

  const job = {
    title: rawTitle.trim(),
    companyName: rawCompany.trim(),
    location: rawLocation.trim(),
    description: '',
    sourceUrl: '',
    postedDateIsoString: '',
    deadlineIsoString: '',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: '',
    jobType: ''
  };

  // Description from meta description if available
  const metaDesc = $('meta[name="description"]').attr('content');
  if (metaDesc) job.description = metaDesc.trim();

  // Source URL from canonical link
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) job.sourceUrl = canonical.trim();

  // Attempt to extract salary range (e.g., "5M - 6M" or "5000 - 7000")
  const salaryText = job.description;
  const salaryMatch = salaryText && salaryText.match(/(\d+(?:[.,]\d+)?)(\s*[MK]?M?)?\s*[-–]\s*(\d+(?:[.,]\d+)?)(\s*[MK]?M?)/i);
  if (salaryMatch) {
    let min = parseFloat(salaryMatch[1].replace(/[,]/g, '.'));
    let max = parseFloat(salaryMatch[3].replace(/[,]/g, '.'));
    const minUnit = salaryMatch[2] ? salaryMatch[2].toUpperCase().replace(/\s/g, '') : '';
    const maxUnit = salaryMatch[4] ? salaryMatch[4].toUpperCase().replace(/\s/g, '') : '';

    const unitFactor = unit => {
      if (unit.includes('M')) return 1_000_000;
      if (unit.includes('K')) return 1_000;
      return 1;
    };

    job.salaryMin = min * unitFactor(minUnit);
    job.salaryMax = max * unitFactor(maxUnit);
    job.salaryCurrency = ''; // not provided in sample
  }

  // Optional: infer job type from keywords in description or title
  const typeMap = {
    full_time: /full[-\s]?time/i,
    part_time: /part[-\s]?time/i,
    contract: /contract/i,
    internship: /internship/i,
    remote: /remote/i
  };
  for (const [type, regex] of Object.entries(typeMap)) {
    if (regex.test(job.title) || regex.test(job.description)) {
      job.jobType = type;
      break;
    }
  }

  result.push(job);
} else {
  // No clear job pattern found – leave result empty
}