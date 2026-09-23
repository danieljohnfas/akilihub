async function testHiiraanRaw() {
  const url = 'https://www.hiiraan.com/jobs.php';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
  });
  console.log('Status:', res.status);
  console.log('Headers:', Object.fromEntries(res.headers.entries()));
  const html = await res.text();
  console.log('Length:', html.length);
  console.log('Content:\n', html.slice(0, 500));
}

testHiiraanRaw();
