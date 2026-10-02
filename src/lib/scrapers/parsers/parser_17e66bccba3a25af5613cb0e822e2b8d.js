var job = {};
job.title = $('meta[property="og:title"]').attr('content');
job.companyName = 'TAWLA';
job.description = $('meta[property="og:description"]').attr('content');
job.location = 'Mwanza, Tanzania';
job.sourceUrl = $('meta[property="og:url"]').attr('content');
job.postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
result.push(job);