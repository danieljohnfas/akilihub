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

const pageTitleHtml = $('title').html() || '';
const cleanPageTitle = pageTitleHtml
    .replace(/&lt;br&gt;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const mainTitlePartMatch = cleanPageTitle.match(/(.*?)(?:\s*\||$)/);
const mainTitlePart = mainTitlePartMatch ? mainTitlePartMatch[1].trim() : cleanPageTitle;

const jobAtMatch = mainTitlePart.match(/(.*?)\s*Job At\s*(.*?)(?:\s*in\s*(.*))?$/i);
if (jobAtMatch) {
    job.title = jobAtMatch[1].trim();
    job.companyName = jobAtMatch[2].trim();
    if (jobAtMatch[3]) {
        job.location = jobAtMatch[3].trim();
    }
}

const postedDateMatchInTitle = cleanPageTitle.match(/for\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{4})|October 2026/i);
if (postedDateMatchInTitle) {
    let month = '';
    let year = '';
    if (postedDateMatchInTitle[1]) {
        const monthName = postedDateMatchInTitle[1];
        year = postedDateMatchInTitle[2];
        const monthMap = {
            January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
            July: '07', August: '08', September: '09', October: '10', November: '11', December: '12'
        };
        month = monthMap[monthName];
    } else if (postedDateMatchInTitle[0].toLowerCase().includes('october 2026')) {
        month = '10';
        year = '2026';
    }

    if (month && year) {
        job.postedDateIsoString = `${year}-${month}-01T00:00:00Z`;
    }
}

const metaDescriptionContent = $('meta[name="description"]').attr('content') || '';
const cleanMetaDescription = metaDescriptionContent
    .replace(/&lt;br&gt;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

job.description = cleanMetaDescription;

const locationMatchInDesc = cleanMetaDescription.match(/jobs in\s*(.*?)(?=\s*(?:Ngo - Non Government Organisations Jobs In Tanzania|for October 2026|$))/i);
if (locationMatchInDesc && locationMatchInDesc[1]) {
    const specificLocation = locationMatchInDesc[1].trim();
    if (specificLocation) {
        job.location = specificLocation;
    }
}

const postedDateMatchInDesc = cleanMetaDescription.match(/for\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{4})/i);
if (postedDateMatchInDesc) {
    const monthName = postedDateMatchInDesc[1];
    const year = postedDateMatchInDesc[2];
    const monthMap = {
        January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
        July: '07', August: '08', September: '09', October: '10', November: '11', December: '12'
    };
    const month = monthMap[monthName];
    if (month && year) {
        job.postedDateIsoString = `${year}-${month}-01T00:00:00Z`;
    }
}

if (job.title && job.companyName) {
    result.push(job);
}