import * as cheerio from 'cheerio';

async function testReliefwebDetail() {
  const url = 'https://reliefweb.int/job/4230158/south-sudan-head-meal-department-mf-juba';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
  });
  console.log('Status:', res.status);
  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $('h1').text().trim();
  const employer = $('.rw-entity-meta__tag-value, .rw-meta-item--source').first().text().trim();
  const body = $('.rw-job-body, .rw-entity-content').text().replace(/\s+/g, ' ').trim();

  console.log('Title:', title);
  console.log('Employer:', employer);
  console.log('Body length:', body.length);
  console.log('Body snippet:', body.slice(0, 300));
}

testReliefwebDetail();
