const http = require('http');

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    res.setHeader('Content-Type', 'application/json');
    
    if (req.url === '/search' && req.method === 'POST') {
      console.log("[Mock Sidecar] Received /search request");
      res.end(JSON.stringify({
        success: true,
        results: [
          { title: "Mock Tender 1", url: "https://nest.go.tz/mock1", snippet: "A mock tender" },
          { title: "Mock Tender 2", url: "https://nest.go.tz/mock2", snippet: "Another mock tender" }
        ]
      }));
    } else if (req.url === '/extract_text' && req.method === 'POST') {
      console.log("[Mock Sidecar] Received /extract_text request");
      res.end(JSON.stringify({
        success: true,
        text: "This is mock extracted text from Trafilatura sidecar.\n\nMock Tender Title: Construction of Road\nDeadline: 2026-12-31\nAuthority: Tanzania Road Agency",
        pdf_links: []
      }));
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ success: false, error: "Not found" }));
    }
  });
});

server.listen(8001, () => {
  console.log("Mock Sidecar listening on port 8001");
});
