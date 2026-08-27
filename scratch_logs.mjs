import { Client } from "ssh2";
const conn = new Client();
conn.on("ready", () => {
  conn.exec(`
    cd /opt/akilibrain
    docker logs --tail 100 akilibrain-web-1
  `, (err, stream) => {
    if (err) throw err;
    stream.on("close", (code) => {
      conn.end();
    }).on("data", (data) => {
      console.log(data.toString());
    }).stderr.on("data", (data) => {
      console.error("STDERR:", data.toString());
    });
  });
}).connect({
  host: "172.105.58.237", port: 22, username: "root",
  password: "Bagamoyo101!!", readyTimeout: 30000
});
