var job = {};
job.title = $('title').text().replace('Career Opportunity: ', '');
job.companyName = 'Sandvik Mining & Construction Tanzania Limited';
job.location = 'Mwanza';
job.sourceUrl = 'https://www.vedastuswatosha.sbs/2026/08/career-opportunity-accountant-at.html';
var descriptionMeta = $('meta[name="description"]');
if (descriptionMeta.length > 0) {
    job.description = descriptionMeta.attr('content');
}
var deadline = descriptionMeta.attr('content').match(/Deadline: (.*)/);
if (deadline && deadline.length > 1) {
    job.deadlineIsoString = new Date(deadline[1]).toISOString();
}
result.push(job);