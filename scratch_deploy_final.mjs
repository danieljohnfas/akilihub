import { Client } from "ssh2";
const conn = new Client();
conn.on("ready", () => {
  console.log("=> Connected to Linode");
  conn.exec(`
    cd /opt/akilibrain
    echo "=> Pulling latest from GitHub..."
    git fetch origin main
    git reset --hard origin/main
    echo "=> Git status:"
    git log --oneline -5
    echo ""
    echo "=> Rebuilding Docker image with latest code..."
    docker compose -f docker-compose.prod.yml up -d --build
    echo "=> Waiting for app to start..."
    sleep 8
    echo ""
    echo "=> Container status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "=> HTTP check:"
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
    echo ""
  `, (err, stream) => {
    if (err) throw err;
    stream.on("close", (code) => { console.log("=> Done, exit:", code); conn.end(); })
    .on("data", (d) => process.stdout.write(d.toString()))
    .stderr.on("data", (d) => process.stderr.write(d.toString()));
  });
}).connect({ host: "172.105.58.237", port: 22, username: "root", password: "Bagamoyo101!!", readyTimeout: 30000 });
