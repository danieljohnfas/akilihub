const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\nnm\\.gemini\\antigravity\\brain\\f84a1826-2915-47a8-922c-c6b0deb4d990\\screenshots';
const BASE_URL = 'http://localhost:3000';

const PAGES = [
  { slug: 'homepage', path: '/' },
  { slug: 'jobs', path: '/jobs' },
  { slug: 'tenders', path: '/tenders' },
  { slug: 'companies', path: '/companies' },
  { slug: 'salaries', path: '/salaries' },
  { slug: 'compliance', path: '/compliance' },
  { slug: 'guides', path: '/guides' },
  { slug: 'pricing', path: '/pricing' },
  { slug: 'about', path: '/about' },
  { slug: 'contact', path: '/contact' },
  { slug: 'login', path: '/login' },
  { slug: 'signup', path: '/signup' },
  { slug: 'countries', path: '/countries' },
];

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const results = [];

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  for (const page of PAGES) {
    const url = BASE_URL + page.path;
    console.log('\n=== Visiting: ' + url + ' ===');
    const tab = await browser.newPage();

    const consoleLogs = [];
    const jsErrors = [];
    tab.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || type === 'warning') consoleLogs.push({ type, text });
    });
    tab.on('pageerror', err => jsErrors.push(err.message));

    await tab.setViewport({ width: 1280, height: 900 });
    let status = 'error';
    let title = null;
    let loadError = null;
    try {
      const resp = await tab.goto(url, { waitUntil: 'load', timeout: 25000 });
      status = resp ? resp.status() : 'unknown';
      console.log('  status: ' + status);
      await new Promise(r => setTimeout(r, 3000));
      title = await tab.title();
      console.log('  title: ' + title);
      await tab.screenshot({ path: path.join(SCREENSHOT_DIR, page.slug + '-desktop.png'), fullPage: true });
      await tab.setViewport({ width: 390, height: 844 });
      await new Promise(r => setTimeout(r, 1000));
      await tab.screenshot({ path: path.join(SCREENSHOT_DIR, page.slug + '-mobile.png'), fullPage: true });
    } catch(e) {
      loadError = e.message;
      console.error('  ERROR: ' + e.message);
      try { await tab.screenshot({ path: path.join(SCREENSHOT_DIR, page.slug + '-error.png'), fullPage: true }); } catch(_) {}
    }

    results.push({ slug: page.slug, url, status, title, consoleLogs, jsErrors, loadError });
    await tab.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'audit-results.json'), JSON.stringify(results, null, 2));
  console.log('\n\n======= SUMMARY =======');
  for (const r of results) {
    const issues = r.consoleLogs.filter(l => l.type === 'error').length + r.jsErrors.length + (r.loadError ? 1 : 0);
    console.log('[' + (issues > 0 || r.status >= 400 ? 'FAIL' : ' OK ') + '] ' + r.slug + ' | HTTP ' + r.status + ' | Errors: ' + issues);
    if (r.loadError) console.log('       LOAD: ' + r.loadError.substring(0, 120));
    r.jsErrors.forEach(e => console.log('       JS: ' + e.substring(0, 120)));
    r.consoleLogs.filter(l => l.type === 'error').slice(0, 3).forEach(l => console.log('       CON: ' + l.text.substring(0, 120)));
  }
  console.log('\nDone.');
})();
