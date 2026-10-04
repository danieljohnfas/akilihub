const articleTitle = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
const articleUrl = $('meta[property="og:url"]').attr('content') || $('link[rel="canonical"]').attr('href') || '';
const publishedTime = $('meta[property="article:published_time"]').attr('content') || $('meta[name="article:published_time"]').attr('content') || '';

const jobContainers = $('.entry-content .job-listing, .entry-content .vacancy, .entry-content article.job, .post-content .job-item, [itemtype*="JobPosting"], .job-post, .vacancy-item');

if (jobContainers.length > 0) {
    jobContainers.each((i, el) => {
        const $el = $(el);
        const title = $el.find('h2, h3, h4, .job-title, .title, [itemprop="title"]').first().text().trim();
        const companyName = $el.find('.company, .employer, [itemprop="hiringOrganization"]').first().text().trim() || 'PSRS';
        const description = $el.find('.description, .content, .excerpt, [itemprop="description"]').first().text().trim();
        const location = $el.find('.location, .job-location, [itemprop="jobLocation"]').first().text().trim();
        const jobTypeText = $el.find('.job-type, .type, [itemprop="employmentType"]').first().text().trim().toLowerCase();
        let jobType = '';
        if (jobTypeText.includes('full')) jobType = 'full_time';
        else if (jobTypeText.includes('part')) jobType = 'part_time';
        else if (jobTypeText.includes('contract')) jobType = 'contract';
        else if (jobTypeText.includes('intern')) jobType = 'internship';
        else if (jobTypeText.includes('remote')) jobType = 'remote';
        const sourceUrl = $el.find('a[href*="/job"], a[href*="/vacancy"], a[href*="/career"]').attr('href') || $el.find('a').first().attr('href') || articleUrl;
        const postedDate = $el.find('time, .date, .posted-date, [itemprop="datePosted"]').attr('datetime') || $el.find('time, .date, .posted-date, [itemprop="datePosted"]').text().trim() || publishedTime;
        const deadline = $el.find('.deadline, .closing-date, [itemprop="validThrough"]').attr('datetime') || $el.find('.deadline, .closing-date, [itemprop="validThrough"]').text().trim();
        const salaryText = $el.find('.salary, .wage, [itemprop="baseSalary"]').text().trim();
        let salaryMin = null, salaryMax = null, salaryCurrency = 'TZS';
        if (salaryText) {
            const matches = salaryText.match(/([\d,]+)\s*[-–]\s*([\d,]+)/);
            if (matches) {
                salaryMin = parseInt(matches[1].replace(/,/g, ''), 10);
                salaryMax = parseInt(matches[2].replace(/,/g, ''), 10);
            } else {
                const single = salaryText.match(/([\d,]+)/);
                if (single) salaryMin = salaryMax = parseInt(single[1].replace(/,/g, ''), 10);
            }
            if (salaryText.toUpperCase().includes('USD')) salaryCurrency = 'USD';
            else if (salaryText.toUpperCase().includes('EUR')) salaryCurrency = 'EUR';
        }
        if (title) {
            result.push({
                title,
                companyName,
                description,
                location,
                jobType,
                sourceUrl: sourceUrl.startsWith('http') ? sourceUrl : new URL(sourceUrl, 'https://ajiranew.com').href,
                postedDateIsoString: postedDate ? new Date(postedDate).toISOString() : '',
                deadlineIsoString: deadline ? new Date(deadline).toISOString() : '',
                salaryMin,
                salaryMax,
                salaryCurrency
            });
        }
    });
}