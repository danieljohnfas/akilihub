/**
 * SEO Schema builders for AkiliBrain.
 * Each function returns a plain JSON-LD object ready to pass to <JsonLd />.
 *
 * References:
 *  - https://schema.org/JobPosting
 *  - https://schema.org/GovernmentService
 *  - https://schema.org/Organization
 *  - https://schema.org/WebSite
 *  - https://schema.org/BreadcrumbList
 */

const BASE_URL = "https://akilibrain.com";
const SITE_NAME = "AkiliBrain";
const LOGO_URL = `${BASE_URL}/icon.svg`;

// ─── Organization ────────────────────────────────────────────────────────────

export function buildOrganizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: SITE_NAME,
    url: BASE_URL,
    logo: {
      "@type": "ImageObject",
      url: LOGO_URL,
      width: 512,
      height: 512,
    },
    description:
      "East Africa's professional intelligence platform for government tenders, jobs, compliance, health data, and salaries.",
    areaServed: ["KE", "TZ", "UG", "RW", "ET"],
    sameAs: [
      "https://twitter.com/akilibrain",
    ],
  };
}

// ─── WebSite (enables Sitelinks Searchbox in Google) ─────────────────────────

export function buildWebSiteSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    name: SITE_NAME,
    url: BASE_URL,
    description:
      "East Africa's most comprehensive professional intelligence platform.",
    publisher: {
      "@id": `${BASE_URL}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/jobs?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ─── BreadcrumbList ───────────────────────────────────────────────────────────

export function buildBreadcrumbSchema(
  items: { name: string; url: string }[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ─── JobPosting ───────────────────────────────────────────────────────────────

interface JobPostingInput {
  id: string;
  title: string;
  companyName: string;
  description: string | null;
  location: string | null;
  country: string | null;
  /** ISO 3166-1 alpha-2 country code, e.g. "KE", "TZ" */
  countryCode?: string | null;
  jobType: string | null;
  postedDate: Date | null;
  deadline: Date | null;
  sourceUrl: string;
  /** Optional: min salary in local currency (monthly) */
  salaryMin?: number | null;
  /** Optional: max salary in local currency (monthly) */
  salaryMax?: number | null;
  /** ISO 4217 currency code, e.g. "KES", "TZS" */
  salaryCurrency?: string | null;
}

/**
 * Country code → default postal code lookup.
 * East African countries don't have universal postcodes, so we use
 * well-known capital post-office codes as best-effort values.
 */
const COUNTRY_POSTAL_CODE: Record<string, string> = {
  KE: "00100", // Nairobi GPO
  TZ: "40435", // Dar es Salaam GPO
  UG: "256",   // Kampala (Uganda uses PO box system)
  RW: "0",     // Kigali (Rwanda has no formal postal codes)
  ET: "1000",  // Addis Ababa GPO
};

export function buildJobPostingSchema(job: JobPostingInput): Record<string, unknown> {
  const employmentTypeMap: Record<string, string> = {
    full_time: "FULL_TIME",
    part_time: "PART_TIME",
    contract: "CONTRACTOR",
    internship: "INTERN",
    remote: "OTHER",
  };

  // addressLocality is the city/town; addressRegion is the state/province.
  // Since our jobs store a free-text `location` (usually a city), we reuse it
  // for both locality and region — it's better than leaving them empty.
  const addressLocality = job.location ?? job.country ?? "East Africa";
  const addressRegion = job.location ?? job.country ?? "East Africa";
  const addressCountry = job.countryCode ?? job.country ?? "KE";
  const postalCode = COUNTRY_POSTAL_CODE[addressCountry] ?? "00100";

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "@id": `${BASE_URL}/jobs/${job.id}`,
    title: job.title,
    description: (job.description && job.description !== 'null' && job.description.trim() !== '') 
      ? job.description 
      : `${job.title} at ${job.companyName}`,
    hiringOrganization: {
      "@type": "Organization",
      name: job.companyName,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        // streetAddress: city name is the best approximation we have
        streetAddress: addressLocality,
        addressLocality,
        addressRegion,
        postalCode,
        addressCountry,
      },
    },
    employmentType: employmentTypeMap[job.jobType ?? "full_time"] ?? "OTHER",
    url: `${BASE_URL}/jobs/${job.id}`,
    identifier: {
      "@type": "PropertyValue",
      name: SITE_NAME,
      value: job.id,
    },
  };

  // datePosted is required by Google; fall back to today if missing
  schema.datePosted = job.postedDate
    ? job.postedDate.toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  // validThrough: use deadline if available, otherwise default to 90 days
  // from the posted date (or today) so Google doesn't flag it as missing
  if (job.deadline) {
    schema.validThrough = job.deadline.toISOString();
  } else {
    const base = job.postedDate ?? new Date();
    const fallback = new Date(base);
    fallback.setDate(fallback.getDate() + 90);
    schema.validThrough = fallback.toISOString();
  }

  // baseSalary: only emit when actual salary data is present
  if (job.salaryMin && job.salaryCurrency) {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salaryCurrency,
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salaryMin,
        ...(job.salaryMax ? { maxValue: job.salaryMax } : {}),
        unitText: "MONTH",
      },
    };
  }

  return schema;
}

// ─── GovernmentService (tender) ───────────────────────────────────────────────

interface TenderInput {
  id: string;
  title: string;
  description: string | null;
  contractingAuthority: string;
  country: string | null;
  sector: string | null;
  status: string;
  deadline: Date;
  publishedAt: Date | null;
  budget: string | null;
  currency: string | null;
}

export function buildTenderSchema(tender: TenderInput): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "GovernmentService",
    "@id": `${BASE_URL}/tenders/${tender.id}`,
    name: tender.title,
    description:
      tender.description ??
      `Government tender by ${tender.contractingAuthority} in ${tender.country ?? "East Africa"}.`,
    provider: {
      "@type": "GovernmentOrganization",
      name: tender.contractingAuthority,
      areaServed: tender.country ?? "East Africa",
    },
    areaServed: tender.country ?? "East Africa",
    serviceType: tender.sector ?? "Government Procurement",
    url: `${BASE_URL}/tenders/${tender.id}`,
  };

  if (tender.budget && tender.currency) {
    schema.offers = {
      "@type": "Offer",
      price: tender.budget,
      priceCurrency: tender.currency,
    };
  }

  return schema;
}

// ─── Organization (compliance business) ──────────────────────────────────────

interface BusinessInput {
  id: string;
  name: string;
  registrationNumber: string;
  country: string | null;
  type: string | null;
  status: string;
  registrationDate: Date | null;
  address: string | null;
}

export function buildBusinessSchema(business: BusinessInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/compliance/${business.id}`,
    name: business.name,
    identifier: business.registrationNumber,
    description: `${business.type ?? "Registered business"} registered in ${business.country ?? "East Africa"}. Status: ${business.status}.`,
    url: `${BASE_URL}/compliance/${business.id}`,
    ...(business.address ? { address: business.address } : {}),
    ...(business.registrationDate
      ? { foundingDate: business.registrationDate.toISOString().split("T")[0] }
      : {}),
    areaServed: business.country ?? "East Africa",
  };
}

// ─── ItemList (for listing pages — jobs/tenders) ─────────────────────────────

export interface ItemListEntry {
  name: string;
  description?: string;
  url: string;
  position: number;
}

export function buildItemListSchema(
  name: string,
  description: string,
  items: ItemListEntry[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description,
    numberOfItems: items.length,
    itemListElement: items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      name: item.name,
      description: item.description,
      url: item.url,
    })),
  };
}

// ─── FAQPage ──────────────────────────────────────────────────────────────────

export interface FAQEntry {
  question: string;
  answer: string;
}

export function buildFAQSchema(faqs: FAQEntry[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

// ─── Dataset (for health data page) ──────────────────────────────────────────

export function buildDatasetSchema(opts: {
  name: string;
  description: string;
  url: string;
  keywords: string[];
  creator: string;
  dateModified?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    keywords: opts.keywords,
    creator: {
      "@type": "Organization",
      name: opts.creator,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: BASE_URL,
    },
    license: "https://creativecommons.org/licenses/by/4.0/",
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    spatialCoverage: {
      "@type": "Place",
      name: "East Africa",
      geo: {
        "@type": "GeoShape",
        name: "East Africa",
        description: "Kenya, Tanzania, Uganda, Rwanda, Ethiopia",
      },
    },
  };
}

// ─── Salary Listing (uses JobPosting with baseSalary for rich snippets) ───────

export interface SalaryEntry {
  jobTitle: string;
  country: string | null;
  currency: string;
  grossMonthlySalary: number;
  experienceLevel: string;
}

/**
 * Builds an ItemList of JobPosting schemas, each with baseSalary.
 * Google surfaces baseSalary data directly in job-related search snippets.
 */
export function buildSalaryListSchema(salaries: SalaryEntry[]): Record<string, unknown> {
  const experienceLabelMap: Record<string, string> = {
    entry: 'Entry Level',
    mid: 'Mid Level',
    senior: 'Senior Level',
    executive: 'Executive',
  };

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Salary Data — East Africa",
    description:
      "Crowdsourced compensation benchmarks for professional roles across Kenya, Tanzania, Uganda, and Rwanda.",
    numberOfItems: salaries.length,
    itemListElement: salaries.map((s, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "JobPosting",
        title: s.jobTitle,
        description: `${experienceLabelMap[s.experienceLevel] ?? s.experienceLevel} salary for ${s.jobTitle} in ${s.country ?? "East Africa"}.`,
        hiringOrganization: {
          "@type": "Organization",
          name: SITE_NAME,
          sameAs: BASE_URL,
        },
        jobLocation: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressCountry: s.country ?? "East Africa",
          },
        },
        baseSalary: {
          "@type": "MonetaryAmount",
          currency: s.currency,
          value: {
            "@type": "QuantitativeValue",
            value: s.grossMonthlySalary,
            unitText: "MONTH",
          },
        },
        url: `${BASE_URL}/salaries`,
      },
    })),
  };
}
