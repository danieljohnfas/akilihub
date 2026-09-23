async function testHiiraanBody2() {
  const url = 'https://www.hiiraan.com/jobs.php';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
  });
  const html = await res.text();
  console.log('Middle of HTML 2:\n', html.slice(6000, 14000));
}

testHiiraanBody2();
