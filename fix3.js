
import fs from 'fs';
import { Client } from 'ssh2';
const conn = new Client();
conn.on('ready', () => {
  conn.exec('cat /opt/akilibrain/src/lib/ai/router.ts', (err, stream) => {
    let content = '';
    stream.on('data', d => content += d.toString());
    stream.on('close', () => {
      content = content.replace('supportsStructured: false, // SambaNova doesn\'t support the Response API for JSON schema', 'supportsStructured: true, // Switched to true to use text-mode fallback');
      conn.exec('cat > /opt/akilibrain/src/lib/ai/router.ts', (err2, stream2) => {
        stream2.on('close', () => {
            conn.exec('pkill -9 -f node || true; tmux kill-session -t scraper; tmux new-session -d -s scraper \'cd /opt/akilibrain && node scripts/scrape_master.js > scrape_master.log 2>&1\'', (err3, stream3) => {
                stream3.on('close', () => {
                    console.log('Fixed SambaNova and Restarted!');
                    conn.end();
                });
            });
        });
        stream2.write(content);
        stream2.end();
      });
    });
  });
}).connect({ host: '172.105.58.237', port: 22, username: 'root', password: 'Bagamoyo101!!', readyTimeout: 30000 });

