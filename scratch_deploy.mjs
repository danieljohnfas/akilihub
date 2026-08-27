import { Client } from "ssh2";
const conn = new Client();
conn.on("ready", () => {
  conn.exec(`
    cd /opt/akilibrain
    
    echo "=> Pulling latest changes from GitHub..."
    git fetch origin main
    git reset --hard origin/main
    
    echo "=> Rebuilding and restarting Docker containers to sync with main branch..."
    docker compose -f docker-compose.prod.yml down
    docker compose -f docker-compose.prod.yml up -d --build
  `, (err, stream) => {
    if (err) throw err;
    stream.on("close", (code) => {
      console.log("=> Finished with code: " + code);
      conn.end();
    }).on("data", (data) => {
      console.log(data.toString().trim());
    }).stderr.on("data", (data) => {
      console.error("STDERR:", data.toString().trim());
    });
  });
}).connect({
  host: "172.105.58.237", port: 22, username: "root",
  password: "Bagamoyo101!!", readyTimeout: 30000
});
