result = [];
var jobListings = $('article').find('ul').children('li').each(function() {
    var job = {};
    job.title = $(this).find('strong').text().trim();
    job.companyName = $('title').text().split(' Vacancies at ')[1].split(' April ')[0];
    job.description = $(this).text().trim();
    job.location = 'Arusha, Tanzania';
    job.sourceUrl = $('link[rel="canonical"]').attr('href');
    job.postedDateIsoString = $('meta[property="article:published_time"]').attr('content');
    job.deadlineIsoString = $('meta[property="article:modified_time"]').attr('content');
    result.push(job);
});