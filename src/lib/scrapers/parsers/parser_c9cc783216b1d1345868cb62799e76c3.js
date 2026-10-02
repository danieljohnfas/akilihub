const jobListings = $('.rich-text').find('h3').nextUntil('h3').addBack('h3');

jobListings.each((index, element) => {
  const job = {};
  const $element = $(element);

  if ($element.is('h3')) {
    job.title = $element.text().trim();
    const descriptionElements = $element.nextUntil('h3').addBack('h3');
    descriptionElements.each((descIndex, descElement) => {
      const $descElement = $(descElement);
      if ($descElement.is('p')) {
        if (!job.description) {
          job.description = $descElement.text().trim();
        } else {
          job.description += ' ' + $descElement.text().trim();
        }
      } else if ($descElement.is('strong')) {
        const strongText = $descElement.text().trim();
        if (strongText.includes('Company:')) {
          job.companyName = strongText.replace('Company:', '').trim();
        } else if (strongText.includes('Location:')) {
          job.location = strongText.replace('Location:', '').trim();
        } else if (strongText.includes('Job Type:')) {
          job.jobType = strongText.replace('Job Type:', '').trim().toLowerCase().replace(' ', '_');
        } else if (strongText.includes('Salary:')) {
          const salaryText = strongText.replace('Salary:', '').trim();
          const salaryParts = salaryText.split(' - ');
          if (salaryParts.length === 2) {
            job.salaryMin = parseFloat(salaryParts[0].replace(/[^0-9.]/g, ''));
            job.salaryMax = parseFloat(salaryParts[1].replace(/[^0-9.]/g, ''));
            job.salaryCurrency = salaryParts[1].match(/[A-Z]{3}/)[0];
          }
        } else if (strongText.includes('Posted:')) {
          job.postedDateIsoString = new Date(strongText.replace('Posted:', '').trim()).toISOString();
        } else if (strongText.includes('Deadline:')) {
          job.deadlineIsoString = new Date(strongText.replace('Deadline:', '').trim()).toISOString();
        }
      }
    });
  }

  if (job.title) {
    result.push(job);
  }
});