import * as cheerio from 'cheerio';

async function printResponse() {
  const homeRes = await fetch('https://somalijobs.com/jobs', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
  });
  const homeHtml = await homeRes.text();
  const $ = cheerio.load(homeHtml);
  let token = $('meta[name="csrf-token"]').attr('content');
  const cookie = homeRes.headers.get('set-cookie') || '';

  const res = await fetch('https://somalijobs.com/jobs/fetch/', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'CSRF-Token': token || '',
      'Cookie': cookie
    },
    body: new URLSearchParams({
      page: '1',
      filter_locations: '',
      filter_categories: '',
      filter_dateposted: '',
      filter_jobtype: '',
      filter_careerlevel: '',
      filter_search: '',
      sortby: 'newest'
    }).toString()
  });

  const data = await res.text();
  console.log('FULL RESPONSE:\n', data);
}

printResponse();
