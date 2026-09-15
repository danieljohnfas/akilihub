try {
    const jobContainers = $('script[type="application/ld+json"]');
    if (jobContainers.length === 0) {
        result = [];
        return;
    }

    jobContainers.each(function() {
        const jsonData = $(this).html();
        const data = JSON.parse(jsonData);

        if (data['@graph'] && data['@graph'].length > 1) {
            const jobList = data['@graph'][1]['mainEntity']['itemListElement'];

            jobList.forEach(function(job) {
                const jobObject = {};

                if (job['item']['@type'] === 'Car') {
                    jobObject.title = job['item']['name'];
                    jobObject.sourceUrl = job['item']['url'];

                    result.push(jobObject);
                }
            });
        }
    });
} catch (e) {
    result = [];
}