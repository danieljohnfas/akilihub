const jobTitle = $('h1.entry-title, .single-post h1, .post-title, .entry-title').first().text().trim();
if (jobTitle) {
  const contentElem = $('.entry-content, .post-content, .single-post .entry-content').first();
  if (contentElem.length) {
    const description = contentElem.text().trim();
    const job = { title: jobTitle };
    // company name
    let company = $('meta[property="og:site_name"]').attr('content') || '';
    const titleTag = $('title').text();
    const dashParts = titleTag.split('–');
    if (dashParts.length > 1) {
      const possible = dashParts.slice(1).join('–').replace('Nafasi za kazi', '').trim();
      if (possible) company = possible;
    }
    if (company) job.companyName = company;
    // description
    if (description) job.description = description;
    // location
    const locMatch = description.match(/Location[:\s]+([^\n\r]+)/i);
    if (locMatch) job.location = locMatch[1].trim();
    // job type
    const typeMatch = description.match(/Job\s*Type[:\s]+([^\n\r]+)/i);
    if (typeMatch) {
      const raw = typeMatch[1].toLowerCase().trim();
      const map = { 'full time': 'full_time', 'part time': 'part_time', 'contract': 'contract', 'internship': 'internship', 'remote': 'remote' };
      job.jobType = map[raw] || raw;
    }
    // posted date
    const postedMatch = description.match(/Posted\s+on[:\s]+([A-Za-z0-9,\s]+)/i);
    if (postedMatch) {
      const d = new Date(postedMatch[1].trim());
      if (!isNaN(d)) job.postedDateIsoString = d.toISOString();
    }
    // deadline
    const deadlineMatch = description.match(/Application\s+deadline[:\s]+([A-Za-z0-9,\s]+)/i);
    if (deadlineMatch) {
      const d = new Date(deadlineMatch[1].trim());
      if (!isNaN(d)) job.deadlineIsoString = d.toISOString();
    }
    // salary
    const salaryMatch = description.match(/Salary[:\s]+([\$£€]?)(\d{1,3}(?:,\d{3})*(?:\.\d+)?)(?:\s*-\s*[\$£€]?(\d{1,3}(?:,\d{3})*(?:\.\d+)?))?/i);
    if (salaryMatch) {
      const currencySymbol = salaryMatch[1];
      const currencyMap = { '$': 'USD', '£': 'GBP', '€': 'EUR' };
      if (currencySymbol) job.salaryCurrency = currencyMap[currencySymbol] || null;
      job.salaryMin = parseFloat(salaryMatch[2].replace(/,/g, ''));
      if (salaryMatch[3]) job.salaryMax = parseFloat(salaryMatch[3].replace(/,/g, ''));
    }
    // source URL
    const url = $('meta[property="og:url"]').attr('content') || '';
    if (url) job.sourceUrl = url;
    result.push(job);
  }
}