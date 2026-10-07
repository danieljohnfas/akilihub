var job = {};
job.title = $('meta[property="og:title"]').attr('content');
job.companyName = 'ITM Tanzania';
job.description = $('meta[property="og:description"]').attr('content');
job.location = 'Dar es Salaam, Tanzania';
job.sourceUrl = $('meta[property="og:url"]').attr('content');
job.postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
result.push(job);