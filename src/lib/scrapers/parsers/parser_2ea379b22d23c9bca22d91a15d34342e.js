const jobListings = $('.entry-content').find('.wp-block-column').find('.wp-block-columns');

jobListings.each((index, element) => {
    const jobTitle = $(element).find('.wp-block-heading').text().trim();
    const jobDetails = $(element).find('.wp-block-paragraph').text().trim().split('\n');

    const job = {
        title: jobTitle,
        companyName: 'Jordan University College',
        description: jobDetails[0].trim(),
        location: jobDetails[1]?.trim() || '',
        jobType: jobDetails[2]?.toLowerCase().includes('full time') ? 'full_time' : (jobDetails[2]?.toLowerCase().includes('part time') ? 'part_time' : (jobDetails[2]?.toLowerCase().includes('contract') ? 'contract' : (jobDetails[2]?.toLowerCase().includes('internship') ? 'internship' : (jobDetails[2]?.toLowerCase().includes('remote') ? 'remote' : '')))),
        sourceUrl: 'https://ajiraleo.co.tz/jobs/12-jobs-at-jordan-university-college-june-2026/',
        postedDateIsoString: '2026-06-24T15:35:51+03:00',
        deadlineIsoString: jobDetails[3]?.trim() || '',
        salaryMin: parseInt(jobDetails[4]?.trim().replace(/[^0-9.]/g, '') || 0),
        salaryMax: parseInt(jobDetails[5]?.trim().replace(/[^0-9.]/g, '') || 0),
        salaryCurrency: jobDetails[6]?.trim() || ''
    };

    result.push(job);
});