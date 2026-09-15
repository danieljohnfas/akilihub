
import fs from 'fs';
import { Client } from 'ssh2';
const conn = new Client();
const routerScript = fs.readFileSync('src/lib/ai/router.ts', 'utf8');
const searchScript = fs.readFileSync('src/lib/scrapers/broad-search-engine.ts', 'utf8');

conn.on('ready', () => {
  conn.exec('cat > /opt/akilibrain/src/lib/ai/router.ts', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => { 
        conn.exec('cat > /opt/akilibrain/src/lib/scrapers/broad-search-engine.ts', (err2, stream2) => {
            stream2.on('close', () => {
                conn.exec('pkill -9 node || true; tmux kill-session -t scraper; tmux new-session -d -s scraper \'cd /opt/akilibrain && node scripts/scrape_master.js > scrape_master.log 2>&1\'', (err3, stream3) => {
                   stream3.on('close', () => {
                       console.log('Restarted server');
                       conn.end();
                   });
                });
            });
            stream2.write(searchScript);
            stream2.end();
        });
    });
    stream.write(routerScript);
    stream.end();
  });
}).connect({ host: '172.105.58.237', port: 22, username: 'root', password: 'Bagamoyo101!!', readyTimeout: 30000 });

