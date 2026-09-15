import { htmlToText } from './src/lib/scrapers/compliance-base';

const sampleHtml = `
<html>
<body>
  <header><h1>Welcome to Our Company</h1></header>
  <div>
    <h2>Job Vacancy: Senior Developer</h2>
    <p>We are looking for a Senior Developer to join our team.</p>
    <ul>
      <li>5+ years of experience</li>
      <li>React, Node.js</li>
    </ul>
    <p>Please apply <a href="/apply">here</a>.</p>
  </div>
  <footer><p>Copyright 2026</p></footer>
</body>
</html>
`;

console.log("Converted Markdown:\n");
console.log(htmlToText(sampleHtml, 'https://example.com'));
