import { Client } from "ssh2";
const conn = new Client();
conn.on("ready", () => {
  conn.exec(`
    docker logs --tail 200 akilibrain-web-1
  `, (err, stream) => {
    if (err) throw err;
    stream.on("close", (code) => { conn.end(); })
    .on("data", (d) => process.stdout.write(d.toString()))
    .stderr.on("data", (d) => process.stderr.write(d.toString()));
  });
}).connect({ host: "172.105.58.237", port: 22, username: "root", password: "Bagamoyo101!!", readyTimeout: 30000 });
