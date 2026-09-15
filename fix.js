
import fs from "fs";
import { Client } from "ssh2";
const conn = new Client();
const newScript = `import { spawn } from "child_process";
const countries = ["TZ", "KE", "UG", "RW", "ET", "CD", "BI", "SO", "SS"];

async function run() {
  while (true) {
    for (const country of countries) {
      console.log("\\n====================================");
      console.log("=== SCRAPING " + country + " ===");
      console.log("====================================\\n");
      await new Promise((resolve) => {
        const child = spawn("node", ["--env-file=.env", "node_modules/.bin/tsx", "scripts/mass-scrape.ts", country], { stdio: "inherit" });
        child.on("close", resolve);
      });
    }
  }
}
run();`;

conn.on("ready", () => {
  conn.exec("cat > /opt/akilibrain/scripts/scrape_master.js", (err, stream) => {
    if (err) throw err;
    stream.on("close", () => { 
        conn.exec("pkill -9 -f node || true; cd /opt/akilibrain && nohup node scripts/scrape_master.js </dev/null > scrape_master.log 2>&1 &", (err2, stream2) => {
           stream2.on("close", () => {
               console.log("Restarted server");
               conn.end();
           });
        });
    })
    .on("data", (d) => process.stdout.write(d.toString()))
    .stderr.on("data", (d) => process.stderr.write(d.toString()));
    
    stream.write(newScript);
    stream.end();
  });
}).connect({ host: "172.105.58.237", port: 22, username: "root", password: "Bagamoyo101!!", readyTimeout: 30000 });

