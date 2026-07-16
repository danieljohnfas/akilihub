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
  jobType: string | null;
  postedDate: Date | null;
  deadline: Date | null;
  sourceUrl: string;
}

export function buildJobPostingSchema(job: JobPostingInput): Record<string, unknown> {
  const employmentTypeMap: Record<string, string> = {
    full_time: "FULL_TIME",
    part_time: "PART_TIME",
    contract: "CONTRACTOR",
    internship: "INTERN",
    remote: "OTHER",
  };

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "@id": `${BASE_URL}/jobs/${job.id}`,
    title: job.title,
    description: job.description ?? `${job.title} at ${job.companyName}`,
    hiringOrganization: {
      "@type": "Organization",
      name: job.companyName,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location ?? job.country ?? "East Africa",
        addressCountry: job.country ?? "KE",
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

  if (job.postedDate) schema.datePosted = job.postedDate.toISOString().split("T")[0];
  if (job.deadline) schema.validThrough = job.deadline.toISOString();

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
