async function findFetchCall() {
  const res = await fetch('https://somalijobs.com/v3/src/editing-js/jobs/listing.js', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
  });
  const text = await res.text();
  const idx = text.indexOf('/jobs/fetch/');
  if (idx !== -1) {
    console.log(text.slice(Math.max(0, idx - 200), Math.min(text.length, idx + 400)));
  } else {
    console.log('Not found');
  }
}

findFetchCall();
