result = [];
const jobContainers = $('meta[name="twitter:card"][content="summary_large_image"]').each((index, element) => {
    const job = {
        title: $(element).attr('content').split(' ')[0],
        companyName: $(element).attr('content').split('job at ')[1].split(' - ')[0],
        description: $(element).attr('content').split(' - ')[1],
        location: $(element).siblings('[name="twitter:data2"][content="00000 Tanzania"]').text(),
        jobType: $(element).siblings('[name="twitter:data2"][content="FULL_TIME"]').text().toLowerCase().replace('_', ' '),
        sourceUrl: $('link[rel="canonical"]').attr('href'),
        postedDateIsoString: $(element).siblings('[name="twitter:info"]').attr('content').split(' ')[0],
        deadlineIsoString: $(element).siblings('[name="twitter:data2"][content="2026-08-24T17:00:00+00:00"]').text(),
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: $(element).siblings('[name="twitter:data2"][content="TZS"]').text(),
    };
    result.push(job);
});