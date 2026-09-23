async function testUrls() {
  const urls = [
    'https://jobwebrwanda.com/',
    'https://jobwebethiopia.com/jobs/page/3/',
    'https://jobwebzambia.com/jobs/page/3/',
    'https://jobwebghana.com/jobs/page/3/',
    'https://jobwebkenya.com/jobs/page/6/',
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(6000)
      });
      console.log(`${u} -> HTTP ${res.status}`);
    } catch (e) {
      console.log(`${u} -> Error: ${e.message}`);
    }
  }
}
testUrls();
