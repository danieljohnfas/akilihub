/**
 * Source Provenance Classifier
 *
 * Classifies URLs into verifiable provenance tiers to give users immediate clarity on whether
 * an opportunity/statutory document originates directly from an official government authority,
 * enterprise ATS platform, direct employer, verified agency, or an aggregator directory.
 */

export type SourceProvenanceType =
  | 'official_gov'
  | 'direct_employer'
  | 'ats'
  | 'recruitment_agency'
  | 'advisory'
  | 'aggregator';

export interface SourceProvenance {
  type: SourceProvenanceType;
  label: string;
  badgeLabel: string;
  badgeClassName: string;
  actionText: string;
  isOfficial: boolean;
  domain: string;
}

const ATS_DOMAINS = [
  'lever.co',
  'greenhouse.io',
  'workable.com',
  'bamboohr.com',
  'smartrecruiters.com',
  'myworkdayjobs.com',
  'workday.com',
  'taleo.net',
  'successfactors.com',
  'recruitee.com',
  'teamtailor.com',
  'pinpointhq.com',
  'freshteam.com',
  'zohorecruit.com',
  'icims.com',
  'jobvite.com',
  'breezy.hr',
];

const KNOWN_AGENCIES = [
  'summitrecruitment-search.com',
  'corporatestaffing.co.ke',
  'caglobalint.com',
  'flexi-personnel.com',
  'adeptrecruitment.co.ke',
  'hallmarkrecruitment.com',
  'crystalrecruit.com',
  'careeroptionsafrica.com',
];

const KNOWN_ADVISORIES = [
  'mondaq.com',
  'skuad.io',
  'nileedge.com',
  'cosmoslegal.com.tr',
  'mercans.com',
  'dlapiper.com',
  'bowmanslaw.com',
  'dentons.com',
  'cliffedekkerhofmeyr.com',
];

const KNOWN_AGGREGATORS = [
  'myjobmag',
  'ngojobsinafrica',
  'africareers',
  'alljobspo',
  'geezjobs',
  'ethiopianreporterjobs',
  'jobwebrwanda',
  'jobwebkenya',
  'jobinrwanda',
  'ethio-jobs',
  'ethiongojobs',
  'ajiriwa',
  'ajirayako',
  'zoomtanzania',
  'macalindoon',
  'kazibure',
  'tenderimpulse',
  'globaltenders',
  'biddetail',
  'tenderskenya',
  'brightermonday',
  'fuzu',
  'reliefweb',
  'unjobs',
  'glassdoor',
  'indeed',
  'wa.me',
  'iubenda',
];

export function getSourceProvenance(
  url: string | null | undefined,
  contextType: 'job' | 'tender' | 'compliance' = 'job'
): SourceProvenance {
  if (!url || typeof url !== 'string') {
    return {
      type: 'aggregator',
      label: 'Source Portal',
      badgeLabel: 'Source Directory',
      badgeClassName: 'bg-white/10 text-white/70 border-white/20',
      actionText: contextType === 'compliance' ? 'Access Document' : contextType === 'tender' ? 'View Details' : 'Apply for Role',
      isOfficial: false,
      domain: '',
    };
  }

  let domain = '';
  try {
    const parsed = new URL(url);
    domain = parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    domain = url.toLowerCase();
  }

  // 1. Official Government & Statutory Authority Check
  const isGovDomain =
    domain.includes('.go.ke') ||
    domain.includes('.go.ug') ||
    domain.includes('.go.tz') ||
    domain.includes('.gov.rw') ||
    domain.includes('.gov.et') ||
    domain.includes('.gov.so') ||
    domain.includes('.gov.bi') ||
    domain.includes('.gouv.cd') ||
    domain.includes('kenyalaw.org') ||
    domain.includes('kra.go.ke') ||
    domain.includes('rra.gov.rw') ||
    domain.includes('ura.go.ug') ||
    domain.includes('tra.go.tz') ||
    domain.includes('brs.go.ke') ||
    domain.includes('brela.go.tz') ||
    domain.includes('ursb.go.ug') ||
    domain.includes('nssf.or.ke') ||
    domain.includes('nhif.or.ke') ||
    domain.includes('lmis.rw');

  if (isGovDomain) {
    return {
      type: 'official_gov',
      label: 'Official Government / Statutory Authority',
      badgeLabel: '🏛️ Official Authority',
      badgeClassName: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-medium',
      actionText: contextType === 'tender' ? 'View on Official e-GP Portal' : contextType === 'compliance' ? 'Access Official Tool' : 'Apply on Official System',
      isOfficial: true,
      domain,
    };
  }

  // 2. Direct ATS Platform Check
  const isAts = ATS_DOMAINS.some(ats => domain === ats || domain.endsWith('.' + ats));
  if (isAts) {
    return {
      type: 'ats',
      label: 'Direct Employer ATS',
      badgeLabel: '⚡ Direct ATS',
      badgeClassName: 'bg-blue-500/15 text-blue-300 border-blue-500/30 font-medium',
      actionText: 'Apply on Direct ATS',
      isOfficial: true,
      domain,
    };
  }

  // 3. Verified Recruitment Agency Check
  const isAgency = KNOWN_AGENCIES.some(agency => domain === agency || domain.endsWith('.' + agency));
  if (isAgency) {
    return {
      type: 'recruitment_agency',
      label: 'Verified Recruitment Agency',
      badgeLabel: '📋 Verified Agency',
      badgeClassName: 'bg-purple-500/15 text-purple-300 border-purple-500/30 font-medium',
      actionText: 'Apply via Agency',
      isOfficial: false,
      domain,
    };
  }

  // 4. Legal / HR Advisory (for Compliance)
  const isAdvisory = KNOWN_ADVISORIES.some(adv => domain === adv || domain.endsWith('.' + adv));
  if (isAdvisory || contextType === 'compliance') {
    if (isAdvisory) {
      return {
        type: 'advisory',
        label: 'Legal & Compliance Advisory',
        badgeLabel: '📘 Legal Advisory',
        badgeClassName: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 font-medium',
        actionText: 'View Legal Analysis',
        isOfficial: false,
        domain,
      };
    }
  }

  // 5. Aggregator Check
  const isAggregator = KNOWN_AGGREGATORS.some(agg => domain.includes(agg));
  if (isAggregator) {
    return {
      type: 'aggregator',
      label: 'Secondary Source / Aggregator',
      badgeLabel: '🔗 Source Directory',
      badgeClassName: 'bg-amber-500/10 text-amber-300/80 border-amber-500/20',
      actionText: contextType === 'tender' ? 'View Tender Source' : contextType === 'compliance' ? 'Access Resource' : 'View Source Listing',
      isOfficial: false,
      domain,
    };
  }

  // 6. Direct Company / Organisation Portal (Default for valid custom domains)
  return {
    type: 'direct_employer',
    label: 'Direct Organisation Portal',
    badgeLabel: '🏢 Direct Portal',
    badgeClassName: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 font-medium',
    actionText: contextType === 'tender' ? 'View on Authority Portal' : contextType === 'compliance' ? 'Access Authority Portal' : 'Apply on Employer Site',
    isOfficial: true,
    domain,
  };
}
