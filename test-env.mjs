import { Client } from "ssh2";
const conn = new Client();
conn.on("ready", () => {
  conn.exec(`cat /opt/akilibrain/.env | grep -E "SERPER|API|SEARCH"`, (err, stream) => {
    if (err) throw err;
    stream.on("close", () => conn.end())
    .on("data", (d) => process.stdout.write(d.toString()));
  });
}).connect({ host: "172.105.58.237", port: 22, username: "root", password: "Bagamoyo101!!", readyTimeout: 30000 });
