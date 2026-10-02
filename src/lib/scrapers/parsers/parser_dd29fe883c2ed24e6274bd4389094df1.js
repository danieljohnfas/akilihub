$('script[type="application/ld+json"]').each(function () {
  const txt = $(this).contents().text().trim();
  if (!txt) return;
  try {
    const data = JSON.parse(txt);
    const process = (obj) => {
      if (Array.isArray(obj)) {
        obj.forEach(process);
        return;
      }
      if (obj && typeof obj === 'object') {
        if (obj['@type'] === 'JobPosting') {
          const job = {};
          if (obj.title) job.title = obj.title;
          else if (obj.name) job.title = obj.name;
          if (obj.hiringOrganization && obj.hiringOrganization.name) job.companyName = obj.hiringOrganization.name;
          if (obj.description) job.description = obj.description;
          if (obj.jobLocation) {
            const loc = Array.isArray(obj.jobLocation) ? obj.jobLocation[0] : obj.jobLocation;
            if (loc.address) {
              if (loc.address.addressLocality) job.location = loc.address.addressLocality;
              else if (loc.address.streetAddress) job.location = loc.address.streetAddress;
            }
          }
          if (obj.employmentType) {
            const type = Array.isArray(obj.employmentType) ? obj.employmentType[0] : obj.employmentType;
            const map = {
              FULL_TIME: 'full_time',
              PART_TIME: 'part_time',
              CONTRACT: 'contract',
              INTERNSHIP: 'internship',
              TEMPORARY: 'contract',
              REMOTE: 'remote',
            };
            job.jobType = map[type.toUpperCase()] || type.toLowerCase();
          }
          if (obj.url) job.sourceUrl = obj.url;
          if (obj.datePosted) job.postedDateIsoString = new Date(obj.datePosted).toISOString();
          if (obj.validThrough) job.deadlineIsoString = new Date(obj.validThrough).toISOString();
          if (obj.baseSalary) {
            const sal = obj.baseSalary;
            if (sal.value) {
              if (typeof sal.value === 'object') {
                if (sal.value.minValue) job.salaryMin = Number(sal.value.minValue);
                if (sal.value.maxValue) job.salaryMax = Number(sal.value.maxValue);
              } else {
                job.salaryMin = Number(sal.value);
              }
            }
            if (sal.currency) job.salaryCurrency = sal.currency;
          }
          result.push(job);
        } else if (obj['@graph']) {
          process(obj['@graph']);
        }
      }
    };
    process(data);
  } catch (e) {
    // ignore JSON parse errors
  }
});

if (result.length === 0) {
  $('.entry-content h2, .content h2, .job-title, .listing-title').each(function () {
    const title = $(this).text().trim();
    if (!title) return;
    const container = $(this).parent();
    const description = container.find('p').first().text().trim();
    const job = { title };
    if (description) job.description = description;
    const fullText = container.text();
    const locMatch = fullText.match(/Location[:\s]*([A-Za-z ,]+)/i);
    if (locMatch) job.location = locMatch[1].trim();
    const typeMatch = fullText.match(/Type[:\s]*([A-Za-z ]+)/i);
    if (typeMatch) {
      const raw = typeMatch[1].toLowerCase();
      const map = {
        'full time': 'full_time',
        'part time': 'part_time',
        contract: 'contract',
        internship: 'internship',
        remote: 'remote',
      };
      job.jobType = map[raw] || raw.replace(/\s+/g, '_');
    }
    result.push(job);
  });
}