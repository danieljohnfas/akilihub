// Determine source URL
var sourceUrl = $('link[rel="canonical"]').attr('href') || $('meta[property="og:url"]').attr('content') || null;

// Attempt to infer company name from page title (e.g., "New Vacancies at Abstract PR")
var pageTitle = $('title').first().text() || '';
var companyMatch = pageTitle.match(/at\s+(.+)/i);
var companyName = companyMatch ? companyMatch[1].trim() : null;

// Helper to extract job type from text
function detectJobType(text) {
  text = text.toLowerCase();
  if (/full[-\s]?time/.test(text)) return 'full_time';
  if (/part[-\s]?time/.test(text)) return 'part_time';
  if (/contract/.test(text)) return 'contract';
  if (/internship|intern/.test(text)) return 'internship';
  if (/remote/.test(text)) return 'remote';
  return null;
}

// Helper to extract salary numbers and currency
function parseSalary(text) {
  var salary = { salaryMin: null, salaryMax: null, salaryCurrency: null };
  var match = text.match(/([A-Z]{3}|[$€£])\s?([\d.,]+)(\s?[-–]\s?([A-Z]{3}|[$€£])?\s?([\d.,]+))?/);
  if (match) {
    salary.salaryCurrency = match[1] || null;
    salary.salaryMin = parseFloat(match[2].replace(/[,]/g, '')) || null;
    if (match[4]) {
      salary.salaryMax = parseFloat(match[5].replace(/[,]/g, '')) || null;
    }
  }
  return salary;
}

// Select headings that likely represent individual job titles
var jobHeadings = $('h2, h3').filter(function () {
  var txt = $(this).text().trim();
  return /designer|engineer|manager|assistant|intern|developer|analyst|consultant|officer|coordinator|specialist|lead|sales|marketing|accountant|technician/i.test(txt);
});

jobHeadings.each(function () {
  var $heading = $(this);
  var title = $heading.text().trim();

  // Gather description text until the next heading of same level
  var $descElements = $heading.nextUntil('h2, h3');
  var description = $descElements.map(function () {
    return $(this).text().trim();
  }).get().join('\n').trim();

  // Basic location detection
  var location = null;
  var locMatch = description.match(/Location[:\s]*([A-Za-z0-9 ,.-]+)/i);
  if (locMatch) location = locMatch[1].trim();

  // Detect job type
  var jobType = detectJobType(description + ' ' + title);

  // Salary parsing
  var salaryInfo = parseSalary(description);

  // Build job object
  var job = {
    title: title,
    companyName: companyName,
    description: description,
    location: location,
    jobType: jobType,
    sourceUrl: sourceUrl,
    postedDateIsoString: null,
    deadlineIsoString: null,
    salaryMin: salaryInfo.salaryMin,
    salaryMax: salaryInfo.salaryMax,
    salaryCurrency: salaryInfo.salaryCurrency
  };

  result.push(job);
});