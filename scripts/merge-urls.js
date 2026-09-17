const fs = require('fs');
const file = 'src/lib/sources/discovered-careers.json';
const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
const newUrls = [
  {"company": "Safaricom", "country": "Kenya", "url": "https://www.safaricom.co.ke/careers"},
  {"company": "Equity Bank", "country": "Kenya", "url": "https://equitygroupholdings.com/ke/careers"},
  {"company": "KCB Group", "country": "Kenya", "url": "https://ke.kcbgroup.com/about-us/careers"},
  {"company": "NMB Bank", "country": "Tanzania", "url": "https://www.nmbbank.co.tz/careers"},
  {"company": "CRDB Bank", "country": "Tanzania", "url": "https://crdbbank.co.tz/careers"},
  {"company": "Stanbic Bank", "country": "Uganda", "url": "https://www.stanbicbank.co.ug/ug/personal/about-us/careers"},
  {"company": "MTN Uganda", "country": "Uganda", "url": "https://www.mtn.co.ug/careers/"},
  {"company": "Bank of Kigali", "country": "Rwanda", "url": "https://bk.rw/careers"},
  {"company": "MTN Rwanda", "country": "Rwanda", "url": "https://www.mtn.co.rw/careers/"},
  {"company": "MTN Ghana", "country": "Ghana", "url": "https://mtn.com.gh/careers/"},
  {"company": "Ecobank", "country": "Ghana", "url": "https://ecobank.com/gh/personal-banking/careers"},
  {"company": "Dangote Group", "country": "Nigeria", "url": "https://dangote.com/careers/"},
  {"company": "MTN Nigeria", "country": "Nigeria", "url": "https://www.mtn.ng/careers/"},
  {"company": "Zenith Bank", "country": "Nigeria", "url": "https://www.zenithbank.com/careers/"},
  {"company": "ZANACO", "country": "Zambia", "url": "https://www.zanaco.co.zm/careers/"},
  {"company": "MTN Zambia", "country": "Zambia", "url": "https://www.mtn.zm/careers/"},
  {"company": "Standard Bank", "country": "South Africa", "url": "https://www.standardbank.com/sbg/standard-bank-group/careers"},
  {"company": "Sasol", "country": "South Africa", "url": "https://www.sasol.com/careers"},
  {"company": "Ethio Telecom", "country": "Ethiopia", "url": "https://www.ethiotelecom.et/careers/"}
];

const merged = [...existing];
newUrls.forEach(n => {
  if (!merged.find(e => e.company === n.company)) {
    merged.push({ ...n, sector: 'Major Corporates' });
  }
});

fs.writeFileSync(file, JSON.stringify(merged, null, 2));
console.log('Successfully merged ' + newUrls.length + ' new URLs.');
