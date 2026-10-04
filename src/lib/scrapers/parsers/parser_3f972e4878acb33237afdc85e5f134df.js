// Find possible job containers using common class patterns
var jobSelectors = [
  '.job',
  '.job-item',
  '.job-card',
  '.position',
  '.vacancy',
  '.listing',
  '.career-item',
  '[data-job-id]',
  'article'
];
var containers = $(jobSelectors.join(',')).filter(function () {
  // Ensure the element contains a plausible job title
  var hasTitle = $(this).find('h1, h2, h3, h4, a.title, a.job-title, .title, .job-title').first().text().trim().length > 0;
  return hasTitle;
});

if (containers.length === 0) {
  // No identifiable job postings; keep result empty
} else {
  containers.each(function () {
    var $c = $(this);

    // Title
    var title = $c.find('h1, h2, h3, h4, a.title, a.job-title, .title, .job-title').first().text().trim();
    if (!title) return; // skip if no title

    // Company name
    var companyName = $c.find('.company, .company-name, .employer, .employer-name').first().text().trim();

    // Description
    var description = $c.find('.description, .job-description, .summary, .excerpt').first().text().trim();

    // Location
    var location = $c.find('.location, .job-location, .place').first().text().trim();

    // Job type detection
    var typeText = $c.find('.type, .job-type, .employment-type').first().text().toLowerCase();
    var jobType = null;
    if (/full\s?time/.test(typeText)) jobType = 'full_time';
    else if (/part\s?time/.test(typeText)) jobType = 'part_time';
    else if (/contract/.test(typeText)) jobType = 'contract';
    else if (/internship/.test(typeText)) jobType = 'internship';
    else if (/remote/.test(typeText)) jobType = 'remote';

    // Source URL
    var sourceUrl = $c.find('a.title, a.job-title, a').first().attr('href') || null;
    if (sourceUrl && sourceUrl.indexOf('http') !== 0) {
      // Resolve relative URLs using the page base if possible
      try {
        var base = new URL(html.match(/<base[^>]+href=["']([^"']+)["']/i)?.[1] || '');
        sourceUrl = new URL(sourceUrl, base).href;
      } catch (e) {
        // fallback: leave as is
      }
    }

    // Posted date
    var postedDateIsoString = null;
    var postedText = $c.find('.posted, .date-posted, time[datetime]').first();
    if (postedText.is('time') && postedText.attr('datetime')) {
      postedDateIsoString = new Date(postedText.attr('datetime')).toISOString();
    } else {
      var dateStr = postedText.text().trim();
      var parsed = Date.parse(dateStr);
      if (!isNaN(parsed)) postedDateIsoString = new Date(parsed).toISOString();
    }

    // Deadline
    var deadlineIsoString = null;
    var deadlineText = $c.find('.deadline, .apply-by, time[datetime][class*="deadline"]').first();
    if (deadlineText.is('time') && deadlineText.attr('datetime')) {
      deadlineIsoString = new Date(deadlineText.attr('datetime')).toISOString();
    } else {
      var dStr = deadlineText.text().trim();
      var dParsed = Date.parse(dStr);
      if (!isNaN(dParsed)) deadlineIsoString = new Date(dParsed).toISOString();
    }

    // Salary parsing
    var salaryMin = null;
    var salaryMax = null;
    var salaryCurrency = null;
    var salaryText = $c.find('.salary, .compensation').first().text().trim();
    if (salaryText) {
      var currencyMatch = salaryText.match(/[\$£€¥]/);
      if (currencyMatch) salaryCurrency = currencyMatch[0];
      var numbers = salaryText.match(/[\d,.]+/g);
      if (numbers) {
        var nums = numbers.map(function (n) { return parseFloat(n.replace(/,/g, '')); });
        if (nums.length === 1) {
          salaryMin = salaryMax = nums[0];
        } else if (nums.length >= 2) {
          salaryMin = Math.min.apply(null, nums);
          salaryMax = Math.max.apply(null, nums);
        }
      }
    }

    // Assemble job object
    var job = {
      title: title,
      companyName: companyName || null,
      description: description || null,
      location: location || null,
      jobType: jobType || null,
      sourceUrl: sourceUrl || null,
      postedDateIsoString: postedDateIsoString,
      deadlineIsoString: deadlineIsoString,
      salaryMin: salaryMin,
      salaryMax: salaryMax,
      salaryCurrency: salaryCurrency || null
    };
    result.push(job);
  });
}