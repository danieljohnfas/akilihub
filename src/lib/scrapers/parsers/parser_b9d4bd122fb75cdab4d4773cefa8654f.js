const sourceUrl = $('link[rel="canonical"]').attr('href')?.trim() || '';

function cleanText(txt) {
  return txt?.replace(/\s+/g, ' ').trim() || '';
}

// Helper to get value after a label (e.g., "Location:" )
function getLabeledValue(label) {
  const el = $(`*:contains(${label})`).filter(function () {
    const txt = $(this).text();
    return txt && txt.trim().toLowerCase().startsWith(label.toLowerCase());
  }).first();
  if (!el.length) return '';
  // If label and value are in same element (e.g., "Location: Dar es Salaam")
  const parts = el.text().split(':');
  if (parts.length > 1) return cleanText(parts.slice(1).join(':'));
  // Otherwise try next sibling
  const sibling = el.next();
  return cleanText(sibling.text() || sibling.attr('content') || '');
}

// Try to detect a job container; if none, leave result empty
const possibleContainers = $('.job-details, .single-job, .job-single, article.job, .job-item, .job-card, .job-content');
if (possibleContainers.length === 0) {
  // fallback: maybe the whole page is a single job
  const titleCandidate = cleanText($('h1').first().text());
  if (titleCandidate) {
    const job = {
      title: titleCandidate,
      sourceUrl,
    };
    // attempt to fill other fields from the page
    const descriptionHtml = $('.job-description, .description, #job-description').first().html();
    if (descriptionHtml) job.description = descriptionHtml.trim();

    const company = cleanText($('.company-name, .company-info a, .job-company a').first().text());
    if (company) job.companyName = company;

    const location = getLabeledValue('Location');
    if (location) job.location = location;

    const type = getLabeledValue('Job Type');
    if (type) {
      const map = { 'full time': 'full_time', 'part time': 'part_time', contract: 'contract', internship: 'internship', remote: 'remote' };
      const key = type.toLowerCase();
      job.jobType = map[key] || key.replace(/\s+/g, '_');
    }

    const posted = getLabeledValue('Posted');
    if (posted) {
      const d = new Date(posted);
      if (!isNaN(d)) job.postedDateIsoString = d.toISOString();
    }

    const deadline = getLabeledValue('Deadline');
    if (deadline) {
      const d = new Date(deadline);
      if (!isNaN(d)) job.deadlineIsoString = d.toISOString();
    }

    const salaryText = getLabeledValue('Salary');
    if (salaryText) {
      const match = salaryText.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*[-–to]*\s*(\d+(?:\.\d+)?)?\s*([A-Z]{3}|[A-Za-z]{3})/);
      if (match) {
        job.salaryMin = parseFloat(match[1]);
        if (match[2]) job.salaryMax = parseFloat(match[2]);
        job.salaryCurrency = match[3];
      }
    }

    result.push(job);
  }
} else {
  possibleContainers.each((_, elem) => {
    const container = $(elem);
    const title = cleanText(container.find('h1, h2, .job-title, .title').first().text());
    if (!title) return; // skip non‑job blocks

    const job = { title, sourceUrl };

    const descHtml = container.find('.job-description, .description, #job-description').first().html();
    if (descHtml) job.description = descHtml.trim();

    const company = cleanText(container.find('.company-name, .company-info a, .job-company a').first().text());
    if (company) job.companyName = company;

    const location = container.find(':contains("Location")').filter((i, el) => $(el).text().trim().toLowerCase().startsWith('location')).first();
    if (location.length) {
      const txt = location.text();
      const parts = txt.split(':');
      job.location = parts.length > 1 ? cleanText(parts.slice(1).join(':')) : cleanText(location.next().text());
    }

    const typeEl = container.find(':contains("Job Type")').filter((i, el) => $(el).text().trim().toLowerCase().startsWith('job type')).first();
    if (typeEl.length) {
      const txt = typeEl.text();
      const parts = txt.split(':');
      const raw = parts.length > 1 ? cleanText(parts.slice(1).join(':')) : cleanText(typeEl.next().text());
      const map = { 'full time': 'full_time', 'part time': 'part_time', contract: 'contract', internship: 'internship', remote: 'remote' };
      const key = raw.toLowerCase();
      job.jobType = map[key] || key.replace(/\s+/g, '_');
    }

    const postedEl = container.find(':contains("Posted")').filter((i, el) => $(el).text().trim().toLowerCase().startsWith('posted')).first();
    if (postedEl.length) {
      const txt = postedEl.text();
      const parts = txt.split(':');
      const raw = parts.length > 1 ? cleanText(parts.slice(1).join(':')) : cleanText(postedEl.next().text());
      const d = new Date(raw);
      if (!isNaN(d)) job.postedDateIsoString = d.toISOString();
    }

    const deadlineEl = container.find(':contains("Deadline")').filter((i, el) => $(el).text().trim().toLowerCase().startsWith('deadline')).first();
    if (deadlineEl.length) {
      const txt = deadlineEl.text();
      const parts = txt.split(':');
      const raw = parts.length > 1 ? cleanText(parts.slice(1).join(':')) : cleanText(deadlineEl.next().text());
      const d = new Date(raw);
      if (!isNaN(d)) job.deadlineIsoString = d.toISOString();
    }

    const salaryEl = container.find(':contains("Salary")').filter((i, el) => $(el).text().trim().toLowerCase().startsWith('salary')).first();
    if (salaryEl.length) {
      const txt = salaryEl.text();
      const parts = txt.split(':');
      const raw = parts.length > 1 ? cleanText(parts.slice(1).join(':')) : cleanText(salaryEl.next().text());
      const match = raw.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*[-–to]*\s*(\d+(?:\.\d+)?)?\s*([A-Z]{3}|[A-Za-z]{3})/);
      if (match) {
        job.salaryMin = parseFloat(match[1]);
        if (match[2]) job.salaryMax = parseFloat(match[2]);
        job.salaryCurrency = match[3];
      }
    }

    result.push(job);
  });
}