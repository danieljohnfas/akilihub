const http = require('http');

const body = JSON.stringify({ query: 'What are the latest IT tenders in Tanzania?' });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Strategy used:', parsed.strategyUsed);
      console.log('Response:', parsed.response?.slice(0, 300));
    } catch {
      console.log('Raw:', data.slice(0, 500));
    }
  });
});
req.on('error', e => console.error('Error:', e.message));
req.write(body);
req.end();
