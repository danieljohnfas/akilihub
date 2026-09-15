try {
  const jobContainers = $('div.post-body');
  if (jobContainers.length === 0) {
    return;
  }

  jobContainers.each(function() {
    const job = {};
    const title = $(this).find('h2').first().text().trim();
    if (title) {
      job.title = title;
    }

    const text = $(this).text().trim();
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('Company:')) {
        job.companyName = line.replace('Company:', '').trim();
      } else if (line.startsWith('Location:')) {
        job.location = line.replace('Location:', '').trim();
      } else if (line.startsWith('Job Type:')) {
        job.jobType = line.replace('Job Type:', '').trim().toLowerCase();
      } else if (line.startsWith('Deadline:')) {
        const deadline = line.replace('Deadline:', '').trim();
        job.deadlineIsoString = new Date(deadline).toISOString();
      }
    }

    const description = $(this).find('p').first().text().trim();