import { Client } from "ssh2";
const conn = new Client();
conn.on("ready", () => {
  console.log("=> Connected - starting full rebuild...");
  // Use a longer timeout - build takes ~3 minutes
  conn.exec(`
    cd /opt/akilibrain

    echo "=> Verifying .env before build..."
    grep -E "^NEXT_PUBLIC_SUPABASE" .env

    echo "=> Full rebuild with NEXT_PUBLIC vars baked in..."
    docker compose -f docker-compose.prod.yml up -d --build

    echo "=> Verifying NEXT_PUBLIC inside container after build..."
    sleep 5
    docker exec akilibrain-web-1 env | grep NEXT_PUBLIC_SUPABASE_URL

    echo ""
    echo "=> HTTP check:"
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
    echo ""
  `, { pty: false }, (err, stream) => {
    if (err) throw err;
    stream.on("close", (code) => { console.log("Exit:", code); conn.end(); })
    .on("data", (d) => process.stdout.write(d.toString()))
    .stderr.on("data", (d) => process.stderr.write(d.toString()));
  });
}).connect({ host: "172.105.58.237", port: 22, username: "root", password: "Bagamoyo101!!", readyTimeout: 30000 });
