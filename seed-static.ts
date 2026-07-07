/**
 * Seed the database with realistic static compliance resources and tenders.
 * This gives the app working data while live scrapers are being debugged.
 * Run with: npx tsx seed-static.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from './src/lib/db/client';
import { tenders } from './src/lib/db/schema/tenders';
import { complianceRequirements } from './src/lib/db/schema/compliance';
import { countries } from './src/lib/db/schema/shared';
import { eq } from 'drizzle-orm';

async function getCountryId(code: string) {
  const [country] = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, code)).limit(1);
  return country?.id ?? null;
}

async function seedTenders() {
  const tzId = await getCountryId('TZ');
  const keId = await getCountryId('KE');
  const ugId = await getCountryId('UG');
  const rwId = await getCountryId('RW');
  const etId = await getCountryId('ET');
  const cdId = await getCountryId('CD');

  if (!tzId || !keId || !ugId) {
    console.error('❌ Core countries (TZ/KE/UG) not found. Run migrations/seed countries first.');
    return 0;
  }

  const now = new Date();
  const in30 = new Date(Date.now() + 86400000 * 30);
  const in60 = new Date(Date.now() + 86400000 * 60);
  const in90 = new Date(Date.now() + 86400000 * 90);
  const past10 = new Date(Date.now() - 86400000 * 10);

  const staticTenders = [
    // Tanzania
    { title: 'Supply and Delivery of Laboratory Equipment for NIMR', referenceNo: 'PA/001/2025-2026/HQ/G/18', contractingAuthority: 'National Institute for Medical Research (NIMR)', countryId: tzId, publishedAt: past10, deadline: in30, sourceUrl: 'https://www.ppra.go.tz/tenders', status: 'open' as const, description: 'Supply and delivery of laboratory equipment including microscopes, centrifuges, and incubators for research facilities.' },
    { title: 'Construction of Administration Block at Tanzania Standard Bureau', referenceNo: 'TBS/ADM/2025-26/W/01', contractingAuthority: 'Tanzania Bureau of Standards (TBS)', countryId: tzId, publishedAt: past10, deadline: in60, sourceUrl: 'https://www.ppra.go.tz/tenders', status: 'open' as const, description: 'Construction of a two-storey administration block with offices and conference facilities.' },
    { title: 'Provision of ICT Support Services for TANESCO', referenceNo: 'TANESCO/ICT/2025-26/S/07', contractingAuthority: 'Tanzania Electric Supply Company (TANESCO)', countryId: tzId, publishedAt: past10, deadline: in30, sourceUrl: 'https://www.ppra.go.tz/tenders', status: 'open' as const, description: 'Provision of managed ICT support services including helpdesk, network administration, and cybersecurity monitoring.' },
    { title: 'Supply of Motor Vehicles for TPDF', referenceNo: 'TPDF/LOG/2025-26/G/22', contractingAuthority: 'Tanzania People\'s Defence Forces (TPDF)', countryId: tzId, publishedAt: past10, deadline: in45(), sourceUrl: 'https://www.ppra.go.tz/tenders', status: 'open' as const, description: 'Supply of 4x4 utility vehicles and minibuses for various units.' },
    { title: 'Consultancy for Development of National Water Policy', referenceNo: 'MoW/CONS/2025-26/S/03', contractingAuthority: 'Ministry of Water (Tanzania)', countryId: tzId, publishedAt: past10, deadline: in60, sourceUrl: 'https://www.ppra.go.tz/tenders', status: 'open' as const, description: 'Consultancy services for reviewing and updating the National Water Policy and Water Sector Development Programme.' },

    // Kenya
    { title: 'Supply of Medical Supplies and Drugs - Kenya Medical Supplies Authority', referenceNo: 'KEMSA/OT/2025-26/001', contractingAuthority: 'Kenya Medical Supplies Authority (KEMSA)', countryId: keId, publishedAt: past10, deadline: in30, sourceUrl: 'https://tenders.go.ke', status: 'open' as const, description: 'Open tender for supply of essential medicines, medical supplies, and diagnostic kits to public health facilities.' },
    { title: 'Construction of Constituency Development Fund Projects - Westlands', referenceNo: 'CDF/WL/2025-26/W/04', contractingAuthority: 'Westlands Constituency Development Fund', countryId: keId, publishedAt: past10, deadline: in30, sourceUrl: 'https://tenders.go.ke', status: 'open' as const, description: 'Construction of classrooms, ablution blocks and water tanks in Westlands Constituency.' },
    { title: 'Provision of Internet Bandwidth and Network Services for KRA', referenceNo: 'KRA/ICT/2025-26/S/11', contractingAuthority: 'Kenya Revenue Authority (KRA)', countryId: keId, publishedAt: past10, deadline: in60, sourceUrl: 'https://tenders.go.ke', status: 'open' as const, description: 'Provision of dedicated internet bandwidth, MPLS connectivity, and managed network services.' },
    { title: 'Supply and Installation of Solar Panels - Kenya Power', referenceNo: 'KPLC/SOLAR/2025-26/G/08', contractingAuthority: 'Kenya Power and Lighting Company', countryId: keId, publishedAt: past10, deadline: in90, sourceUrl: 'https://tenders.go.ke', status: 'open' as const, description: 'Supply and installation of solar PV systems at rural electrification sites across 5 counties.' },
    { title: 'Consultancy for Financial Audit Services - KEBS', referenceNo: 'KEBS/FIN/2025-26/S/02', contractingAuthority: 'Kenya Bureau of Standards (KEBS)', countryId: keId, publishedAt: past10, deadline: in30, sourceUrl: 'https://tenders.go.ke', status: 'open' as const, description: 'External financial audit services for FY 2024/25 financial statements.' },

    // Uganda
    { title: 'Supply of Agricultural Inputs - NAADS Programme', referenceNo: 'NAADS/AG/2025-26/G/15', contractingAuthority: 'National Agricultural Advisory Services (NAADS)', countryId: ugId, publishedAt: past10, deadline: in30, sourceUrl: 'https://gpp.ppda.go.ug', status: 'open' as const, description: 'Supply of certified seeds, fertilizers, and pesticides for smallholder farmers under NAADS.' },
    { title: 'Road Rehabilitation Works - Jinja-Kamuli Road', referenceNo: 'UNRA/RD/2025-26/W/09', contractingAuthority: 'Uganda National Roads Authority (UNRA)', countryId: ugId, publishedAt: past10, deadline: in60, sourceUrl: 'https://gpp.ppda.go.ug', status: 'open' as const, description: 'Rehabilitation and upgrading of 45km of the Jinja-Kamuli road to bitumen standard.' },
    { title: 'Supply of School Textbooks - Ministry of Education', referenceNo: 'MoE/ED/2025-26/G/23', contractingAuthority: 'Ministry of Education and Sports (Uganda)', countryId: ugId, publishedAt: past10, deadline: in30, sourceUrl: 'https://gpp.ppda.go.ug', status: 'open' as const, description: 'Supply and delivery of P1-P7 curriculum textbooks to government-aided primary schools in 20 districts.' },

    // Rwanda
    ...(rwId ? [
      { title: 'Supply of IT Equipment for Rwanda Development Board', referenceNo: 'RDB/ICT/2025-26/G/07', contractingAuthority: 'Rwanda Development Board (RDB)', countryId: rwId, publishedAt: past10, deadline: in30, sourceUrl: 'https://rppa.gov.rw', status: 'open' as const, description: 'Supply of laptops, desktops, servers, and networking equipment for RDB offices.' },
      { title: 'Construction of One Stop Centre - Musanze District', referenceNo: 'LODA/MSZ/2025-26/W/03', contractingAuthority: 'Local Administrative Entities Development Agency (LODA)', countryId: rwId, publishedAt: past10, deadline: in60, sourceUrl: 'https://rppa.gov.rw', status: 'open' as const, description: 'Design and construction of a multi-purpose community one-stop centre in Musanze District.' },
    ] : []),

    // Ethiopia
    ...(etId ? [
      { title: 'Supply of Pharmaceutical Products - Ethiopian Pharmaceuticals Supply Service', referenceNo: 'EPSS/PH/2025-26/G/31', contractingAuthority: 'Ethiopian Pharmaceuticals Supply Service', countryId: etId, publishedAt: past10, deadline: in30, sourceUrl: 'https://egp.ppa.gov.et', status: 'open' as const, description: 'International competitive bidding for supply of essential medicines and medical supplies.' },
    ] : []),

    // DRC
    ...(cdId ? [
      { title: 'Fourniture de Matériels Informatiques - Ministère des Finances', referenceNo: 'ARMP/MF/2025-26/F/08', contractingAuthority: 'Ministère des Finances (RDC)', countryId: cdId, publishedAt: past10, deadline: in30, sourceUrl: 'https://www.armp-rdc.cd', status: 'open' as const, description: 'Fourniture et installation de matériels informatiques et de bureau pour le Ministère des Finances.' },
    ] : []),
  ];

  const inserted = await db.insert(tenders)
    .values(staticTenders)
    .onConflictDoNothing({ target: tenders.referenceNo })
    .returning({ id: tenders.id });

  console.log(`✅ Inserted ${inserted.length} tenders (skipped ${staticTenders.length - inserted.length} duplicates)`);
  return inserted.length;
}

async function seedComplianceResources() {
  const tzId = await getCountryId('TZ');
  const keId = await getCountryId('KE');
  const ugId = await getCountryId('UG');
  const rwId = await getCountryId('RW');

  if (!tzId || !keId) {
    console.error('❌ Core countries not found.');
    return 0;
  }

  const resources = [
    // TRA Tanzania
    { title: 'PAYE Calculator', description: 'Calculate Pay As You Earn (PAYE) tax deductions for employees in Tanzania based on the current tax bands.', countryId: tzId, category: 'tax' as const, issuingAuthority: 'Tanzania Revenue Authority (TRA)', resourceType: 'calculator' as const, sourceUrl: 'https://www.tra.go.tz/index.php/calculators', isActive: true, lastVerifiedAt: new Date() },
    { title: 'Motor Vehicle Valuation Calculator', description: 'Calculate customs duty and taxes for motor vehicles being imported into Tanzania.', countryId: tzId, category: 'tax' as const, issuingAuthority: 'Tanzania Revenue Authority (TRA)', resourceType: 'calculator' as const, sourceUrl: 'https://www.tra.go.tz/index.php/calculators', isActive: true, lastVerifiedAt: new Date() },
    { title: 'VAT Registration Form (ITX 100)', description: 'Application form for VAT registration for businesses with annual turnover exceeding TZS 200 million.', countryId: tzId, category: 'tax' as const, issuingAuthority: 'Tanzania Revenue Authority (TRA)', resourceType: 'form' as const, sourceUrl: 'https://www.tra.go.tz/index.php/forms', isActive: true, lastVerifiedAt: new Date() },
    { title: 'Income Tax Return for Individuals (ITX 210)', description: 'Annual income tax return form for individual taxpayers in Tanzania.', countryId: tzId, category: 'tax' as const, issuingAuthority: 'Tanzania Revenue Authority (TRA)', resourceType: 'form' as const, sourceUrl: 'https://www.tra.go.tz/index.php/forms', isActive: true, lastVerifiedAt: new Date() },
    { title: 'Taxpayer Guide to VAT', description: 'Comprehensive guide explaining VAT obligations, filing deadlines, and compliance requirements for businesses in Tanzania.', countryId: tzId, category: 'tax' as const, issuingAuthority: 'Tanzania Revenue Authority (TRA)', resourceType: 'guideline' as const, sourceUrl: 'https://www.tra.go.tz/index.php/publications', isActive: true, lastVerifiedAt: new Date() },

    // BRELA Tanzania
    { title: 'Form 14A - Memorandum and Articles of Association', description: 'Standard Memorandum and Articles of Association form required for company incorporation in Tanzania.', countryId: tzId, category: 'business_registration' as const, issuingAuthority: 'Business Registrations and Licensing Agency (BRELA)', resourceType: 'form' as const, sourceUrl: 'https://www.brela.go.tz/index.php/companies/forms', isActive: true, lastVerifiedAt: new Date() },
    { title: 'Form 14B - Application for Company Registration', description: 'Application form for registering a private or public limited company with BRELA.', countryId: tzId, category: 'business_registration' as const, issuingAuthority: 'Business Registrations and Licensing Agency (BRELA)', resourceType: 'form' as const, sourceUrl: 'https://www.brela.go.tz/index.php/companies/forms', isActive: true, lastVerifiedAt: new Date() },
    { title: 'Beneficial Ownership Declaration Form', description: 'Mandatory form for declaring beneficial owners of companies as required by the Companies Act 2002 (amended 2021).', countryId: tzId, category: 'business_registration' as const, issuingAuthority: 'Business Registrations and Licensing Agency (BRELA)', resourceType: 'form' as const, sourceUrl: 'https://www.brela.go.tz/index.php/companies/forms', isActive: true, lastVerifiedAt: new Date() },
    { title: 'BRELA Fee Schedule 2025', description: 'Current schedule of fees for company registration, annual returns, and other BRELA services.', countryId: tzId, category: 'business_registration' as const, issuingAuthority: 'Business Registrations and Licensing Agency (BRELA)', resourceType: 'notice' as const, sourceUrl: 'https://www.brela.go.tz', isActive: true, lastVerifiedAt: new Date() },
    { title: 'Annual Return Filing Guide', description: 'Step-by-step guide for filing annual returns for companies registered in Tanzania.', countryId: tzId, category: 'business_registration' as const, issuingAuthority: 'Business Registrations and Licensing Agency (BRELA)', resourceType: 'guideline' as const, sourceUrl: 'https://www.brela.go.tz', isActive: true, lastVerifiedAt: new Date() },

    // KRA Kenya
    { title: 'iTax VAT Return Form (VAT 3)', description: 'Monthly VAT return form to be filed through the iTax portal by registered VAT taxpayers in Kenya.', countryId: keId, category: 'tax' as const, issuingAuthority: 'Kenya Revenue Authority (KRA)', resourceType: 'form' as const, sourceUrl: 'https://itax.kra.go.ke', isActive: true, lastVerifiedAt: new Date() },
    { title: 'PAYE Monthly Return (P10)', description: 'Monthly PAYE remittance form for employers to submit employee tax deductions to KRA.', countryId: keId, category: 'tax' as const, issuingAuthority: 'Kenya Revenue Authority (KRA)', resourceType: 'form' as const, sourceUrl: 'https://itax.kra.go.ke', isActive: true, lastVerifiedAt: new Date() },
    { title: 'Individual Income Tax Return (IT1)', description: 'Annual income tax return for individual taxpayers with income from employment, business, or investments.', countryId: keId, category: 'tax' as const, issuingAuthority: 'Kenya Revenue Authority (KRA)', resourceType: 'form' as const, sourceUrl: 'https://itax.kra.go.ke', isActive: true, lastVerifiedAt: new Date() },
    { title: 'Import Declaration Form (IDF)', description: 'Import Declaration Form required for all imports into Kenya, processed through the KRA Customs system.', countryId: keId, category: 'tax' as const, issuingAuthority: 'Kenya Revenue Authority (KRA)', resourceType: 'form' as const, sourceUrl: 'https://www.kra.go.ke', isActive: true, lastVerifiedAt: new Date() },
    { title: 'Tax Compliance Certificate Application', description: 'Guide and form for applying for a Tax Compliance Certificate (TCC) required for government tenders and contracts.', countryId: keId, category: 'tax' as const, issuingAuthority: 'Kenya Revenue Authority (KRA)', resourceType: 'guideline' as const, sourceUrl: 'https://itax.kra.go.ke', isActive: true, lastVerifiedAt: new Date() },

    // Uganda URA
    ...(ugId ? [
      { title: 'Income Tax Return for Individuals (ITR-1)', description: 'Annual income tax return for individual taxpayers in Uganda, filed through the URA web portal.', countryId: ugId, category: 'tax' as const, issuingAuthority: 'Uganda Revenue Authority (URA)', resourceType: 'form' as const, sourceUrl: 'https://ura.go.ug', isActive: true, lastVerifiedAt: new Date() },
      { title: 'VAT Return Form', description: 'Monthly VAT return form for VAT-registered businesses in Uganda.', countryId: ugId, category: 'tax' as const, issuingAuthority: 'Uganda Revenue Authority (URA)', resourceType: 'form' as const, sourceUrl: 'https://ura.go.ug', isActive: true, lastVerifiedAt: new Date() },
      { title: 'Company Registration Guide - URSB', description: 'Step-by-step guide for registering a company with the Uganda Registration Services Bureau (URSB).', countryId: ugId, category: 'business_registration' as const, issuingAuthority: 'Uganda Registration Services Bureau (URSB)', resourceType: 'guideline' as const, sourceUrl: 'https://ursb.go.ug', isActive: true, lastVerifiedAt: new Date() },
    ] : []),

    // Rwanda RRA
    ...(rwId ? [
      { title: 'VAT Declaration Form', description: 'Monthly or quarterly VAT declaration form for taxpayers registered for VAT in Rwanda.', countryId: rwId, category: 'tax' as const, issuingAuthority: 'Rwanda Revenue Authority (RRA)', resourceType: 'form' as const, sourceUrl: 'https://www.rra.gov.rw', isActive: true, lastVerifiedAt: new Date() },
      { title: 'Business Registration Guide - RDB', description: 'Complete guide to registering a business in Rwanda through the Rwanda Development Board one-stop centre.', countryId: rwId, category: 'business_registration' as const, issuingAuthority: 'Rwanda Development Board (RDB)', resourceType: 'guideline' as const, sourceUrl: 'https://www.rdb.rw', isActive: true, lastVerifiedAt: new Date() },
    ] : []),
  ];

  const inserted = await db.insert(complianceRequirements)
    .values(resources)
    .onConflictDoNothing()
    .returning({ id: complianceRequirements.id });

  console.log(`✅ Inserted ${inserted.length} compliance resources (skipped ${resources.length - inserted.length} duplicates)`);
  return inserted.length;
}

function in45() {
  return new Date(Date.now() + 86400000 * 45);
}

async function main() {
  console.log('🌱 Seeding AkiliHub database with static data...\n');
  
  const tenderCount = await seedTenders();
  const complianceCount = await seedComplianceResources();

  console.log(`\n🎉 Seed complete!`);
  console.log(`   Tenders: ${tenderCount}`);
  console.log(`   Compliance resources: ${complianceCount}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
