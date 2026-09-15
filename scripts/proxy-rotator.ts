import fs from 'fs';
import https from 'https';
import http from 'http';

const PROXY_FILE = 'scripts/proxies.json';
const PROXY_SOURCES = [
  'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=3000&country=all&ssl=all&anonymity=all',
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
  'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
  'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt'
];

async function fetchFromSource(url: string): Promise<string[]> {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data.split('\n').map(l => l.trim()).filter(Boolean)));
    }).on('error', () => resolve([]));
  });
}

async function testProxy(proxyStr: string): Promise<boolean> {
  return new Promise((resolve) => {
    const [host, port] = proxyStr.split(':');
    if (!host || !port) return resolve(false);

    const req = http.request({
      host,
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
      let allProxies: string[] = [];
      for (const source of PROXY_SOURCES) {
        console.log('[ProxyRotator] Fetching from ' + source + '...');
        const p = await fetchFromSource(source);
        allProxies.push(...p);
      }
      
      allProxies = allProxies.sort(() => 0.5 - Math.random()).slice(0, 300);
      console.log('[ProxyRotator] Testing ' + allProxies.length + ' proxies for HF connectivity...');
      
      const workingProxies: string[] = [];
      const BATCH_SIZE = 50;
      for (let i = 0; i < allProxies.length; i += BATCH_SIZE) {
        const batch = allProxies.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(p => testProxy(p)));
        results.forEach((works, idx) => {
          if (works) workingProxies.push(batch[idx]);
        });
      }
      
      if (workingProxies.length > 0) {
        console.log([ProxyRotator] Found  working proxies. Saving to disk.);
        fs.writeFileSync(PROXY_FILE, JSON.stringify(workingProxies, null, 2));
      } else {
        console.log([ProxyRotator] Found 0 working proxies this round.);
      }
      
    } catch (err: any) {
      console.error('[ProxyRotator] Error:', err.message);
    }
    
    await new Promise(r => setTimeout(r, 5 * 60 * 1000));
  }
}

run();
