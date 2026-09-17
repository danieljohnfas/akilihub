const jobs = $('article[itemprop="blogPost"]');

const baseUrl = 'https://www.ports.go.tz';

jobs.each((index, element) => {
    const jobElement = $(element);

    const title = jobElement.find('span[itemprop="name"]').text().trim();

    if (!title) {
        return;
    }

    const sourceUrlRelative = jobElement.find('a[itemprop="url"]').attr('href');
    const sourceUrl = sourceUrlRelative ? (new URL(sourceUrlRelative, baseUrl).href) : '';

    const companyName = jobElement.find('dd.createdby span[itemprop="name"]').text().trim();

    const postedDateIsoString = jobElement.find('time[itemprop="datePublished"]').attr('datetime');

    const descriptionHtml = jobElement.find('div[itemprop="articleBody"]').html();
    const description = descriptionHtml ? descriptionHtml.trim() : '';

    const job = {
        title: title,
        companyName: companyName || '',
        description: description,
        location: '',
        jobType: '',
        sourceUrl: sourceUrl,
        postedDateIsoString: postedDateIsoString || '',
        deadlineIsoString: '',
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: ''
    };

    result.push(job);
});