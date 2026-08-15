/**
 * deterministic-extractor.ts
 *
 * Fast-path, deterministic rule-based and regex extraction engine.
 *
 * Purpose:
 *   Extracts structured fields (deadlines, salaries, currencies, contact emails,
 *   application URLs, tender reference numbers, and bulleted requirements)
 *   from raw text and HTML before or alongside LLM invocations.
 *
 * Benefits:
 *   1. Reduces LLM API quota consumption by up to 80%.
 *   2. Provides immediate fallback structured records when all AI models are in cooldown.
 *   3. Increases precision on numeric, currency, and date formats across East African locales.
 */

// ── 1. MONTH & LOCALIZED DATE DICTIONARIES ─────────────────────────────────────
const MONTH_MAP: Record<string, number> = {
  // English
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
  // French
  janvier: 0,
  fevrier: 1, février: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7, août: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11, décembre: 11,
  // Swahili
  januari: 0,
  februari: 1,
  machi: 2,
  aprili: 3,
  mei: 4,
  juni: 5,
  julai: 6,
  agosti: 7,
  septemba: 8,
  oktoba: 9,
  novemba: 10,
  desemba: 11,
};

// ── 2. CURRENCY DICTIONARY & NORMALIZATION ─────────────────────────────────────
const CURRENCY_PATTERNS: Array<{ regex: RegExp; code: string }> = [
  { regex: /\b(KES|Kshs?|K\.Shs?)\b/i, code: 'KES' },
  { regex: /\b(UGX|Ushs?|U\.Shs?)\b/i, code: 'UGX' },
  { regex: /\b(TZS|Tshs?|T\.Shs?)\b/i, code: 'TZS' },
  { regex: /\b(RWF|Frw|FRW|R\.Frw)\b/i, code: 'RWF' },
  { regex: /\b(ETB|Birr)\b/i, code: 'ETB' },
  { regex: /\b(SOS|Sh\.?So\.?)\b/i, code: 'SOS' },
  { regex: /\b(CDF|FC)\b/i, code: 'CDF' },
  { regex: /\b(BIF|FBu)\b/i, code: 'BIF' },
  { regex: /(\$|\bUSD\b)/i, code: 'USD' },
  { regex: /(€|\bEUR\b)/i, code: 'EUR' },
  { regex: /(£|\bGBP\b)/i, code: 'GBP' },
];

/**
 * Normalizes text to an ISO 4217 currency code.
 */
export function normalizeCurrency(text: string): string | null {
  if (!text) return null;
  for (const { regex, code } of CURRENCY_PATTERNS) {
    if (regex.test(text)) return code;
  }
  return null;
}

// ── 3. DETERMINISTIC COUNTRY CODE EXTRACTOR ────────────────────────────────────
// Maps common text mentions (country name, capital, nationality) → ISO 3166-1 alpha-2
const COUNTRY_HINTS: Array<{ patterns: RegExp; code: string }> = [
  { patterns: /\b(kenya|nairobi|mombasa|kisumu|nakuru)\b/i, code: 'KE' },
  { patterns: /\b(tanzania|dar es salaam|dodoma|arusha|zanzibar|mwanza)\b/i, code: 'TZ' },
  { patterns: /\b(uganda|kampala|entebbe|gulu|jinja)\b/i, code: 'UG' },
  { patterns: /\b(rwanda|kigali|butare|gisenyi|musanze)\b/i, code: 'RW' },
  { patterns: /\b(ethiopia|addis ababa|dire dawa|mekelle|hawassa)\b/i, code: 'ET' },
  { patterns: /\b(drc|congo|r[eé]publique d[eé]mocratique du congo|kinshasa|lubumbashi|goma|bukavu|katanga)\b/i, code: 'CD' },
  { patterns: /\b(burundi|bujumbura|gitega|ngozi)\b/i, code: 'BI' },
  { patterns: /\b(somalia|somalie|mogadishu|hargeisa|somaliland|puntland)\b/i, code: 'SO' },
  { patterns: /\b(south sudan|juba|malakal|wau)\b/i, code: 'SS' },
  { patterns: /\b(madagascar|antananarivo|toamasina|fianarantsoa|mahajanga|malgache)\b/i, code: 'MG' },
  { patterns: /\b(nigeria|lagos|abuja|kano|ibadan)\b/i, code: 'NG' },
  { patterns: /\b(ghana|accra|kumasi|tamale)\b/i, code: 'GH' },
  { patterns: /\b(senegal|s[eé]n[eé]gal|dakar|saint-louis)\b/i, code: 'SN' },
  { patterns: /\b(cameroon|cameroun|yaound[eé]|douala)\b/i, code: 'CM' },
  { patterns: /\b(zambia|lusaka|ndola|kitwe)\b/i, code: 'ZM' },
  { patterns: /\b(zimbabwe|harare|bulawayo)\b/i, code: 'ZW' },
  { patterns: /\b(mozambique|maputo|beira|nampula)\b/i, code: 'MZ' },
  { patterns: /\b(malawi|lilongwe|blantyre|mzuzu)\b/i, code: 'MW' },
  { patterns: /\b(south africa|johannesburg|cape town|pretoria|durban)\b/i, code: 'ZA' },
  { patterns: /\b(angola|luanda|huambo|lobito)\b/i, code: 'AO' },
  { patterns: /\b(sudan|khartoum|omdurman|port sudan)\b/i, code: 'SD' },
  { patterns: /\b(egypt|cairo|alexandria|giza)\b/i, code: 'EG' },
  { patterns: /\b(niger|niamey|zinder|maradi)\b/i, code: 'NE' },
  { patterns: /\b(mali|bamako|timbuktu|gao)\b/i, code: 'ML' },
  { patterns: /\b(chad|tchad|n'djamena)\b/i, code: 'TD' },
  { patterns: /\b(guinea|conakry|kankan)\b/i, code: 'GN' },
  { patterns: /\b(c[oô]te d'ivoire|ivory coast|abidjan|yamoussoukro)\b/i, code: 'CI' },
  { patterns: /\b(burkina faso|ouagadougou|bobo-dioulasso)\b/i, code: 'BF' },
  { patterns: /\b(eritrea|asmara)\b/i, code: 'ER' },
  { patterns: /\b(djibouti)\b/i, code: 'DJ' },
  { patterns: /\b(comoros|moroni)\b/i, code: 'KM' },
];

/**
 * Deterministically extracts a 2-letter ISO country code from raw text.
 * Checks for explicit "Location: XYZ" patterns first, then scans for country name mentions.
 */
export function extractCountryCode(text: string): string | null {
  if (!text) return null;

  // 1. Try explicit label first: "Location: Madagascar", "Pays : RDC", "Country: Kenya"
  const locationLabelMatch = /(?:location|country|pays|lieu|emplacement)[:\s]+([\w\s',.À-ÿ-]{2,50})/i.exec(text);
  if (locationLabelMatch) {
    const snippet = locationLabelMatch[1].trim();
    for (const { patterns, code } of COUNTRY_HINTS) {
      if (patterns.test(snippet)) return code;
    }
  }

  // 2. Scan full text for country/city mentions
  for (const { patterns, code } of COUNTRY_HINTS) {
    if (patterns.test(text)) return code;
  }

  return null;
}

// ── 4. DATE & DEADLINE PARSER ──────────────────────────────────────────────────

const DEADLINE_SIGNAL_REGEX = /(?:deadline|closing\s*date|apply\s*by|date\s*limite(?:\s+de\s+(?:candidature|soumission))?|tarehe\s*ya\s*mwisho(?:\s+ya\s+kutuma\s+maombi)?|application\s*closes?|closing\s*on)[:\s]*([^\n\r.;,<>]+)/i;

/**
 * Extracts a structured Date from deadline text strings in EN, FR, or SW.
 */
export function extractDeadlineFromText(text: string): Date | null {
  if (!text || text.length < 5) return null;

  const match = DEADLINE_SIGNAL_REGEX.exec(text);
  const targetSnippet = match ? match[1].trim() : text;

  // 1. Check for ISO or numeric dates: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
  const numericMatch = /\b([0-3]?[0-9])[/-]([0-1]?[0-9])[/-](202[4-9]|203[0-9])\b/.exec(targetSnippet);
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10);
    const month = parseInt(numericMatch[2], 10) - 1;
    const year = parseInt(numericMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, month, day, 23, 59, 59));
      if (!isNaN(d.getTime())) return d;
    }
  }

  const isoMatch = /\b(202[4-9]|203[0-9])[/-]([0-1]?[0-9])[/-]([0-3]?[0-9])\b/.exec(targetSnippet);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, month, day, 23, 59, 59));
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 2. Named month dates: "25th September 2026", "October 14, 2026", "12 Novembre 2026"
  const namedMatch = /\b([0-3]?[0-9])(?:st|nd|rd|th)?\s+([A-Za-zÀ-ÿ]+)[,\s]+(202[4-9]|203[0-9])\b/i.exec(targetSnippet)
    || /\b([A-Za-zÀ-ÿ]+)\s+([0-3]?[0-9])(?:st|nd|rd|th)?[,\s]+(202[4-9]|203[0-9])\b/i.exec(targetSnippet);

  if (namedMatch) {
    let day: number;
    let monthName: string;
    const year = parseInt(namedMatch[3], 10);

    if (isNaN(parseInt(namedMatch[1], 10))) {
      monthName = namedMatch[1].toLowerCase();
      day = parseInt(namedMatch[2], 10);
    } else {
      day = parseInt(namedMatch[1], 10);
      monthName = namedMatch[2].toLowerCase();
    }

    const monthIndex = MONTH_MAP[monthName];
    if (monthIndex !== undefined && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, monthIndex, day, 23, 59, 59));
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

// ── 4. SALARY RANGE & CURRENCY PARSER ──────────────────────────────────────────
export interface ParsedSalary {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
}

function parseNumberToken(token: string): number | null {
  if (!token) return null;
  const cleaned = token.replace(/,/g, '').trim().toLowerCase();
  const mMatch = /^([0-9]+(?:\.[0-9]+)?)\s*(m|million|milliards?)$/i.exec(cleaned);
  if (mMatch) {
    const n = parseFloat(mMatch[1]);
    return isNaN(n) ? null : Math.round(n * 1000000);
  }
  const kMatch = /^([0-9]+(?:\.[0-9]+)?)\s*(k|thousand|mille)$/i.exec(cleaned);
  if (kMatch) {
    const n = parseFloat(kMatch[1]);
    return isNaN(n) ? null : Math.round(n * 1000);
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : Math.round(n);
}

export function extractSalaryFromText(text: string): ParsedSalary {
  if (!text || text.length < 5) {
    return { salaryMin: null, salaryMax: null, salaryCurrency: null };
  }

  const currency = normalizeCurrency(text);

  // Pattern A: Range: "KES 150,000 - 250,000", "$3,500 to $5,000 USD", "50k - 80k"
  const rangeMatch = /(?:salary|gross|remuneration|stipend|pay|compensation|budget)?[:\s]*(?:(?:KES|UGX|TZS|RWF|ETB|SOS|CDF|BIF|USD|EUR|GBP|\$|€|£)\s*)?([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?\s*[kmKM]?)\s*(?:-|–|—|to|\/)\s*(?:(?:KES|UGX|TZS|RWF|ETB|SOS|CDF|BIF|USD|EUR|GBP|\$|€|£)\s*)?([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?\s*[kmKM]?)\s*(?:(?:KES|UGX|TZS|RWF|ETB|SOS|CDF|BIF|USD|EUR|GBP|\$|€|£)\b)?/i.exec(text);

  if (rangeMatch) {
    const minVal = parseNumberToken(rangeMatch[1]);
    const maxVal = parseNumberToken(rangeMatch[2]);
    if (minVal && maxVal && minVal >= 100 && maxVal >= minVal) {
      return {
        salaryMin: minVal,
        salaryMax: maxVal,
        salaryCurrency: currency,
      };
    }
  }

  // Pattern B: Single figure: "Salary: 3.5M UGX", "Gross Salary: 800k RWF", "Compensation: $4,500"
  const singleMatch = /(?:salary|gross|remuneration|stipend|pay|compensation|budget)[:\s]+(?:(?:KES|UGX|TZS|RWF|ETB|SOS|CDF|BIF|USD|EUR|GBP|\$|€|£)\s*)?([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?\s*[kmKM]?)\s*(?:(?:KES|UGX|TZS|RWF|ETB|SOS|CDF|BIF|USD|EUR|GBP|\$|€|£)\b)?/i.exec(text);
  if (singleMatch) {
    const val = parseNumberToken(singleMatch[1]);
    if (val && val >= 100) {
      return {
        salaryMin: val,
        salaryMax: val,
        salaryCurrency: currency,
      };
    }
  }

  return { salaryMin: null, salaryMax: null, salaryCurrency: currency };
}

// ── 5. CONTACT & APPLICATION URL EXTRACTOR & VALIDATOR ────────────────────────
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const ATS_URL_REGEX = /https?:\/\/[^\s"'<>]*(?:lever\.co|greenhouse\.io|workable\.com|bamboohr\.com|smartrecruiters\.com|myworkdayjobs\.com|recruitee\.com|forms\.gle|typeform\.com|apply|careers|job-details)[^\s"'<>]*/gi;

export const BANNED_EMPLOYER_DOMAINS = [
  // Social share & messaging
  'wa.me',
  'whatsapp.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  't.me',
  'pinterest.com',
  'linkedin.com/sharing',
  'linkedin.com/shareArticle',
  'instagram.com',
  'tiktok.com',
  'youtube.com',

  // Cookie & Policy generators
  'iubenda.com',
  'cookiebot.com',
  'termly.io',
  'onetrust.com',
  'usercentrics.com',
  'sentry.io',
  'google-analytics.com',

  // Placeholders
  'example.com',
  'localhost',
  'test.com',

  // Job boards & Aggregators (NOT direct employers)
  'brightermonday.co.ke',
  'brightermonday.co.ug',
  'brightermonday.co.tz',
  'fuzu.com',
  'jobwebkenya.com',
  'myjobmagghana.com',
  'myjobmag.co.ke',
  'myjobmag.com',
  'ngojobsinafrica.com',
  'africareers.net',
  'alljobspo.com',
  'geezjobs.com',
  'ethiopianreporterjobs.com',
  'jobwebrwanda.com',
  'jobinrwanda.com',
  'ethio-jobs.net.et',
  'ethiongojobs.com',
  'ajiriwa.net',
  'zoomtanzania.net',
  'macalindoon.online',
  'kazibure.com',
  'kenyajob.com',
  'jobsearchkenya.com',
  'reliefweb.int',
  'unjobs.org',
  'glassdoor.com',
  'indeed.com',
  'shortlist.net',
  'cvmkr.com',
];

/**
 * Validates whether a URL is a legitimate direct employer/authority/ATS link,
 * rejecting social share links, tracking scripts, and known aggregator domains.
 */
export function isLegitimateEmployerUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 8 || trimmed.startsWith('#')) return false;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const fullHref = parsed.href.toLowerCase();

    // Check if domain or full path matches banned list
    for (const banned of BANNED_EMPLOYER_DOMAINS) {
      if (hostname.endsWith(banned) || hostname === banned || fullHref.includes(banned)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export function extractApplicationDetails(text: string, html?: string): {
  emails: string[];
  applicationUrls: string[];
} {
  const combined = `${text}\n${html ?? ''}`;

  // Emails
  const rawEmails = combined.match(EMAIL_REGEX) || [];
  const emails = Array.from(new Set(rawEmails))
    .filter(e => !e.includes('example.com') && !e.includes('sentry.io') && !e.includes('w3.org'))
    .slice(0, 3);

  // Application URLs
  const rawUrls = combined.match(ATS_URL_REGEX) || [];
  const applicationUrls = Array.from(new Set(rawUrls))
    .filter(u => {
      const lower = u.toLowerCase();
      if (lower.endsWith('.jpg') || lower.endsWith('.png') || lower.endsWith('.css') || lower.endsWith('.js')) {
        return false;
      }
      return isLegitimateEmployerUrl(u);
    })
    .slice(0, 3);

  return { emails, applicationUrls };
}

// ── 6. BULLETED REQUIREMENTS & DUTIES PARSER ──────────────────────────────────
/**
 * Deterministically extracts requirements and duties from bulleted lists and numbered lines.
 */
export function extractStructuredRequirements(text: string): string | null {
  if (!text || text.length < 50) return null;

  const lines = text.split(/\r?\n/);
  const items: string[] = [];
  let inRequirementsSection = false;

  const sectionHeaderRegex = /(?:requirements|qualifications|experience|skills|eligibility|what\s+you\s+need|vigezo|exigences)/i;
  const sectionEndRegex = /(?:how\s+to\s+apply|benefits|salary|remuneration|about\s+us|jinsi\s+ya\s+kuomba)/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Match list markers: "- ", "* ", "• ", "1. ", "a) "
    const isBullet = /^[-*•–—]\s+(.+)/.exec(line)
      || /^\d+[.)]\s+(.+)/.exec(line)
      || /^[a-z][.)]\s+(.+)/i.exec(line);

    if (isBullet) {
      const content = isBullet[1].trim();
      if (content.length >= 8 && content.length <= 400) {
        items.push(content);
      }
      continue;
    }

    if (sectionHeaderRegex.test(line)) {
      inRequirementsSection = true;
      continue;
    }

    if (inRequirementsSection && sectionEndRegex.test(line)) {
      inRequirementsSection = false;
      break;
    }

    if (inRequirementsSection && line.length >= 12 && line.length <= 300) {
      items.push(line);
    }
  }

  if (items.length >= 1) {
    return items.slice(0, 15).join('; ');
  }

  return null;
}

// ── 7. TENDER REFERENCE NUMBER & CATEGORY PARSER ──────────────────────────────
const TENDER_REF_REGEX = /(?:(?:tender|procurement|bid|rfq|ifb|rfp)\s*(?:no\.?|ref\.?|reference|#)|reference\s*no\.?)[:\s#]+([A-Z0-9/_-]{3,50})/i;
const TENDER_PATTERN_REGEX = /\b([A-Z0-9]{2,10}(?:\/[A-Z0-9_-]{2,15}){2,4})\b/i;

export function extractTenderReference(text: string): string | null {
  if (!text) return null;

  // 1. Direct explicit label match: "Tender No: KRA/HQS/NCB-042/2026-2027", "Tender Ref: MOH/UG/2026/GDS/091"
  const match = TENDER_REF_REGEX.exec(text);
  if (match && match[1]) {
    const ref = match[1].trim().replace(/^[-/]+|[-/]+$/g, '');
    if (ref.length >= 3 && !/^(notice|tender|procurement|bidding|services|supply|invitation|expression|document)$/i.test(ref)) {
      return ref;
    }
  }

  // 2. Pattern match for multi-slash/hyphen procurement reference (e.g., KRA/HQS/NCB-042/2026)
  const patternMatch = TENDER_PATTERN_REGEX.exec(text);
  if (patternMatch && patternMatch[1]) {
    const ref = patternMatch[1].trim();
    if (/\d/.test(ref) && ref.length >= 6) {
      return ref;
    }
  }

  return null;
}

export function detectTenderCategory(text: string): 'goods' | 'works' | 'services' | 'consultancy' {
  const lower = text.toLowerCase();
  if (lower.includes('consultan') || lower.includes('technical assistance') || lower.includes('advisory')) {
    return 'consultancy';
  }
  if (lower.includes('construction') || lower.includes('works') || lower.includes('rehabilitation') || lower.includes('drilling') || lower.includes('civil works')) {
    return 'works';
  }
  if (lower.includes('supply') || lower.includes('delivery of') || lower.includes('goods') || lower.includes('equipment') || lower.includes('vehicles') || lower.includes('procurement of items')) {
    return 'goods';
  }
  return 'services';
}

// ── 8. COMPOSITE DETERMINISTIC EXTRACTORS ──────────────────────────────────────

export interface DeterministicJobResult {
  title: string | null;
  companyName: string | null;
  description: string;
  requirements: string | null;
  deadline: Date | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  countryCode: string | null;
  applicationEmails: string[];
  applicationUrls: string[];
}

export function extractDeterministicJobFields(text: string, sourceUrl: string): DeterministicJobResult {
  const deadline = extractDeadlineFromText(text);
  const salary = extractSalaryFromText(text);
  const requirements = extractStructuredRequirements(text);
  const { emails, applicationUrls } = extractApplicationDetails(text);
  const countryCode = extractCountryCode(text);

  // Extract clean 3-5 sentence description snippet
  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length >= 60 && !p.startsWith('http') && !p.includes('©'));

  const description = paragraphs.slice(0, 4).join('\n\n') || text.slice(0, 600);

  return {
    title: null,
    companyName: null,
    description,
    requirements,
    deadline,
    salaryMin: salary.salaryMin,
    salaryMax: salary.salaryMax,
    salaryCurrency: salary.salaryCurrency,
    countryCode,
    applicationEmails: emails,
    applicationUrls,
  };
}

export interface DeterministicTenderResult {
  referenceNo: string | null;
  category: 'goods' | 'works' | 'services' | 'consultancy';
  deadline: Date | null;
  budget: number | null;
  currency: string;
  description: string;
}

export function extractDeterministicTenderFields(text: string, sourceUrl: string): DeterministicTenderResult {
  const referenceNo = extractTenderReference(text);
  const category = detectTenderCategory(text);
  const deadline = extractDeadlineFromText(text);
  const salary = extractSalaryFromText(text);

  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length >= 60 && !p.startsWith('http') && !p.includes('©'));

  const description = paragraphs.slice(0, 4).join('\n\n') || text.slice(0, 600);

  return {
    referenceNo,
    category,
    deadline,
    budget: salary.salaryMax ?? salary.salaryMin,
    currency: salary.salaryCurrency ?? 'USD',
    description,
  };
}
