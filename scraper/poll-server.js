const http = require('http');

function check() {
  const req = http.request({
    hostname: 'localhost',
    port: 8001,
    path: '/',
    method: 'HEAD'
  }, (res) => {
    // If we get any response, the server is up
    console.log("Server is up! Exit code 0");
    process.exit(0);
  });

  req.on('error', (e) => {
    // Connection refused, server not up yet
    setTimeout(check, 5000);
  });

  req.end();
}

check();
