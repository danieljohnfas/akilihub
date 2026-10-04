// Scan for job listing containers
var jobContainers = [];

// Try common job card selectors
jobContainers = jobContainers.concat(jobCardClass);

// Validate each candidate has a real job title context
jobContainers.forEach(function(el) {
  var title = $(el).find('h1,h2,h3').first().text().trim();
  if (!title || !/(position|job|vacancy|opening|nafasiazi|ajira|operator|accountant|engineer|manager|driver|teaches|sales|cashier|admin|developer|officer|specialist)/i.test(title)) {
    return;
  }
  result.push({
    title: title,
    companyName: $(el).find('.company, .employer, .org').first().text().trim() || '',
    location: $(el).find('.location, .place, .city').first().text().trim() || '',
    sourceUrl: $(el).find('a[href]').first().attr('href') || '',
    postedDateIsoString: $(el).find('.date, time').first().text().trim() || '',
    jobType: $(el).find('.type, .job-type').first().text().trim() || ''
  });
});

// If no container-based jobs found, check JSON-LD schema for @type JobPosting
var ldJson = $('script[type="application/ld+json"]').each(function() {
  try {
    var data = JSON.parse($(this).text());
    function walk(d) {
      if (!d) return;
      if (Array.isArray(d)) {
        d.forEach(walk);
      } else if (typeof d === 'object') {
        if (d['@type'] === 'JobPosting') result.push({ title: d.title || '', companyName: d.hiringOrganization?.name || '' });
        Object.values(d).forEach(walk);
      }
    }
    walk(data);
  } catch (e) {}
});