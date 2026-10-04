// Identify potential job title links
const jobLinks = $('a[href*="/hire/"], a[href*="/job/"], a[href*="/jobs/"]')
  .filter(function () {
    const txt = $(this).text().trim();
    return txt && txt.length < 150;
  });

if (jobLinks.length) {
  jobLinks.each(function () {
    const link = $(this);
    const title = link.text().trim();
    if (!title) return;

    // Find a reasonable container for the job details
    const container = link.closest('article, .job-card, .listing-item, li, .job-item, .card')
      .first();

    // Fallback to parent if container is too generic
    const ctx = container.length ? container : link.parent();

    const companyName = ctx.find('.company, .company-name, .employer').first().text().trim() || null;
    const location = ctx.find('.location, .job-location, .address').first().text().trim() || null;
    const description = ctx.find('.description, .job-description, .summary, p').first().text().trim() || null;

    // Job type detection
    const typeText = ctx.find('.job-type, .type, .employment-type').first().text().toLowerCase();
    let jobType = null;
    if (typeText.includes('full')) jobType = 'full_time';
    else if (typeText.includes('part')) jobType = 'part_time';
    else if (typeText.includes('contract')) jobType = 'contract';
    else if (typeText.includes('intern')) jobType = 'internship';
    else if (typeText.includes('remote')) jobType = 'remote';

    // Dates
    let postedDateIsoString = null;
    const postedElem = ctx.find('time[datetime], .posted-date, .date-posted').first();
    if (postedElem.length) {
      const dt = postedElem.attr('datetime') || postedElem.text();
      const parsed = new Date(dt);
      if (!isNaN(parsed)) postedDateIsoString = parsed.toISOString();
    }

    let deadlineIsoString = null;
    const deadlineElem = ctx.find('.deadline, .apply-by, .closing-date').first();
    if (deadlineElem.length) {
      const dt = deadlineElem.attr('datetime') || deadlineElem.text();
      const parsed = new Date(dt);
      if (!isNaN(parsed)) deadlineIsoString = parsed.toISOString();
    }

    // Salary parsing
    let salaryMin = null;
    let salaryMax = null;
    let salaryCurrency = null;
    const salaryText = ctx.find('.salary, .compensation').first().text();
    if (salaryText) {
      const currencyMatch = salaryText.match(/[\$€£¥]/);
      if (currencyMatch) salaryCurrency = currencyMatch[0];
      const numbers = salaryText.replace(/[^0-9\-.]/g, ' ').trim().split(/\s+/).map(n => parseFloat(n)).filter(n => !isNaN(n));
      if (numbers.length === 1) {
        salaryMin = salaryMax = numbers[0];
      } else if (numbers.length >= 2) {
        salaryMin = Math.min(...numbers);
        salaryMax = Math.max(...numbers);
      }
    }

    const job = {
      title,
      companyName,
      description,
      location,
      jobType,
      sourceUrl: link.attr('href') || null,
      postedDateIsoString,
      deadlineIsoString,
      salaryMin,
      salaryMax,
      salaryCurrency,
    };

    // Ensure at least title and one more field to consider it a real job
    const hasAdditionalInfo = companyName || location || description || jobType;
    if (hasAdditionalInfo) result.push(job);
  });
}