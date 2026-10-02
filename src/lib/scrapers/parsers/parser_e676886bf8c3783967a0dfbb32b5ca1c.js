const containers = $('.job-card, .job-listing, .post-listing, article.job-post, .career-item, .listing-item');
containers.each((i, el) => {
  const $el = $(el);
  const title = $el.find('.job-title, .title, h2').first().text().trim();
  if (!title) return;
  const companyName = $el.find('.company-name, .company').first().text().trim();
  const location = $el.find('.location').first().text().trim();
  const jobType = $el.find('.job-type, .type').first().text().trim().toLowerCase();
  const sourceUrl = $el.find('a').attr('href') || '';
  const description = $el.find('.description, .summary').first().text().trim();
  const postedDateIsoString = $el.find('time[datetime]').attr('datetime') || '';
  const deadlineIsoString = $el.find('.deadline, time[datetime]').eq(1).attr('datetime') || '';
  const salaryText = $el.find('.salary, .pay').first().text().trim();
  let salaryMin = null, salaryMax = null, salaryCurrency = null;
  if (salaryText) {
    const currencyMatch = salaryText.match(/([$€£¥]|USD|EUR|GBP)/);
    salaryCurrency = currencyMatch ? currencyMatch[0] : '';
    const nums = salaryText.match(/\d+(?:,\d+)*(?:\.\d+)?/g);
    if (nums) {
      salaryMin = parseFloat(nums[0].replace(/,/g, ''));
      if (nums.length > 1) {
        salaryMax = parseFloat(nums[1].replace(/,/g, ''));
      }
    }
  }
  const job = { title, companyName, description, location, jobType, sourceUrl, postedDateIsoString, deadlineIsoString, salaryMin, salaryMax, salaryCurrency };
  result.push(job);
});