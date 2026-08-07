/**
 * AGGREGATOR REGISTRY
 *
 * This is AkiliBrain's canonical registry of known third-party aggregators,
 * job boards, tender boards, and ATS (Applicant Tracking System) platforms.
 *
 * RULES:
 *  - 'aggregator' type: scraper uses these for discovery only. Links are NEVER
 *    shown to users. The resolver extracts the true employer URL from these pages.
 *  - 'ats_platform' type: these ARE the employer's own hiring system
 *    (SmartRecruiters, Workday, Taleo, Greenhouse, etc.). Treat these as the
 *    canonical employer URL — do not try to resolve further.
 *  - 'government_portal' type: official government portals. Treat as employer URL.
 *
 * EXTENDING THIS LIST:
 *  Add new entries whenever a new aggregator domain is discovered in scraping logs.
 *  Keep domains lowercase. Do not include trailing slashes.
 */

export type SourceType = 'aggregator' | 'ats_platform' | 'government_portal';
export type SourceCategory = 'jobs' | 'tenders' | 'compliance' | 'all';

export interface KnownSource {
  domain: string;
  name: string;
  type: SourceType;
  category: SourceCategory;
}

export const KNOWN_SOURCES: KnownSource[] = [

  // ─── GENERAL JOB AGGREGATORS — EAST AFRICA ───────────────────────────────────

  { domain: 'myjobmag.co.ke',            name: 'MyJobMag Kenya',           type: 'aggregator', category: 'jobs' },
  { domain: 'myjobmag.com',              name: 'MyJobMag',                 type: 'aggregator', category: 'jobs' },
  { domain: 'myjobmag.co.tz',            name: 'MyJobMag Tanzania',        type: 'aggregator', category: 'jobs' },
  { domain: 'myjobmag.co.ug',            name: 'MyJobMag Uganda',          type: 'aggregator', category: 'jobs' },
  { domain: 'myjobmag.co.rw',            name: 'MyJobMag Rwanda',          type: 'aggregator', category: 'jobs' },
  { domain: 'greattanzaniajobs.com',     name: 'Great Tanzania Jobs',      type: 'aggregator', category: 'jobs' },
  { domain: 'greatkenyanjobs.com',       name: 'Great Kenyan Jobs',        type: 'aggregator', category: 'jobs' },
  { domain: 'greatugandajobs.com',       name: 'Great Uganda Jobs',        type: 'aggregator', category: 'jobs' },
  { domain: 'greatethiopianjobs.com',    name: 'Great Ethiopian Jobs',     type: 'aggregator', category: 'jobs' },
  { domain: 'greatrwandajobs.com',       name: 'Great Rwanda Jobs',        type: 'aggregator', category: 'jobs' },
  { domain: 'greatdrcjobs.com',          name: 'Great DRC Jobs',           type: 'aggregator', category: 'jobs' },
  { domain: 'brightermonday.co.ke',      name: 'BrighterMonday Kenya',     type: 'aggregator', category: 'jobs' },
  { domain: 'brightermonday.co.ug',      name: 'BrighterMonday Uganda',    type: 'aggregator', category: 'jobs' },
  { domain: 'brightermonday.co.tz',      name: 'BrighterMonday Tanzania',  type: 'aggregator', category: 'jobs' },
  { domain: 'brightermonday.com',        name: 'BrighterMonday',           type: 'aggregator', category: 'jobs' },
  { domain: 'jobwebkenya.com',           name: 'JobWeb Kenya',             type: 'aggregator', category: 'jobs' },
  { domain: 'jobwebuganda.com',          name: 'JobWeb Uganda',            type: 'aggregator', category: 'jobs' },
  { domain: 'jobwebtanzania.com',        name: 'JobWeb Tanzania',          type: 'aggregator', category: 'jobs' },
  { domain: 'careerjet.co.ke',           name: 'CareerJet Kenya',          type: 'aggregator', category: 'jobs' },
  { domain: 'careerjet.co.tz',           name: 'CareerJet Tanzania',       type: 'aggregator', category: 'jobs' },
  { domain: 'careerjet.co.ug',           name: 'CareerJet Uganda',         type: 'aggregator', category: 'jobs' },
  { domain: 'careerjet.com',             name: 'CareerJet',                type: 'aggregator', category: 'jobs' },
  { domain: 'kuzeajobs.com',             name: 'Kuzea Jobs',               type: 'aggregator', category: 'jobs' },
  { domain: 'fuzu.com',                  name: 'Fuzu',                     type: 'aggregator', category: 'jobs' },
  { domain: 'findajob.go.ke',            name: 'Find a Job Kenya (Gov)',   type: 'aggregator', category: 'jobs' },
  { domain: 'ngojobboard.com',           name: 'NGO Job Board',            type: 'aggregator', category: 'jobs' },
  { domain: 'ngojobs.africa',            name: 'NGO Jobs Africa',          type: 'aggregator', category: 'jobs' },
  { domain: 'devjobsafrica.org',         name: 'Dev Jobs Africa',          type: 'aggregator', category: 'jobs' },
  { domain: 'joblistkenya.com',          name: 'JobList Kenya',            type: 'aggregator', category: 'jobs' },
  { domain: 'kenyajobsearch.net',        name: 'Kenya Job Search',         type: 'aggregator', category: 'jobs' },
  { domain: 'jobsinthemiddle.com',       name: 'Jobs in the Middle',       type: 'aggregator', category: 'jobs' },
  { domain: 'ajira.go.tz',              name: 'Ajira Tanzania',           type: 'aggregator', category: 'jobs' },
  { domain: 'jobs.co.ke',               name: 'Jobs.co.ke',               type: 'aggregator', category: 'jobs' },
  { domain: 'jobs.co.tz',               name: 'Jobs.co.tz',               type: 'aggregator', category: 'jobs' },
  { domain: 'jobs.co.ug',               name: 'Jobs.co.ug',               type: 'aggregator', category: 'jobs' },
  { domain: 'tanzaniajobs.co.tz',        name: 'Tanzania Jobs',            type: 'aggregator', category: 'jobs' },
  { domain: 'ugandajobline.com',         name: 'Uganda Job Line',          type: 'aggregator', category: 'jobs' },
  { domain: 'ethiopianjobs.com',         name: 'Ethiopian Jobs',           type: 'aggregator', category: 'jobs' },
  { domain: 'jobsethiopia.com',          name: 'Jobs Ethiopia',            type: 'aggregator', category: 'jobs' },
  { domain: 'ethiojobs.net',             name: 'Ethio Jobs',               type: 'aggregator', category: 'jobs' },
  { domain: 'jobsafrica.com',            name: 'Jobs Africa',              type: 'aggregator', category: 'jobs' },
  { domain: 'jobsinkenya.co.ke',         name: 'Jobs in Kenya',            type: 'aggregator', category: 'jobs' },
  { domain: 'jobsinnairobi.net',         name: 'Jobs in Nairobi',          type: 'aggregator', category: 'jobs' },
  { domain: 'eastafricajobs.net',        name: 'East Africa Jobs',         type: 'aggregator', category: 'jobs' },
  { domain: 'africajobs.com',            name: 'Africa Jobs',              type: 'aggregator', category: 'jobs' },
  { domain: 'jobscongo.net',             name: 'Jobs Congo (DRC)',         type: 'aggregator', category: 'jobs' },
  { domain: 'emploiburundi.com',         name: 'Emploi Burundi',           type: 'aggregator', category: 'jobs' },
  { domain: 'somaliawork.com',           name: 'Somalia Work',             type: 'aggregator', category: 'jobs' },
  { domain: 'southsudanjobs.net',        name: 'South Sudan Jobs',         type: 'aggregator', category: 'jobs' },

  // ─── PROFESSIONAL BODY JOB PORTALS ───────────────────────────────────────────

  { domain: 'jobs.accaglobal.com',       name: 'ACCA Global Jobs',         type: 'aggregator', category: 'jobs' },
  { domain: 'careers.icpak.com',         name: 'ICPAK Careers',            type: 'aggregator', category: 'jobs' },
  { domain: 'cpa.or.ke',                 name: 'CPA Kenya',                type: 'aggregator', category: 'jobs' },
  { domain: 'engineersboard.go.ke',      name: 'EBK Kenya',                type: 'aggregator', category: 'jobs' },

  // ─── INTERNATIONAL NGO / AID / DEVELOPMENT SECTOR ────────────────────────────

  { domain: 'impactpool.org',            name: 'ImpactPool',               type: 'aggregator', category: 'jobs' },
  { domain: 'reliefweb.int',             name: 'ReliefWeb',                type: 'aggregator', category: 'all' },
  { domain: 'devex.com',                 name: 'Devex',                    type: 'aggregator', category: 'all' },
  { domain: 'unjobs.org',                name: 'UN Jobs',                  type: 'aggregator', category: 'jobs' },
  { domain: 'idealist.org',              name: 'Idealist',                 type: 'aggregator', category: 'jobs' },
  { domain: 'opportunity-desk.org',      name: 'Opportunity Desk',         type: 'aggregator', category: 'jobs' },
  { domain: 'internationaljobs.org',     name: 'International Jobs',       type: 'aggregator', category: 'jobs' },
  { domain: 'ngosource.org',             name: 'NGO Source',               type: 'aggregator', category: 'jobs' },
  { domain: 'humanitarianresponse.info', name: 'OCHA HumanitarianResponse',type: 'aggregator', category: 'jobs' },
  { domain: 'jobnetafrica.com',          name: 'JobNet Africa',            type: 'aggregator', category: 'jobs' },
  { domain: 'afdb.org',                  name: 'African Development Bank', type: 'aggregator', category: 'jobs' },
  { domain: 'worldbank.org/en/about/careers', name: 'World Bank Careers',  type: 'aggregator', category: 'jobs' },

  // ─── GLOBAL JOB BOARDS (low-quality for EA context, blocked in search) ───────

  { domain: 'linkedin.com',              name: 'LinkedIn',                 type: 'aggregator', category: 'jobs' },
  { domain: 'glassdoor.com',             name: 'Glassdoor',                type: 'aggregator', category: 'jobs' },
  { domain: 'indeed.com',                name: 'Indeed',                   type: 'aggregator', category: 'jobs' },
  { domain: 'monster.com',               name: 'Monster',                  type: 'aggregator', category: 'jobs' },
  { domain: 'ziprecruiter.com',          name: 'ZipRecruiter',             type: 'aggregator', category: 'jobs' },
  { domain: 'simplyhired.com',           name: 'SimplyHired',              type: 'aggregator', category: 'jobs' },
  { domain: 'rozee.pk',                  name: 'Rozee.pk',                 type: 'aggregator', category: 'jobs' },
  { domain: 'jooble.org',                name: 'Jooble',                   type: 'aggregator', category: 'jobs' },
  { domain: 'careerbuilder.com',         name: 'CareerBuilder',            type: 'aggregator', category: 'jobs' },
  { domain: 'snagajob.com',              name: 'Snagajob',                 type: 'aggregator', category: 'jobs' },

  // ─── REGIONAL & RECENTLY AUDITED JOB AGGREGATORS ──────────────────────────────
  { domain: 'ngojobsinafrica.com',       name: 'NGO Jobs in Africa',       type: 'aggregator', category: 'jobs' },
  { domain: 'myjobmagghana.com',         name: 'MyJobMag Ghana',           type: 'aggregator', category: 'jobs' },
  { domain: 'africareers.net',           name: 'AfriCareers',              type: 'aggregator', category: 'jobs' },
  { domain: 'alljobspo.com',             name: 'AllJobsPo',                type: 'aggregator', category: 'jobs' },
  { domain: 'geezjobs.com',              name: 'GeezJobs Ethiopia',        type: 'aggregator', category: 'jobs' },
  { domain: 'ethiopianreporterjobs.com', name: 'Ethiopian Reporter Jobs',  type: 'aggregator', category: 'jobs' },
  { domain: 'jobwebrwanda.com',          name: 'JobWeb Rwanda',            type: 'aggregator', category: 'jobs' },
  { domain: 'jobinrwanda.com',           name: 'Job in Rwanda',            type: 'aggregator', category: 'jobs' },
  { domain: 'jobinuganda.com',           name: 'Job in Uganda',            type: 'aggregator', category: 'jobs' },
  { domain: 'jobintanzania.com',         name: 'Job in Tanzania',          type: 'aggregator', category: 'jobs' },
  { domain: 'jobinkenya.com',            name: 'Job in Kenya',             type: 'aggregator', category: 'jobs' },
  { domain: 'jobinburundi.com',          name: 'Job in Burundi',           type: 'aggregator', category: 'jobs' },
  { domain: 'jobincamer.com',            name: 'Job in Cameroon',          type: 'aggregator', category: 'jobs' },
  { domain: 'jobenrdc.com',              name: 'Job en RDC',               type: 'aggregator', category: 'jobs' },
  { domain: 'ethio-jobs.net.et',         name: 'Ethio-Jobs.net.et',        type: 'aggregator', category: 'jobs' },
  { domain: 'ethiongojobs.com',          name: 'Ethio NGO Jobs',           type: 'aggregator', category: 'jobs' },
  { domain: 'ajiriwa.net',               name: 'Ajiriwa Tanzania',         type: 'aggregator', category: 'jobs' },
  { domain: 'zoomtanzania.net',          name: 'Zoom Tanzania',            type: 'aggregator', category: 'jobs' },
  { domain: 'macalindoon.online',        name: 'Macalindoon Somalia',      type: 'aggregator', category: 'jobs' },
  { domain: 'kazibure.com',              name: 'KaziBure',                 type: 'aggregator', category: 'jobs' },
  { domain: 'shortlist.net',             name: 'Shortlist',                type: 'aggregator', category: 'jobs' },
  { domain: 'cvmkr.com',                 name: 'CV Maker',                 type: 'aggregator', category: 'jobs' },
  { domain: 'unjobs.media',              name: 'UNJobs Media',             type: 'aggregator', category: 'jobs' },
  { domain: 'houseinrwanda.com',         name: 'House in Rwanda',          type: 'aggregator', category: 'jobs' },
  { domain: 'hrms.rw',                   name: 'HRMS Rwanda',              type: 'aggregator', category: 'jobs' },
  { domain: 'jobalertuganda.com',        name: 'Job Alert Uganda',         type: 'aggregator', category: 'jobs' },
  { domain: 'unjobnet.org',              name: 'UN Job Net',               type: 'aggregator', category: 'jobs' },
  { domain: 'edomatch.com',              name: 'EdoMatch',                 type: 'aggregator', category: 'jobs' },
  { domain: 'sewaseweth.com',            name: 'Sewasew Jobs',             type: 'aggregator', category: 'jobs' },
  { domain: 'hahu.jobs',                 name: 'HaHu Jobs',                type: 'aggregator', category: 'jobs' },
  { domain: 'developmentaid.org',        name: 'DevelopmentAid',           type: 'aggregator', category: 'jobs' },
  { domain: 'advance-africa.com',        name: 'Advance Africa',           type: 'aggregator', category: 'jobs' },
  { domain: 'codingkenya.com',           name: 'Coding Kenya',             type: 'aggregator', category: 'jobs' },
  { domain: 'lafabsolution.com',         name: 'Lafab Solution',           type: 'aggregator', category: 'jobs' },
  { domain: 'tanzajob.com',              name: 'TanzaJob',                 type: 'aggregator', category: 'jobs' },
  { domain: 'pachodo.org',               name: 'Pachodo',                  type: 'aggregator', category: 'jobs' },
  { domain: 'sudanjob.net',              name: 'Sudan Job',                type: 'aggregator', category: 'jobs' },
  { domain: 'caglobalint.com',           name: 'CA Global International',  type: 'aggregator', category: 'jobs' },
  { domain: 'dailyremote.com',           name: 'Daily Remote',             type: 'aggregator', category: 'jobs' },
  { domain: 'untalent.org',              name: 'UNTalent',                 type: 'aggregator', category: 'jobs' },
  { domain: 'cmd.cd',                    name: 'CMD DRC',                  type: 'aggregator', category: 'jobs' },
  { domain: 'mysalaryscale.com',         name: 'MySalaryScale',            type: 'aggregator', category: 'jobs' },
  { domain: 'base44.app',                name: 'Base44 App',               type: 'aggregator', category: 'jobs' },
  { domain: 'apexaccountingschool.com',  name: 'Apex Accounting School',   type: 'aggregator', category: 'jobs' },

  // ─── TENDER / PROCUREMENT AGGREGATORS ────────────────────────────────────────

  { domain: 'tenderimpulse.com',         name: 'Tender Impulse',           type: 'aggregator', category: 'tenders' },
  { domain: 'globaltenders.com',         name: 'Global Tenders',           type: 'aggregator', category: 'tenders' },
  { domain: 'biddetail.com',             name: 'Bid Detail',               type: 'aggregator', category: 'tenders' },
  { domain: 'tenderskenya.com',          name: 'Tenders Kenya',            type: 'aggregator', category: 'tenders' },
  { domain: 'tenders.go.ke',             name: 'Tenders.go.ke',            type: 'aggregator', category: 'tenders' },
  { domain: 'tendersuganda.com',         name: 'Tenders Uganda',           type: 'aggregator', category: 'tenders' },
  { domain: 'tenderinfo.ug',             name: 'Tender Info Uganda',       type: 'aggregator', category: 'tenders' },
  { domain: 'ethiotender.com',           name: 'Ethio Tender',             type: 'aggregator', category: 'tenders' },
  { domain: 'tendersonline.tz',          name: 'Tenders Online Tanzania',  type: 'aggregator', category: 'tenders' },
  { domain: 'tenderboard.africa',        name: 'Tender Board Africa',      type: 'aggregator', category: 'tenders' },
  { domain: 'procurementkenya.com',      name: 'Procurement Kenya',        type: 'aggregator', category: 'tenders' },
  { domain: 'africatenders.net',         name: 'Africa Tenders',           type: 'aggregator', category: 'tenders' },
  { domain: 'kenyatenders.co.ke',        name: 'Kenya Tenders',            type: 'aggregator', category: 'tenders' },
  { domain: 'mgawasmali.tz',             name: 'Mgawa Smali Tanzania',     type: 'aggregator', category: 'tenders' },
  { domain: 'publicprocurement.go.tz',   name: 'PPRA Tanzania Portal',     type: 'aggregator', category: 'tenders' },
  { domain: 'dgmarket.com',              name: 'DG Market',                type: 'aggregator', category: 'tenders' },
  { domain: 'ted.europa.eu',             name: 'TED (EU Tenders)',         type: 'aggregator', category: 'tenders' },
  { domain: 'ungm.org',                  name: 'UN Global Marketplace',    type: 'aggregator', category: 'tenders' },
  { domain: 'devbusiness.com',           name: 'Development Business',     type: 'aggregator', category: 'tenders' },
  { domain: 'tendersontime.com',         name: 'Tenders On Time',          type: 'aggregator', category: 'tenders' },
  { domain: 'eastafricatenders.com',     name: 'East Africa Tenders',      type: 'aggregator', category: 'tenders' },
  { domain: 'bidease.com',               name: 'BidEase',                  type: 'aggregator', category: 'tenders' },
  { domain: 'globaltendering.com',       name: 'Global Tendering',         type: 'aggregator', category: 'tenders' },

  // ─── SOCIAL SHARING, CMS & COOKIE TOOLS (NEVER EMPLOYERS) ─────────────────────

  { domain: 'wa.me',                     name: 'WhatsApp Share',           type: 'aggregator', category: 'all' },
  { domain: 'whatsapp.com',              name: 'WhatsApp',                 type: 'aggregator', category: 'all' },
  { domain: 'api.whatsapp.com',          name: 'WhatsApp API',             type: 'aggregator', category: 'all' },
  { domain: 'iubenda.com',               name: 'Iubenda Policy',           type: 'aggregator', category: 'all' },
  { domain: 'cookiebot.com',             name: 'Cookiebot',                type: 'aggregator', category: 'all' },
  { domain: 'wordpress.org',             name: 'WordPress.org',            type: 'aggregator', category: 'all' },
  { domain: 'wix.com',                   name: 'Wix',                      type: 'aggregator', category: 'all' },
  { domain: 'wixstudio.com',             name: 'Wix Studio',               type: 'aggregator', category: 'all' },
  { domain: 'facebook.com',              name: 'Facebook',                 type: 'aggregator', category: 'all' },
  { domain: 'instagram.com',             name: 'Instagram',                type: 'aggregator', category: 'all' },
  { domain: 'twitter.com',               name: 'Twitter',                  type: 'aggregator', category: 'all' },
  { domain: 'x.com',                     name: 'X',                        type: 'aggregator', category: 'all' },
  { domain: 'youtube.com',               name: 'YouTube',                  type: 'aggregator', category: 'all' },
  { domain: 'youtu.be',                  name: 'YouTube Short',            type: 'aggregator', category: 'all' },
  { domain: 'tiktok.com',                name: 'TikTok',                   type: 'aggregator', category: 'all' },
  { domain: 't.me',                      name: 'Telegram',                 type: 'aggregator', category: 'all' },
  { domain: 'telegram.org',              name: 'Telegram',                 type: 'aggregator', category: 'all' },

  // ─── COMPLIANCE / REGULATORY AGGREGATORS ─────────────────────────────────────

  { domain: 'complianceafrica.com',      name: 'Compliance Africa',        type: 'aggregator', category: 'compliance' },
  { domain: 'africalegalnetwork.com',    name: 'Africa Legal Network',     type: 'aggregator', category: 'compliance' },
  { domain: 'lexafrica.com',             name: 'Lex Africa',               type: 'aggregator', category: 'compliance' },

  // ─── ATS PLATFORMS (= EMPLOYER'S OWN HIRING SYSTEM — treated as employer URLs) ─

  { domain: 'talentclue.com',            name: 'TalentClue ATS',           type: 'ats_platform', category: 'jobs' },
  { domain: 'smartrecruiters.com',       name: 'SmartRecruiters ATS',      type: 'ats_platform', category: 'jobs' },
  { domain: 'myworkdayjobs.com',         name: 'Workday Jobs',             type: 'ats_platform', category: 'jobs' },
  { domain: 'myworkdaysite.com',         name: 'Workday Site',             type: 'ats_platform', category: 'jobs' },
  { domain: 'workday.com',               name: 'Workday',                  type: 'ats_platform', category: 'jobs' },
  { domain: 'taleo.net',                 name: 'Oracle Taleo',             type: 'ats_platform', category: 'jobs' },
  { domain: 'greenhouse.io',             name: 'Greenhouse ATS',           type: 'ats_platform', category: 'jobs' },
  { domain: 'lever.co',                  name: 'Lever ATS',                type: 'ats_platform', category: 'jobs' },
  { domain: 'bamboohr.com',              name: 'BambooHR',                 type: 'ats_platform', category: 'jobs' },
  { domain: 'successfactors.com',        name: 'SAP SuccessFactors',       type: 'ats_platform', category: 'jobs' },
  { domain: 'successfactors.eu',         name: 'SAP SuccessFactors EU',    type: 'ats_platform', category: 'jobs' },
  { domain: 'sap.com',                   name: 'SAP',                      type: 'ats_platform', category: 'jobs' },
  { domain: 'workable.com',              name: 'Workable ATS',             type: 'ats_platform', category: 'jobs' },
  { domain: 'ashbyhq.com',               name: 'Ashby ATS',                type: 'ats_platform', category: 'jobs' },
  { domain: 'jobylon.com',               name: 'Jobylon ATS',              type: 'ats_platform', category: 'jobs' },
  { domain: 'personio.com',              name: 'Personio ATS',             type: 'ats_platform', category: 'jobs' },
  { domain: 'personio.de',               name: 'Personio DE ATS',          type: 'ats_platform', category: 'jobs' },
  { domain: 'applytojob.com',            name: 'JazzHR / ApplyToJob',      type: 'ats_platform', category: 'jobs' },
  { domain: 'icims.com',                 name: 'iCIMS ATS',                type: 'ats_platform', category: 'jobs' },
  { domain: 'jobvite.com',               name: 'Jobvite ATS',              type: 'ats_platform', category: 'jobs' },
  { domain: 'recruitee.com',             name: 'Recruitee ATS',            type: 'ats_platform', category: 'jobs' },
  { domain: 'teamtailor.com',            name: 'Teamtailor ATS',           type: 'ats_platform', category: 'jobs' },
  { domain: 'applicantpro.com',          name: 'ApplicantPro',             type: 'ats_platform', category: 'jobs' },
  { domain: 'pinpointhq.com',            name: 'Pinpoint HQ',              type: 'ats_platform', category: 'jobs' },
  { domain: 'oracle.com',               name: 'Oracle HCM',               type: 'ats_platform', category: 'jobs' },
  { domain: 'ultipro.com',               name: 'UKG/UltiPro',              type: 'ats_platform', category: 'jobs' },
  { domain: 'ukg.com',                   name: 'UKG',                      type: 'ats_platform', category: 'jobs' },
  { domain: 'paylocity.com',             name: 'Paylocity',                type: 'ats_platform', category: 'jobs' },
  { domain: 'breezy.hr',                 name: 'Breezy HR',                type: 'ats_platform', category: 'jobs' },
  { domain: 'freshteam.com',             name: 'Freshteam ATS',            type: 'ats_platform', category: 'jobs' },
  { domain: 'zohorecruit.com',           name: 'Zoho Recruit',             type: 'ats_platform', category: 'jobs' },
  { domain: 'hire.withgoogle.com',       name: 'Google Hire',              type: 'ats_platform', category: 'jobs' },
  { domain: 'careers.microsoft.com',     name: 'Microsoft Careers',        type: 'ats_platform', category: 'jobs' },
  { domain: 'careers.un.org',            name: 'UN Inspira',               type: 'ats_platform', category: 'jobs' },
  { domain: 'jobs.unicef.org',           name: 'UNICEF Careers',           type: 'ats_platform', category: 'jobs' },
  { domain: 'cvwarehouse.com',           name: 'CVWarehouse ATS',          type: 'ats_platform', category: 'jobs' },
  { domain: 'msf-applications.org',      name: 'MSF Applications Portal',  type: 'ats_platform', category: 'jobs' },

  // ─── GOVERNMENT PORTALS (authoritative — treated as employer URLs) ─────────────

  { domain: 'ppra.go.tz',                name: 'PPRA Tanzania',            type: 'government_portal', category: 'tenders' },
  { domain: 'ppra.or.ke',                name: 'PPRA Kenya',               type: 'government_portal', category: 'tenders' },
  { domain: 'ppda.go.ug',                name: 'PPDA Uganda',              type: 'government_portal', category: 'tenders' },
  { domain: 'rppa.gov.rw',               name: 'RPPA Rwanda',              type: 'government_portal', category: 'tenders' },
  { domain: 'ppa.gov.et',                name: 'PPA Ethiopia',             type: 'government_portal', category: 'tenders' },
  { domain: 'armp.cd',                   name: 'ARMP DRC',                 type: 'government_portal', category: 'tenders' },
  { domain: 'armp.bi',                   name: 'ARMP Burundi',             type: 'government_portal', category: 'tenders' },
  { domain: 'ubungomc.go.tz',            name: 'Ubungo Municipal Council', type: 'government_portal', category: 'tenders' },
  { domain: 'psc.go.ke',                 name: 'Public Service Commission Kenya', type: 'government_portal', category: 'jobs' },
  { domain: 'public.go.ke',              name: 'Kenya Public Service',     type: 'government_portal', category: 'jobs' },
  { domain: 'utumishi.go.tz',            name: 'Tanzania Public Service',  type: 'government_portal', category: 'jobs' },
  { domain: 'psc.go.ug',                 name: 'Uganda Public Service',    type: 'government_portal', category: 'jobs' },
  { domain: 'rpsb.gov.rw',               name: 'Rwanda PSB',               type: 'government_portal', category: 'jobs' },
  { domain: 'gaa.go.ke',                 name: 'GAA Kenya Portal',         type: 'government_portal', category: 'jobs' },
  { domain: 'lmis.rw',                   name: 'LMIS Rwanda Portal',       type: 'government_portal', category: 'jobs' },
  { domain: 'ajira.go.tz',               name: 'Ajira Tanzania Portal',    type: 'government_portal', category: 'jobs' },
];

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** Extracts the bare hostname from any URL string. */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/** Returns the KnownSource entry for this URL, or undefined if unknown. */
export function getKnownSource(url: string): KnownSource | undefined {
  const domain = extractDomain(url);
  return KNOWN_SOURCES.find(s => domain === s.domain || domain.endsWith('.' + s.domain));
}

/** True if this URL belongs to a known aggregator (content-scraping intermediary). */
export function isAggregatorUrl(url: string): boolean {
  const source = getKnownSource(url);
  return source?.type === 'aggregator';
}

/**
 * True if this URL is an ATS platform — the employer's own hosted hiring system.
 * These must be treated as the authoritative employer URL and never resolved further.
 */
export function isAtsPlatform(url: string): boolean {
  const source = getKnownSource(url);
  if (source?.type === 'ats_platform') return true;

  const domain = extractDomain(url);
  return (
    domain.includes('workdayjobs.com') ||
    domain.includes('workdaysite.com') ||
    domain.includes('talentclue.com') ||
    domain.includes('greenhouse.io') ||
    domain.includes('lever.co') ||
    domain.includes('bamboohr.com') ||
    domain.includes('smartrecruiters.com') ||
    domain.includes('recruitee.com') ||
    domain.includes('taleo.net') ||
    domain.includes('successfactors.') ||
    domain.includes('workable.com') ||
    domain.includes('ashbyhq.com') ||
    domain.includes('jobylon.com') ||
    domain.includes('personio.') ||
    domain.includes('applytojob.com') ||
    domain.includes('teamtailor.com') ||
    domain.includes('pinpointhq.com') ||
    domain.includes('zohorecruit.com') ||
    domain.includes('freshteam.com')
  );
}

/** True if this URL is a government procurement/jobs portal. */
export function isGovernmentPortal(url: string): boolean {
  const source = getKnownSource(url);
  if (source?.type === 'government_portal') return true;

  const domain = extractDomain(url);
  return (
    /\.(go|gov)\.[a-z]{2,3}$/.test(domain) ||
    domain.endsWith('.go.ke') ||
    domain.endsWith('.gov.ke') ||
    domain.endsWith('.go.tz') ||
    domain.endsWith('.gov.tz') ||
    domain.endsWith('.go.ug') ||
    domain.endsWith('.gov.ug') ||
    domain.endsWith('.gov.rw') ||
    domain.endsWith('.gov.et') ||
    domain.endsWith('.gov.so') ||
    domain.endsWith('.gov.ss') ||
    domain.endsWith('.gov.bi') ||
    domain.endsWith('.gov.cd')
  );
}

/**
 * True if this URL is already a legitimate direct employer/authority URL that should be
 * stored as the canonical `employerUrl`.
 */
export function isEmployerUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 8 || trimmed.startsWith('#')) return false;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    
    const domain = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    if (!domain || domain.includes('localhost') || domain.includes('example.com')) return false;

    // Block static assets
    if (/\.(css|js|woff2?|ttf|eot|svg|png|jpe?g|gif|webp|ico|map)$/i.test(pathname)) {
      return false;
    }

    // Block login, signup, auth, oauth paths
    if (
      pathname.includes('/oauth') ||
      pathname.includes('/auth') ||
      pathname.includes('/login') ||
      pathname.includes('/signin') ||
      pathname.includes('/signup') ||
      pathname.includes('/register') ||
      pathname.includes('/valuemembership')
    ) {
      return false;
    }

    // Block CDNs, ad networks & OAuth providers
    if (
      domain.includes('bootstrapcdn') ||
      domain.includes('cdnjs') ||
      domain.includes('jsdelivr') ||
      domain.includes('unpkg') ||
      domain.includes('googleapis') ||
      domain.includes('gstatic') ||
      domain.includes('inmobi') ||
      domain.includes('doubleclick') ||
      domain.includes('googleadservices') ||
      domain.includes('googletagmanager') ||
      domain.includes('google.com') ||
      domain.includes('accounts.google')
    ) {
      return false;
    }

    // Always accept ATS or Gov
    if (isAtsPlatform(trimmed) || isGovernmentPortal(trimmed)) {
      return true;
    }

    // Block known aggregators
    const source = getKnownSource(trimmed);
    if (source && source.type === 'aggregator') {
      return false;
    }

    // Check against social, secondary job boards, and cookie patterns
    if (
      domain.includes('whatsapp') ||
      domain.includes('facebook') ||
      domain.includes('twitter') ||
      domain.includes('instagram') ||
      domain.includes('linkedin') ||
      domain.includes('youtube') ||
      domain.includes('youtu.be') ||
      domain.includes('tiktok') ||
      domain.includes('threads') ||
      domain.includes('telegram') ||
      domain.includes('iubenda') ||
      domain.includes('cookiebot') ||
      domain.includes('wordpress.org') ||
      domain.includes('wix.com') ||
      domain.includes('wixstudio') ||
      domain.includes('akilibrain.com') ||
      domain.includes('recruit.net') ||
      domain.includes('kaziconnect') ||
      domain.includes('devnetjobs')
    ) {
      return false;
    }

    return true; // Unrecognized direct domain
  } catch {
    return false;
  }
}

/** Returns all aggregator domains as a flat array (for BLOCKED_DOMAINS in scrapers). */
export function getAllAggregatorDomains(): string[] {
  return KNOWN_SOURCES
    .filter(s => s.type === 'aggregator')
    .map(s => s.domain);
}

/** Returns human-readable name for a known domain, or null. */
export function getSourceName(url: string): string | null {
  return getKnownSource(url)?.name ?? null;
}
