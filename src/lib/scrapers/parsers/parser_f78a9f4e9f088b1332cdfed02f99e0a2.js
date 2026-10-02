const $containers = $('.job, .posting, .job-listing, .job-card, article');
const jobs = [];
$containers.filter(function() {
  return $(this).find('.title, h2, h3').length > 0;
}).each(function() {
  const $el = $(this);
  const $titleEl = $el.find('.title, h2, h3').first();
  const title = $titleEl.text().trim();
  if (!title) return;
  const $companyEl = $el.find('.company, .recruiter').first();
  const companyName = $companyEl.length ? $companyEl.text().trim() : '';
  const $descriptionEl = $el.find('.description, .summary').first();
  const description = $descriptionEl.length ? $descriptionEl.text().trim() : '';
  const $locationEl = $el.find('.location, .city').first();
  const location = $locationEl.length ? $locationEl.text().trim() : '';
  const $jobTypeEl = $el.find('.job-type, .employment-type').first();
  const jobType = $jobTypeEl.length ? $jobTypeEl.text().trim() : '';
  const $sourceUrlEl = $el.find('a').first();
  const sourceUrl = $sourceUrlEl.length ? $sourceUrlEl.attr('href') || '' : '';
  const $postedDateEl = $el.find('.posted-date, .date-posted').first();
  const postedDateIsoString = $postedDateEl.length ? $postedDateEl.attr('data-iso') || '' : '';
  const $deadlineEl = $el.find('.deadline, .application-deadline').first();
  const deadlineIsoString = $deadlineEl.length ? $deadlineEl.attr('data-iso') || '' : '';
  let salaryMin = 0, salaryMax = 0, salaryCurrency = '';
  const $salaryContainer = $el.find('.salary');
  if ($salaryContainer.length) {
    const salaryText = $salaryContainer.text().trim();
    const parts = salaryText.split('-');
    if (parts[0]) {
      salaryMin = parseFloat(parts[0].replace(/[^\d.-]/g, '')) || 0;
    }
    if (parts[1]) {
      salaryMax = parseFloat(parts[1].replace(/[^\d.-]/g, '')) || 0;
    }
    const currencyMatch = salaryText.match(/[A-Z]{3}/);
    salaryCurrency = currencyMatch ? currencyMatch[0] : '';
  }
  jobs.push({
    title,
    companyName,
    description,
    location,
    jobType,
    sourceUrl,
    postedDateIsoString,
    deadlineIsoString,
    salaryMin,
    salaryMax,
    salaryCurrency
  });
});
result.push(...jobs);