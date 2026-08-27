import { Client } from "ssh2";
const conn = new Client();
conn.on("ready", () => {
  console.log("=> Connected");
  conn.exec(`
    cd /opt/akilibrain
    echo "=> Recreating containers to pick up new .env..."
    docker compose -f docker-compose.prod.yml up -d --force-recreate --no-build
    sleep 5
    echo ""
    echo "=> DATABASE_URL inside container:"
    docker exec akilibrain-web-1 env | grep DATABASE_URL | cut -c1-100
    echo ""
    echo "=> NEXT_PUBLIC_SUPABASE_URL inside container:"
    docker exec akilibrain-web-1 env | grep NEXT_PUBLIC_SUPABASE_URL | head -1
    echo ""
    echo "=> HTTP check:"
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
    echo ""
  `, (err, stream) => {
    if (err) throw err;
    stream.on("close", (code) => { console.log("Exit:", code); conn.end(); })
    .on("data", (d) => process.stdout.write(d.toString()))
    .stderr.on("data", (d) => process.stderr.write(d.toString()));
  });
}).connect({ host: "172.105.58.237", port: 22, username: "root", password: "Bagamoyo101!!", readyTimeout: 30000 });
