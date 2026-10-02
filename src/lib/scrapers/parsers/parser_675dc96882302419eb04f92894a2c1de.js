const job = {
    title: '',
    companyName: '',
    description: '',
    location: '',
    jobType: '',
    sourceUrl: '',
    postedDateIsoString: '',
    deadlineIsoString: '',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: ''
};

job.sourceUrl = $('link[rel="canonical"]').attr('href') || '';

const ogTitle = $('meta[property="og:title"]').attr('content') || '';
const ogDescription = $('meta[property="og:description"]').attr('content') || '';
const pageTitle = $('title').text() || '';

const titleParts = ogTitle.split('|');
if (titleParts.length > 1) {
    let extractedTitle = titleParts[1].trim();
    extractedTitle = extractedTitle.replace(/\s*\(Apply Now\)\s*$/, '').trim();
    job.title = extractedTitle;
} else if (pageTitle) {
    let extractedTitle = pageTitle;
    extractedTitle = extractedTitle.replace(/Ajira Mpya \d+ /, '')
                                 .replace(/Akiba Commercial Bank Plc \d+ /, '')
                                 .replace(/\| Ajira Express$/, '')
                                 .replace(/\s*\(Apply Now\)\s*$/, '')
                                 .trim();
    if (extractedTitle.includes('|')) {
        const pageTitleParts = extractedTitle.split('|');
        if (pageTitleParts.length > 1) {
            extractedTitle = pageTitleParts[1].trim();
        }
    }
    job.title = extractedTitle;
}

if (titleParts.length > 0) {
    let companyCandidate = titleParts[0].trim();
    companyCandidate = companyCandidate.replace(/^Ajira Mpya \d+\s*/, '').trim();
    companyCandidate = companyCandidate.replace(/\s*\d{4}\s*$/, '').trim();
    job.companyName = companyCandidate;
}
if (!job.companyName && ogDescription) {
    const companyMatchInDesc = ogDescription.match(/kutoka\s+([^,]+?)\s+Tanzania/i);
    if (companyMatchInDesc && companyMatchInDesc[1]) {
        job.companyName = companyMatchInDesc[1].trim();
    }
}
if (!job.companyName) {
    const specificCompanyMatch = html.match(/(Akiba Commercial Bank Plc)/i);
    if (specificCompanyMatch && specificCompanyMatch[1]) {
        job.companyName = specificCompanyMatch[1];
    }
}

job.description = ogDescription;

const locationMatch = ogDescription.match(/(Tanzania)/i);
if (locationMatch && locationMatch[1]) {
    job.location = locationMatch[1].trim();
} else {
    const locationMatchTitle = ogTitle.match(/(Tanzania)/i);
    if (locationMatchTitle && locationMatchTitle[1]) {
        job.location = locationMatchTitle[1].trim();
    }
}

job.postedDateIsoString = $('meta[property="article:published_time"]').attr('content') || '';

const monthMap = {
    'Januari': '01', 'Februari': '02', 'Machi': '03', 'Aprili': '04',
    'Mei': '05', 'Juni': '06', 'Julai': '07', 'Agosti': '08',
    'Septemba': '09', 'Oktoba': '10', 'Novemba': '11', 'Desemba': '12'
};
const deadlineMatch = ogDescription.match(/kabla ya tarehe (\d{1,2}) ([a-zA-Z]+) (\d{4})/i);

if (deadlineMatch && deadlineMatch.length === 4) {
    const day = deadlineMatch[1].padStart(2, '0');
    const monthName = deadlineMatch[2];
    const year = deadlineMatch[3];
    const month = monthMap[monthName];
    if (month) {
        try {
            const dateString = `${year}-${month}-${day}`;
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                job.deadlineIsoString = date.toISOString().split('T')[0] + 'T00:00:00Z';
            }
        } catch (e) {
            // Do nothing, deadlineIsoString remains empty
        }
    }
}

if (job.title && job.title.trim().length > 0 && job.companyName && job.companyName.trim().length > 0) {
    result.push(job);
}