const canonical = $('link[rel="canonical"]').attr('href');
let canonicalUrl = canonical || 'http://himalayas.app';
try {
  canonicalUrl = new URL(canonical, 'http://himalayas.app').href;
} catch (_) {}
try {
  const { pathname } = new URL(canonicalUrl);
  // Himalayas candidate profiles use /@username, which are not job listings
  if (!pathname.startsWith('/@')) {
    const jobContainers = $('article.job, div[data-job], div.job-card, main .job-content, article');
    jobContainers.each(function() {
      const $el = $(this);
      const title = $el.find('h1, h2').first().text().trim();
      if (!title) return;
      const description = $el.find('.description, .job-details, .job-desc, p').first().text().trim();
      const company = $el.find('.company-name, h3, .employer, [data-company]').first().text().trim();
      const location = $el.find('.location, .office, .where, [data-location]').first().text().trim();
      const typeRaw = $el.find('.job-type, .type, .schedule, [data-type]').first().text().trim();
      const postedTime = $el.find('time').attr('datetime') || $el.find('time').attr('date') || '';
      const salaryEl = $el.find('.salary, [data-salary]');
      const salaryText = salaryEl.length ? salaryEl.first().text().trim() : '';
      const salaryMatch = salaryText.match(/\$(\d+)/);
      const salaryMin = salaryMatch ? parseFloat(salaryMatch[1]) : null;
      const jobType = typeRaw ? typeRaw.toLowerCase() : '';
      const jobObject = {
        title: title,
        companyName: company,
        description: description,
        location: location,
        jobType: jobType,
        sourceUrl: canonicalUrl,
        postedDateIsoString: postedTime,
        deadlineIsoString: '',
        salaryMin: salaryMin,
        salaryMax: null,
        salaryCurrency: 'USD'
      };
      result.push(jobObject);
    });
  }
} catch (_) {}