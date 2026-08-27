import { Client } from "ssh2";
const conn = new Client();
conn.on("ready", () => {
  conn.exec(`
    cd /opt/akilibrain
    cat << 'EOF' > .env
DATABASE_URL=postgresql://postgres.pywienffahvmylssnorr:6g3kJKx9u%40Sb!Xn@aws-1-eu-central-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.pywienffahvmylssnorr:6g3kJKx9u%40Sb!Xn@aws-1-eu-central-1.pooler.supabase.com:6543/postgres
NEXT_PUBLIC_SUPABASE_URL=https://pywienffahvmylssnorr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5d2llbmZmYWh2bXlsc3Nub3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4OTM5OTMsImV4cCI6MjA5ODQ2OTk5M30.EzpyyED8RFFYbP9B9nPJXlL2ygdJH_QORfi2w-hx5A8
NEXT_PUBLIC_APP_URL=https://akilibrain.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1019183697703-mv45idg6e67rfq61jjf97i7tl1c7b4tn.apps.googleusercontent.com
EOF

    echo "=> Checking .env file:"
    grep -E "^(DATABASE|DIRECT)" .env
    
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
