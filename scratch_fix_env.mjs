import { Client } from "ssh2";
const conn = new Client();
conn.on("ready", () => {
  conn.exec(`
    cd /opt/akilibrain
    
    echo "=> Fixing .env file newlines..."
    cat .env | sed 's/DIRECT_URL/\\nDIRECT_URL/g' | sed 's/NEXT_PUBLIC/\\nNEXT_PUBLIC/g' > .env.tmp
    mv .env.tmp .env
    
    echo "=> Checking .env file:"
    grep -E "^(DATABASE|DIRECT|NEXT_PUBLIC)" .env
    
    echo "=> Restarting web container..."
    docker compose -f docker-compose.prod.yml restart web
  `, (err, stream) => {
    if (err) throw err;
    stream.on("close", (code) => {
      console.log("=> Finished with code: " + code);
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
