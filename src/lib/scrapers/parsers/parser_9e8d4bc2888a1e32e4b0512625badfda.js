var job = {};
job.title = $('meta[property="og:title"]').attr('content');
job.companyName = 'Ifakara Health Institute (IHI)';
job.location = 'Morogoro';
job.sourceUrl = $('meta[property="og:url"]').attr('content');
job.postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
var description = $('meta[name="description"]').attr('content');
job.description = description;
result.push(job);