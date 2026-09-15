// Identify possible job posting containers
const jobContainers = $('.job-card, .listing, article[itemtype="http://schema.org/JobPosting"], article[itemtype="https://schema.org/JobPosting"], [itemtype="http://schema.org/JobPosting"], [itemtype="https://schema.org/JobPosting"]');

// Helper to parse numeric salary strings
function parseSalary(value) {
  if (!value) return null;
  const num = parseFloat(value.replace(/[^0-9.,]/g, '').replace(',', '.'));
  return isNaN(num) ? null : num;
}

// Iterate over each container and extract fields
jobContainers.each((_, elem) => {
  const container = $(elem);

  // Extract title – must exist to consider this a job
  const title = container.find('h1, h2, h3, .job-title, .title, a[title]').first().text().trim();
  if (!title) return; // skip if no clear title

  const job = {
    title,
    companyName: container.find('.company, .company-name, .employer').first().text().trim() || undefined,
    description: container.find('.description, .job-description, .summary, p').first().text().trim() || undefined,
    location: container.find('.location, .job-location, .place').first().text().trim() || undefined,
    jobType: (function () {
      const txt = container.find('.job-type, .type, .employment-type').first().text().toLowerCase();
      if (/full\s*time/.test(txt)) return 'full_time';
      if (/part\s*time/.test(txt)) return 'part_time';
      if (/contract/.test(txt)) return 'contract';
      if (/internship/.test(txt)) return 'internship';
      if (/remote/.test(txt)) return 'remote';
      return undefined;
    })(),
    sourceUrl: container.find('a[href]').first().attr('href') ? new URL(container.find('a[href]').first().attr('href'), window.location.href).href : undefined,
    postedDateIsoString: (function () {
      const txt = container.find('time[datetime], .posted-date').first().attr('datetime') || container.find('.posted-date').first().text();
      const d = new Date(txt);
      return isNaN(d) ? undefined : d.toISOString();
    })(),
    deadlineIsoString: (function () {
      const txt = container.find('.deadline, time[datetime][class*="deadline"]').first().attr('datetime') || container.find('.deadline').first().text();
      const d = new Date(txt);
      return isNaN(d) ? undefined : d.toISOString();
    })(),
    salaryMin: (function () {
      const txt = container.find('.salary, .pay, .compensation').first().text();
      const parts = txt.split(/[-–to]/i);
      return parseSalary(parts[0]);
    })(),
    salaryMax: (function () {
      const txt = container.find('.salary, .pay, .compensation').first().text();
      const parts = txt.split(/[-–to]/i);
      return parts[1] ? parseSalary(parts[1]) : undefined;
    })(),
    salaryCurrency: (function () {
      const txt = container.find('.salary, .pay, .compensation').first().text();
      const match = txt.match(/[A-Z]{3}|[£$€]/);
      return match ? match[0] : undefined;
    })()
  };

  // Remove undefined properties
  Object.keys(job).forEach(k => job[k] === undefined && delete job[k]);

  result.push(job);
});