let containerSelectors = ['.job', '.job-listing', '.searchResult', '.resultItem', 'li[data-job-id]', 'div[data-job-id]'];
let containers = null;
for (let sel of containerSelectors) {
  try {
    let elems = $(sel);
    if (elems && elems.length) {
      containers = elems;
      break;
    }
  } catch (e) {}
}
if (!containers || !containers.length) {
  // no job containers found; result stays empty
} else {
  containers.each((i, el) => {
    const $el = $(el);
    let title = $el.find('h2, h3, .title, .job-title, a.title, a').first().text().trim();
    if (!title) return;
    let job = { title };
    let company = $el.find('.company, .companyName, .employer, .org').first().text().trim();
    if (company) job.companyName = company;
    let desc = $el.find('.description, .job-description, .summary, p').first().text().trim();
    if (desc) job.description = desc;
    let loc = $el.find('.location, .job-location, .city, .place').first().text().trim();
    if (loc) job.location = loc;
    let typeText = $el.find('.type, .job-type, .employment-type').first().text().trim().toLowerCase();
    if (typeText) {
      if (/full\s*time/.test(typeText)) job.jobType = 'full_time';
      else if (/part\s*time/.test(typeText)) job.jobType = 'part_time';
      else if (/contract/.test(typeText)) job.jobType = 'contract';
      else if (/internship/.test(typeText)) job.jobType = 'internship';
      else if (/remote/.test(typeText)) job.jobType = 'remote';
    }
    let link = $el.find('a.title, a.job-title, a').first();
    if (link && link.attr('href')) {
      let href = link.attr('href');
      if (href && !href.match(/^https?:\/\//i)) {
        try {
          let baseMatch = html.match(/<base[^>]+href="([^"]+)"/i);
          if (baseMatch) {
            let baseUrl = new URL(baseMatch[1]);
            href = new URL(href, baseUrl).href;
          }
        } catch (e) {}
      }
      job.sourceUrl = href;
    }
    let posted = $el.find('.date-posted, .posted, .date').first().text().trim();
    if (posted) {
      let d = new Date(posted);
      if (!isNaN(d)) job.postedDateIsoString = d.toISOString();
    }
    let deadline = $el.find('.deadline, .apply-by, .closing').first().text().trim();
    if (deadline) {
      let d = new Date(deadline);
      if (!isNaN(d)) job.deadlineIsoString = d.toISOString();
    }
    let salaryText = $el.find('.salary, .compensation').first().text().trim();
    if (salaryText) {
      let match = salaryText.replace(/,/g, '').match(/([A-Z]{3})?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:[-–]|to)?\s*([0-9]+(?:\.[0-9]+)?)?/i);
      if (match) {
        if (match[1]) job.salaryCurrency = match[1];
        if (match[2]) job.salaryMin = parseFloat(match[2]);
        if (match[3]) job.salaryMax = parseFloat(match[3]);
      }
    }
    result.push(job);
  });
}