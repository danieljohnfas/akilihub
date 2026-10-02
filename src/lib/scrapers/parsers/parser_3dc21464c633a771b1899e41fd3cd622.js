// Define possible job container selectors
var jobSelectors = [
  '[data-job]',
  '.job',
  '.job-card',
  '.job-listing',
  '.career-item',
  '.posting',
  'article.job',
  'li.job',
  '.vacancy',
  '.position'
];

// Helper to parse ISO date if possible
function parseIso(dateStr) {
  var d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Helper to extract salary numbers and currency
function extractSalary(text) {
  var result = { min: null, max: null, currency: null };
  if (!text) return result;
  var currencyMatch = text.match(/[$£€¥]/);
  if (currencyMatch) result.currency = currencyMatch[0];
  var numbers = text.match(/\\d[\\d,\\.]*\\d/g);
  if (numbers) {
    var nums = numbers.map(function(n) {
      return parseFloat(n.replace(/[,]/g, ''));
    });
    if (nums.length === 1) {
      result.min = result.max = nums[0];
    } else if (nums.length >= 2) {
      result.min = Math.min.apply(null, nums);
      result.max = Math.max.apply(null, nums);
    }
  }
  return result;
}

// Flag to indicate if any job was found
var foundJob = false;

// Iterate over selectors and process each matching element
jobSelectors.forEach(function(sel) {
  $(sel).each(function() {
    var $job = $(this);

    // Attempt to get a clear title
    var title = $job.find('h1, h2, .title, .job-title, a').first().text().trim();
    if (!title) return; // Skip if no title

    foundJob = true;

    var companyName = $job.find('.company, .company-name, .employer').first().text().trim() ||
                      $job.closest('.company-section').text().trim();

    var description = $job.find('.description, .job-description, p').text().trim();

    var location = $job.find('.location, .job-location, .address').first().text().trim();

    var typeText = $job.find('.type, .job-type').first().text().toLowerCase();
    var jobType = null;
    if (typeText.includes('full')) jobType = 'full_time';
    else if (typeText.includes('part')) jobType = 'part_time';
    else if (typeText.includes('contract')) jobType = 'contract';
    else if (typeText.includes('intern')) jobType = 'internship';
    else if (typeText.includes('remote')) jobType = 'remote';

    var sourceUrl = $job.find('a[href]').first().attr('href') || null;

    var posted = $job.find('time[datetime], .posted-date').first().attr('datetime') ||
                 $job.find('.posted-date').first().text().trim();
    var postedDateIsoString = parseIso(posted);

    var deadline = $job.find('.deadline, time[datetime][class*="deadline"]').first().attr('datetime') ||
                   $job.find('.deadline').first().text().trim();
    var deadlineIsoString = parseIso(deadline);

    var salaryText = $job.find('.salary, .compensation').first().text().trim();
    var salaryInfo = extractSalary(salaryText);

    var jobObj = {
      title: title,
      companyName: companyName || null,
      description: description || null,
      location: location || null,
      jobType: jobType || null,
      sourceUrl: sourceUrl || null,
      postedDateIsoString: postedDateIsoString,
      deadlineIsoString: deadlineIsoString,
      salaryMin: salaryInfo.min,
      salaryMax: salaryInfo.max,
      salaryCurrency: salaryInfo.currency
    };

    result.push(jobObj);
  });
});

// If no job containers matched, result stays empty as required.