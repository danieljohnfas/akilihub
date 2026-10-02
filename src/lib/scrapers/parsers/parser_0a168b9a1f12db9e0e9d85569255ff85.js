We need to parse the sample HTML to see if there is a job listing. The sample includes meta tags, but no actual job container. Likely the real page includes a job listing with title, company, description, etc. Since we only have sample, we must decide if there is a real job posting. The sample shows title "Driver at Niajiri Platform, Dar es Salaam | Mabumbe.TZ". That suggests a job posting. But we need to locate the container that holds the job details. In typical job site, there may be a div class="job-listing" or similar. Since we don't have that, we need to assume generic selectors? The instructions: "Write a deterministic Cheerio script to extract jobs from this specific HTML structure." So we need to infer the structure.

Given sample, maybe the job details are within a container like <div class="job-details"> or something. But not provided. We need to be careful: If the HTML does NOT contain real job postings, result must be empty. But there is a title "Driver at Niajiri Platform". That suggests a job posting. However, we need to see if there is a container with job details. The sample only includes head and meta, no body. So maybe the actual page includes a job listing after the head. Since we only have head snippet, we cannot see the job container. So likely the sample is incomplete, but the instruction says to write deterministic script for this specific HTML structure. Maybe the real structure includes a specific class. We need to guess typical structure.

Let's imagine typical job site: <article class="job"> with <h2 class="job-title">, <div class="company">, <p class="description">, <ul class="details"> with <li>Location, Job type, etc. Also posted date maybe in <time> or <span class="posted-date">. Deadline maybe in <time class="deadline">. Salary maybe in <span class="salary">.

But without concrete classes, we risk not extracting anything. The safest approach: If we cannot find any job container, return empty array. However, the sample includes a title in <title> and meta description, but not a job container. So maybe the real page includes a job listing with class "job-listing". Since we can't see, maybe the script should search for elements containing the job title (e.g., h1, h2) and then extract surrounding info.

But the instruction: "Only extract actual job listings with a clear job title." So we need to find elements that represent a job posting. If we can't find any, result empty.

Given limited info, perhaps we should attempt to locate the main job container by selecting the element that contains the job title and also has company name etc. We could search for a heading with text that includes "Driver" and then traverse up/down to find company, description, etc.

But deterministic? Hard.

Maybe the site uses a specific structure: <div class="job-detail"> with <h2 class="job-title">, <div class="company-name">, <p class="job-description">, <ul class="job-meta"> with <li>Location, Job type, etc.

Since we can't be sure, maybe we should write code that looks for elements with class containing "job" (case-insensitive) and then extracts fields.

But we must not use imports, just cheerio.

We need to populate result array with objects. Let's assume there is a container with class "job-listing". We'll write:

$('.job-listing').each((i, el) => {
   const $el = $(el);
   const title = $el.find('h2.job-title, h1.job-title, .job-title').text().trim();
   // if no title, skip
   if (!title) return;
   const companyName = $el.find('.company-name, .company, .org-name').text().trim();
   const description = $el.find('.job-description, .description').text().trim();
   // location
<unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk>
But we need to locate location, job type, etc. Might be in separate spans.

Given the sample, there is only one job (the page title). The description is in meta description. Not in body. Likely the job description is in the article body, maybe within a container .job-details. Since we don't have actual container classes, we need to infer.

But the instructions: "Only extract actual job listings<unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk>
1.  **DO NOT** use `require()`, imports, or `module.exports`.  
2.  If this HTML does NOT contain real job postings (e.g., if it is<unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk> 2.0<unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk> <unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk><unk> 1.0