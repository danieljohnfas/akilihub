const fs = require('fs');
const https = require('https');
const http = require('http');

const PROXY_FILE = 'scripts/proxies.json';
const PROXY_SOURCES = [
  'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=3000&country=all&ssl=all&anonymity=all',
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
  'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
  'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt'
];

async function fetchFromSource(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data.split('\n').map(l => l.trim()).filter(Boolean)));
    }).on('error', () => resolve([]));
  });
}

async function testProxy(proxyStr) {
  return new Promise((resolve) => {
    const parts = proxyStr.split(':');
    const host = parts[0];
    const port = parts[1];
    if (!host || !port) return resolve(false);

    const req = http.request({
      host: host,
      port: parseInt(port),
      method: 'CONNECT',
      path: 'router.huggingface.co:443',
      timeout: 3000
    });
    
    req.on('connect', (res, socket) => {
      if(res.statusCode === 200) {
        socket.destroy();
        resolve(true);
      } else {
        socket.destroy();
        resolve(false);
      }
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function run() {
  console.log('[ProxyRotator] Booting up continuous proxy harvester...');
  while (true) {
    try {
      let allProxies = [];
      for (let i = 0; i < PROXY_SOURCES.length; i++) {
        const source = PROXY_SOURCES[i];
        console.log('[ProxyRotator] Fetching from ' + source);
        const p = await fetchFromSource(source);
        for(let j = 0; j < p.length; j++) { allProxies.push(p[j]); }
      }
      
      allProxies = allProxies.sort(() => 0.5 - Math.random()).slice(0, 300);
      console.log('[ProxyRotator] Testing ' + allProxies.length + ' proxies for HF connectivity...');
      
      const workingProxies = [];
      const BATCH_SIZE = 50;
      for (let i = 0; i < allProxies.length; i += BATCH_SIZE) {
        const batch = allProxies.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(p => testProxy(p)));
        for (let j = 0; j < results.length; j++) {
          if (results[j]) workingProxies.push(batch[j]);
        }
      }
      
      if (workingProxies.length > 0) {
        console.log('[ProxyRotator] Found ' + workingProxies.length + ' working proxies.');
        fs.writeFileSync(PROXY_FILE, JSON.stringify(workingProxies, null, 2));
      } else {
        console.log('[ProxyRotator] Found 0 working proxies this round.');
      }
      
    } catch (err) {
      console.error('[ProxyRotator] Error:', err.message);
    }
    
    await new Promise(r => setTimeout(r, 5 * 60 * 1000));
  }
}

run();
