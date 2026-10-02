const jobContainers = $('.job, .listing, .searchResult, .job-item');  
jobContainers.each(function () {  
  const el = $(this);  
  const title = el.find('.title, h2, h3').first().text().trim();  
  if (!title) return;  
  const job = {  
    title,  
    companyName: el.find('.company, .companyName').first().text().trim() || undefined,  
    description: el.find('.description, .desc').first().text().trim() || undefined,  
    location: el.find('.location, .city').first().text().trim() || undefined,  
    jobType: (function () {  
      const txt = el.find('.type').first().text().toLowerCase();  
      if (/full\s*time/.test(txt)) return 'full_time';  
      if (/part\s*time/.test(txt)) return 'part_time';  
      if (/contract/.test(txt)) return 'contract';  
      if (/internship/.test(txt)) return 'internship';  
      if (/remote/.test(txt)) return 'remote';  
      return undefined;  
    })(),  
    sourceUrl: el.find('a').first().attr('href') || undefined,  
    postedDateIsoString: (function () {  
      const txt = el.find('.posted, .date').first().text();  
      const d = new Date(txt);  
      return isNaN(d) ? undefined : d.toISOString();  
    })(),  
    deadlineIsoString: undefined,  
    salaryMin: undefined,  
    salaryMax: undefined,  
    salaryCurrency: undefined  
  };  
  result.push(job);  
});