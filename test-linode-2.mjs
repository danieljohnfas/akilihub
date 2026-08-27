import { Client } from "ssh2";
const conn = new Client();
conn.on("ready", () => {
  conn.exec(`
    cd /opt/akilibrain
    docker exec akilibrain-web-1 npx tsx -e "
      import fetch from 'node-fetch';
      import * as cheerio from 'cheerio';
      async function run() {
        const res = await fetch('https://html.duckduckgo.com/html/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          body: 'q=' + encodeURIComponent('accounting jobs Dar es Salaam')
        });
        const html = await res.text();
        console.log('Result URL count:', html.split('result__url').length - 1);
      }
      run();
    "
  `, (err, stream) => {
    if (err) throw err;
    stream.on("close", () => conn.end())
    .on("data", (d) => process.stdout.write(d.toString()))
    .stderr.on("data", (d) => process.stderr.write(d.toString()));
  });
}).connect({ host: "172.105.58.237", port: 22, username: "root", password: "Bagamoyo101!!", readyTimeout: 30000 });
