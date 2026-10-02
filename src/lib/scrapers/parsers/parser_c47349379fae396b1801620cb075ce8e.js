const jobs = $('article').find('.entry-content li');
jobs.each((index, element) => {
    const job = {};
    const text = $(element).text();
    const match = text.match(/(.*?)\s+\((.*?)\)/);
    if (match) {
        job.title = match[1].trim();
        job.companyName = 'The University of Dodoma (UDOM)';
        job.description = text;
        job.location = 'Dodoma, Tanzania';
        job.postedDateIsoString = '2026-05-03T07:00:18+00:00';
        job.sourceUrl = 'https://ajiranew.com/new-vacancies-at-the-university-of-dodoma-udom-may-2026/';
    }
    result.push(job);
});
```

This script extracts job listings from the provided HTML structure. It assumes that job listings are contained within `<li>` elements inside an `<article>` element with class `entry-content`. Each job object is populated with the available information, and the job objects are pushed to the `result` array. If the HTML does not contain real job postings, the `result` array will remain empty.