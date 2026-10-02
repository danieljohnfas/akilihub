// Extract JobPosting structured data if present
$('script[type="application/ld+json"]').each((_, el) => {
  try {
    const json = JSON.parse($(el).contents().first().text());
    const items = Array.isArray(json) ? json : [json];
    items.forEach(item => {
      const traverse = obj => {
        if (Array.isArray(obj)) {
          obj.forEach(traverse);
          return;
        }
        if (obj && typeof obj === 'object') {
          if (obj['@type'] === 'JobPosting') {
            const job = {};
            if (obj.title) job.title = String(obj.title).trim();
            if (obj.hiringOrganization && obj.hiringOrganization.name) job.companyName = String(obj.hiringOrganization.name).trim();
            if (obj.description) job.description = String(obj.description).trim();
            if (obj.jobLocation && obj.jobLocation.address && obj.jobLocation.address.addressLocality) {
              job.location = String(obj.jobLocation.address.addressLocality).trim();
            }
            if (obj.employmentType) {
              const type = String(obj.employmentType).toLowerCase();
              if (type.includes('full')) job.jobType = 'full_time';
              else if (type.includes('part')) job.jobType = 'part_time';
              else if (type.includes('contract')) job.jobType = 'contract';
              else if (type.includes('intern')) job.jobType = 'internship';
              else if (type.includes('remote')) job.jobType = 'remote';
            }
            if (obj.url) job.sourceUrl = String(obj.url).trim();
            if (obj.datePosted) job.postedDateIsoString = new Date(obj.datePosted).toISOString();
            if (obj.validThrough) job.deadlineIsoString = new Date(obj.validThrough).toISOString();
            if (obj.baseSalary) {
              const sal = obj.baseSalary;
              if (sal.value) {
                const val = sal.value;
                if (val.minValue) job.salaryMin = Number(val.minValue);
                if (val.maxValue) job.salaryMax = Number(val.maxValue);
                if (val.currency) job.salaryCurrency = String(val.currency).trim();
              }
            }
            if (job.title) result.push(job);
          } else {
            // recurse into nested objects
            Object.values(obj).forEach(traverse);
          }
        }
      };
      traverse(item);
    });
  } catch (e) {
    // ignore JSON parse errors
  }
});

// Fallback: heuristic extraction from article/content
if (result.length === 0) {
  const contentRoot = $('article, .entry-content, #content, .post-content').first();
  if (contentRoot.length) {
    // Define headings that may represent job titles
    const headingSelector = 'h1, h2, h3, h4, h5, strong';
    const jobHeadings = contentRoot.find(headingSelector).filter((_, el) => {
      const txt = $(el).text().trim();
      const lowered = txt.toLowerCase();
      return lowered.includes('vacancy') || lowered.includes('job') || lowered.includes('position') || lowered.includes('opening');
    });

    jobHeadings.each((_, heading) => {
      const job = {};
      const $heading = $(heading);
      job.title = $heading.text().trim();

      // Gather sibling paragraphs until the next heading of same or higher level
      const descriptionParts = [];
      let $sibling = $heading.next();
      while ($sibling.length && !$sibling.is(headingSelector)) {
        if ($sibling.is('p, ul, ol')) descriptionParts.push($sibling.text().trim());
        $sibling = $sibling.next();
      }
      if (descriptionParts.length) job.description = descriptionParts.join('\n\n');

      // Attempt to extract location, type, salary from description text
      const desc = job.description || '';
      const locMatch = desc.match(/location[:\s]+([^\n,.]+)/i);
      if (locMatch) job.location = locMatch[1].trim();

      const typeMatch = desc.match(/employment type[:\s]+([^\n,.]+)/i);
      if (typeMatch) {
        const t = typeMatch[1].toLowerCase();
        if (t.includes('full')) job.jobType = 'full_time';
        else if (t.includes('part')) job.jobType = 'part_time';
        else if (t.includes('contract')) job.jobType = 'contract';
        else if (t.includes('intern')) job.jobType = 'internship';
        else if (t.includes('remote')) job.jobType = 'remote';
      }

      const salaryMatch = desc.match(/salary[:\s]+([\d.,]+)\s*-\s*([\d.,]+)\s*([A-Z]{3})/i);
      if (salaryMatch) {
        job.salaryMin = Number(salaryMatch[1].replace(/[,]/g, ''));
        job.salaryMax = Number(salaryMatch[2].replace(/[,]/g, ''));
        job.salaryCurrency = salaryMatch[3];
      } else {
        const singleSalMatch = desc.match(/salary[:\s]+([\d.,]+)\s*([A-Z]{3})/i);
        if (singleSalMatch) {
          job.salaryMin = Number(singleSalMatch[1].replace(/[,]/g, ''));
          job.salaryCurrency = singleSalMatch[2];
        }
      }

      // Source URL from meta og:url or canonical
      const ogUrl = $('meta[property="og:url"]').attr('content');
      const canonical = $('link[rel="canonical"]').attr('href');
      job.sourceUrl = ogUrl || canonical || '';

      // Posted date from meta article:published_time
      const pubTime = $('meta[property="article:published_time"]').attr('content');
      if (pubTime) job.postedDateIsoString = new Date(pubTime).toISOString();

      // Company name from meta og:site_name or title tag heuristics
      const siteName = $('meta[property="og:site_name"]').attr('content');
      if (siteName) job.companyName = siteName.trim();
      else {
        const titleTag = $('title').text();
        const matchComp = titleTag.match(/vacancies at ([^|]+)/i);
        if (matchComp) job.companyName = matchComp[1].trim();
      }

      if (job.title) result.push(job);
    });
  }
}