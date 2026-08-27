import { Client } from "ssh2";
const conn = new Client();
conn.on("ready", () => {
  conn.exec(`
    echo "=> Container env check:"
    docker exec akilibrain-web-1 env | grep -E "^(DATABASE_URL|NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY)" | cut -c1-80
    
    echo ""
    echo "=> Health check on port 3000:"
    sleep 3
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 
    echo ""
    
    echo "=> Recent container logs (last 20 lines):"
    docker logs --tail 20 akilibrain-web-1 2>&1 | tail -20
  `, (err, stream) => {
    if (err) throw err;
    stream.on("close", (code) => { conn.end(); })
    .on("data", (data) => { console.log(data.toString()); })
    .stderr.on("data", (data) => { process.stdout.write("STDERR: " + data.toString()); });
  });
}).connect({ host: "172.105.58.237", port: 22, username: "root", password: "Bagamoyo101!!", readyTimeout: 30000 });
