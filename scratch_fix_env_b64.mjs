import { Client } from "ssh2";
const conn = new Client();

const B64 = "REFUQUJBU0VfVVJMPXBvc3RncmVzcWw6Ly9wb3N0Z3Jlcy5weXdpZW5mZmFodm15bHNzbm9ycjo2ZzNrSkt4OXUlNDBTYiFYbkBhd3MtMS1ldS1jZW50cmFsLTEucG9vbGVyLnN1cGFiYXNlLmNvbTo2NTQzL3Bvc3RncmVzCkRJUkVDVF9VUkw9cG9zdGdyZXNxbDovL3Bvc3RncmVzLnB5d2llbmZmYWh2bXlsc3Nub3JyOjZnM2tKS3g5dSU0MFNiIVhuQGF3cy0xLWV1LWNlbnRyYWwtMS5wb29sZXIuc3VwYWJhc2UuY29tOjY1NDMvcG9zdGdyZXMKTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMPWh0dHBzOi8vcHl3aWVuZmZhaHZteWxzc25vcnIuc3VwYWJhc2UuY28KTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVk9ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CNWQybGxibVptWVdoMmJYbHNjM051YjNKeUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzT0RJNE9UTTVPVE1zSW1WNGNDSTZNakE1T0RRMk9UazVNMzAuRXpweXlFRDhSRkZZYlA5QjluUEpYbEwyeWdkSkhfUU9SZmkydy1oeDVBOApORVhUX1BVQkxJQ19BUFBfVVJMPWh0dHBzOi8vYWtpbGlicmFpbi5jb20KTkVYVF9QVUJMSUNfR09PR0xFX0NMSUVOVF9JRD0xMDE5MTgzNjk3NzAzLW12NDVpZGc2ZTY3cmZxNjFqamY5N2k3dGwxYzdiNHRuLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29t";

conn.on("ready", () => {
  console.log("=> Connected");
  const cmd = `
    cd /opt/akilibrain
    echo "${B64}" | base64 -d > .env
    echo "=> .env written. Verifying:"
    cat .env | grep -v ANON_KEY
    echo ""
    echo "=> Restarting web container..."
    docker compose -f docker-compose.prod.yml restart web
    echo "=> Waiting for container to start..."
    sleep 5
    echo "=> DATABASE_URL inside container:"
    docker exec akilibrain-web-1 env | grep DATABASE_URL | cut -c1-90
    echo ""
    echo "=> HTTP status:"
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
    echo ""
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on("close", (code) => { console.log("Exit:", code); conn.end(); })
    .on("data", (d) => process.stdout.write(d.toString()))
    .stderr.on("data", (d) => process.stderr.write(d.toString()));
  });
}).connect({ host: "172.105.58.237", port: 22, username: "root", password: "Bagamoyo101!!", readyTimeout: 30000 });
