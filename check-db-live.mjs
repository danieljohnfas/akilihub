import { Client } from "ssh2";
const conn = new Client();
conn.on("ready", () => {
  conn.exec(`
    cd /opt/akilibrain
    docker exec akilibrain-web-1 npx tsx -e "
      import { db } from './src/lib/db/client';
      import { sql } from 'drizzle-orm';
      async function run() {
        const jobs = await db.execute(sql\`SELECT count(*) FROM jobs WHERE date_trunc('day', created_at) = CURRENT_DATE\`);
        const tenders = await db.execute(sql\`SELECT count(*) FROM tenders WHERE date_trunc('day', created_at) = CURRENT_DATE\`);
        console.log('Jobs scraped today:', jobs[0].count);
        console.log('Tenders scraped today:', tenders[0].count);
        process.exit(0);
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
