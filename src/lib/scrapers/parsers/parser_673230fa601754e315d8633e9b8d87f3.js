var job = {};
job.title = $('title').text();
job.companyName = 'Pathfinder';
job.sourceUrl = $('meta[property="og:url"]').attr('content');
job.postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
job.description = $('meta[property="og:description"]').attr('content');
result.push(job);