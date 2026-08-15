import { db } from '../src/lib/db/client';
import { guides } from '../src/lib/db/schema/guides';

const articles = [
  {
    slug: 'uganda-ura-tax-compliance-startups',
    title: 'URA Tax Compliance Guide for Startups in Uganda',
    summary: 'A step-by-step guide to navigating the Uganda Revenue Authority (URA) tax system, obtaining a TIN, and staying compliant as a new business.',
    category: 'compliance' as const,
    contentHtml: `
      <h2>The Uganda Revenue Authority and Startups</h2>
      <p>Starting a business in Uganda is an exciting venture, but navigating the tax landscape governed by the Uganda Revenue Authority (URA) can be daunting for new entrepreneurs. A lack of understanding can lead to hefty penalties, disrupting cash flow and potentially forcing closure. This guide demystifies URA compliance for startups, providing a clear roadmap to good standing.</p>

      <h2>1. The Starting Point: Obtaining a TIN</h2>
      <p>The foundation of tax compliance is the Tax Identification Number (TIN). Every registered company and its directors must possess a TIN. This is your unique identifier within the URA system.</p>
      <ul>
        <li><strong>How to apply:</strong> The process is fully digitized via the URA web portal. You will need your Certificate of Incorporation from the Uganda Registration Services Bureau (URSB), Memorandum and Articles of Association, and valid identification for all directors.</li>
        <li><strong>Why it matters:</strong> Without a TIN, you cannot open a corporate bank account, import goods, or bid for government or large corporate contracts.</li>
      </ul>

      <h2>2. Understanding Your Tax Obligations</h2>
      <p>Once registered, startups face several potential taxes, depending on their structure and revenue.</p>
      <h3>Corporate Income Tax (CIT)</h3>
      <p>Resident companies are generally subject to a 30% tax on their chargeable income (profits). Startups must file provisional tax returns—estimating their annual tax liability—and pay this in installments (usually by the 6th and 12th months of their financial year).</p>
      <h3>Value Added Tax (VAT)</h3>
      <p>VAT registration is mandatory if your annual taxable turnover exceeds UGX 150 million. If you fall below this threshold, you can voluntarily register, which is beneficial if you primarily deal with VAT-registered clients and wish to claim input VAT. VAT-registered businesses must file returns by the 15th of the following month.</p>
      <h3>Pay As You Earn (PAYE)</h3>
      <p>If you have employees earning above the taxable threshold (currently UGX 235,000 per month), you must withhold PAYE and remit it to URA by the 15th of the following month. The rates are progressive, peaking at 30%.</p>
      <h3>Withholding Tax (WHT)</h3>
      <p>Startups must withhold tax (typically 6%) when paying suppliers for goods or services exceeding UGX 1 million, unless the supplier is exempt. This must also be remitted to the URA.</p>

      <h2>3. The Importance of Record Keeping</h2>
      <p>The URA operates on a self-assessment basis, meaning you declare your income and calculate your tax. However, URA holds the right to audit your records.</p>
      <p>Section 89 of the Tax Procedures Code Act mandates all taxpayers to maintain accurate records in English for at least five years. This includes receipts, invoices, bank statements, and ledgers. Poor record-keeping is the most common reason startups fail URA audits and face punitive assessments.</p>

      <h2>4. Leveraging EFRIS</h2>
      <p>The Electronic Fiscal Receipting and Invoicing Solution (EFRIS) is an initiative by URA to track VAT transactions in real-time. All VAT-registered businesses must issue e-receipts and e-invoices via EFRIS. Compliance with EFRIS is strictly enforced, and failure to use the system attracts severe penalties (currently UGX 6 million per month of non-compliance).</p>

      <h2>Conclusion</h2>
      <p>Tax compliance is not merely a legal obligation; it is a critical component of business sustainability and growth in Uganda. By registering for a TIN, understanding your specific tax liabilities, maintaining meticulous records, and utilizing systems like EFRIS, your startup can avoid penalties and focus on its core mission.</p>
    `,
    keywords: 'Uganda, URA, tax compliance, TIN, VAT, PAYE, EFRIS, startup',
  },
  {
    slug: 'remote-work-salaries-east-africa-global-comparison',
    title: 'Remote Work in East Africa: Do Global Companies Pay Local Rates?',
    summary: 'An analysis of how international companies compensate remote workers in East Africa, comparing local market rates against global benchmarking strategies.',
    category: 'salaries' as const,
    contentHtml: `
      <h2>The Globalization of the East African Talent Pool</h2>
      <p>The shift towards remote work has fundamentally altered the employment landscape in East Africa. Tech professionals, digital marketers, and customer support specialists in Nairobi, Kampala, and Kigali are increasingly hired directly by companies in the US, UK, and Europe. This raises a critical question for both employers and employees: how should remote workers in emerging markets be compensated?</p>

      <h2>The Three Compensation Philosophies</h2>
      <p>When an international company hires an employee in East Africa, they typically adopt one of three compensation strategies.</p>

      <h3>1. The Local Market Rate</h3>
      <p>Under this model, companies pay according to the prevailing local market conditions. They might use data from local HR consultancies to offer a salary that is competitive within Nairobi or Kigali, but significantly lower than what they would pay a worker in London or San Francisco.</p>
      <p><strong>Impact:</strong> While this saves the employer money, it often leads to high turnover. Top-tier East African talent quickly realizes their global market value and leaves for companies offering fairer compensation.</p>

      <h3>2. The Global Flat Rate</h3>
      <p>A smaller, progressive subset of companies (often early-stage, remote-first startups) pay the exact same salary for a specific role, regardless of where the employee lives. A mid-level engineer earns $120,000 whether they are in New York or Nakuru.</p>
      <p><strong>Impact:</strong> This creates immense loyalty and attracts the absolute best talent in the region. However, it can significantly disrupt local economies, creating hyper-inflationary micro-economies and making it impossible for local startups to compete for talent.</p>

      <h3>3. The Tiered / Cost-of-Living Approach</h3>
      <p>This is the most common approach utilized by mature tech companies (e.g., GitLab, Buffer). They establish a base salary for a role (often benchmarked to a major US city) and apply a multiplier based on the employee's location and local cost of living.</p>
      <p><strong>Impact:</strong> For an East African remote worker, this usually results in a salary that is substantially higher than local market rates—often 2x to 4x higher—but still lower than a US equivalent. For instance, a role paying $100,000 in San Francisco might pay $45,000 to $60,000 for a remote worker in Kenya.</p>

      <h2>The Data: What Are Remote Workers Actually Making?</h2>
      <p>Based on crowdsourced data from AkiliBrain's Salary Intelligence module, the divide between local employers and international remote employers is stark:</p>
      <ul>
        <li><strong>Software Engineering:</strong> A senior engineer at a local Kenyan firm might earn $35,000 - $50,000 annually. The same engineer working remotely for a US firm typically earns $70,000 - $110,000 annually.</li>
        <li><strong>Customer Success/Support:</strong> Local rates average $5,000 - $10,000 annually. Remote global roles often pay $20,000 - $35,000.</li>
        <li><strong>Data Science & Analytics:</strong> Local roles offer $25,000 - $40,000. Remote global roles offer $60,000 - $90,000.</li>
      </ul>

      <h2>The Challenge of Contracting vs. Employment</h2>
      <p>It is important to note that most East Africans working for global companies are hired as Independent Contractors rather than full-time employees (FTEs). This is because setting up a legal entity to run payroll in Kenya or Rwanda is complex for a foreign company.</p>
      <p>Consequently, the remote worker's inflated salary must cover their own health insurance, retirement contributions (NSSF), and they bear the burden of filing their own taxes. Furthermore, they lack standard labor protections like mandatory severance pay.</p>

      <h2>Conclusion</h2>
      <p>The influx of remote global jobs is a net positive for East Africa, injecting foreign capital directly into the local economy and raising the standard of living for tech professionals. While the "Global Flat Rate" remains rare, the prevailing "Tiered" model ensures that talented East Africans can earn significantly above local market ceilings, fundamentally changing the career trajectories available to them.</p>
    `,
    keywords: 'remote work, salaries, East Africa, compensation, global rates, tech jobs, independent contractor',
  },
  {
    slug: 'navigating-drc-public-procurement-system',
    title: 'Navigating the Public Procurement System in the DRC',
    summary: 'A critical overview of the legal framework, requirements, and challenges of bidding for government contracts in the Democratic Republic of Congo (DRC).',
    category: 'procurement' as const,
    contentHtml: `
      <h2>The Opportunity in the DRC</h2>
      <p>The Democratic Republic of Congo (DRC) is a vast nation undergoing significant infrastructural and institutional rebuilding. With massive investments in roads, energy, and public services, the government is the largest purchaser of goods and works in the country. For bold enterprises, the DRC offers lucrative procurement opportunities, but the landscape is uniquely challenging and requires deep local knowledge and strict adherence to a complex legal framework.</p>

      <h2>The Legal Framework (ARMP and CGMP)</h2>
      <p>Public procurement in the DRC is governed by Law No. 10/010 of April 2010 on Public Procurement. This law modernized the system, aiming to align it with international standards of transparency and competitiveness.</p>
      <p>The system is overseen by the <em>Autorité de Régulation des Marchés Publics</em> (ARMP), which acts as the regulatory and oversight body. However, the actual purchasing is decentralized. Each ministry, province, and public enterprise has its own <em>Cellule de Gestion des Marchés Publics</em> (CGMP) responsible for managing the tendering process.</p>

      <h2>Mandatory Requirements for Bidders</h2>
      <p>To participate in a public tender in the DRC, a company must prove its legal existence and financial viability. The standard dossier requires:</p>
      <ul>
        <li><strong>RCCM Registration:</strong> The company must be registered in the Trade and Personal Property Credit Register (<em>Registre du Commerce et du Crédit Mobilier</em>).</li>
        <li><strong>National Identification Number (Id. Nat.):</strong> Issued by the Ministry of Economy.</li>
        <li><strong>Tax Clearance (Attestation Fiscale):</strong> Proof from the <em>Direction Générale des Impôts</em> (DGI) that the company is up-to-date on its taxes.</li>
        <li><strong>Social Security Clearance:</strong> A certificate from the <em>Caisse Nationale de Sécurité Sociale</em> (CNSS) confirming that employee contributions have been paid.</li>
        <li><strong>Financial Capacity:</strong> Bank guarantees (caution de soumission) are almost always required to prove financial stability and deter frivolous bidding.</li>
      </ul>

      <h2>The Tendering Process</h2>
      <p>The standard method of procurement in the DRC is the Open Call for Tenders (<em>Appel d'Offres Ouvert</em>). The process generally follows these steps:</p>
      <ol>
        <li><strong>Publication:</strong> Tenders are published in the official ARMP journal, national newspapers, and increasingly on the ARMP digital portal.</li>
        <li><strong>Purchase of the DAO:</strong> Bidders must purchase the Tender Document (<em>Dossier d'Appel d'Offres - DAO</em>). Proof of purchase is required for submission.</li>
        <li><strong>Submission:</strong> Bids must be submitted in French, in sealed envelopes, before the strict deadline.</li>
        <li><strong>Public Opening:</strong> Bids are opened publicly. The names of the bidders and their proposed prices are read aloud.</li>
        <li><strong>Evaluation:</strong> A technical sub-commission evaluates the bids based on criteria outlined in the DAO. The contract is theoretically awarded to the lowest evaluated responsive bidder.</li>
      </ol>

      <h2>Challenges and Realities on the Ground</h2>
      <p>Despite the modernized legal framework, businesses operating in the DRC face practical challenges:</p>
      <ul>
        <li><strong>Bureaucracy and Delays:</strong> The evaluation and award processes frequently suffer from massive delays, tying up the bidder's bank guarantees for extended periods.</li>
        <li><strong>Payment Issues:</strong> Securing the contract is only half the battle. Getting paid by the state treasury can involve lengthy bureaucratic procedures. Businesses must ensure they have enough working capital to survive delayed payments.</li>
        <li><strong>Language Barrier:</strong> All official documentation, communication, and legal proceedings are strictly in French. Anglophone businesses must partner with competent local, bilingual legal counsel.</li>
      </ul>

      <h2>Conclusion</h2>
      <p>Winning government tenders in the DRC is not for the faint of heart. It requires significant upfront investment, immense patience, and an airtight compliance strategy. However, for companies that can successfully navigate the ARMP framework and manage the operational risks, the scale of the contracts available can be transformative.</p>
    `,
    keywords: 'DRC, Congo, public procurement, tenders, ARMP, CGMP, RCCM',
  },
  {
    slug: 'future-of-healthcare-rwanda-digital-innovation',
    title: 'The Future of Healthcare in Rwanda: Digital Innovation and Data',
    summary: 'An exploration of Rwanda\'s pioneering approach to digital health, e-prescriptions, and national health data management.',
    category: 'health' as const,
    contentHtml: `
      <h2>A Continent-Leading Digital Health Strategy</h2>
      <p>Rwanda has consistently positioned itself as a pioneer in digital innovation in Africa, and its healthcare sector is a shining example of this commitment. With a vision to achieve Universal Health Coverage (UHC), the Rwandan Ministry of Health is leveraging technology and data integration to improve service delivery, reduce costs, and enhance patient outcomes from the capital in Kigali to the most remote rural clinics.</p>

      <h2>The Electronic Medical Record (EMR) Ecosystem</h2>
      <p>At the heart of Rwanda's digital health strategy is the widespread implementation of Electronic Medical Records. While many countries struggle with fragmented systems, Rwanda has pushed for interoperability.</p>
      <p>The country uses OpenMRS as the foundation for its national EMR system. This means that a patient's medical history, lab results, and treatment plans are stored digitally and can be accessed securely by authorized healthcare providers across the country. This reduces the duplication of tests, prevents dangerous drug interactions, and ensures continuity of care.</p>

      <h2>Zipline: The Drone Delivery Revolution</h2>
      <p>Perhaps the most globally recognized aspect of Rwanda's digital health innovation is its partnership with Zipline. In a country characterized by its "Thousand Hills" and challenging terrain, delivering emergency medical supplies was historically difficult.</p>
      <p>Since 2016, autonomous drones have been delivering blood, vaccines, and essential medicines to remote hospitals in minutes rather than hours. This system relies on robust, real-time data to track inventory at rural clinics, predict shortages, and launch drones automatically when critical supplies run low.</p>

      <h2>Babyl (Babylon Health): Telemedicine at Scale</h2>
      <p>To relieve the burden on physical health facilities, Rwanda partnered with Babyl to provide digital healthcare consultations via mobile phones. Even citizens with basic feature phones (non-smartphones) can access doctors and nurses via USSD and voice calls.</p>
      <p>Crucially, Babyl's system is integrated with Mutuelle de Santé (the national community-based health insurance scheme). When a doctor issues an e-prescription through the platform, the patient receives an SMS code which they can present at a local pharmacy to receive their medication, completely cashless.</p>

      <h2>DHIS2 and National Health Intelligence</h2>
      <p>Like its East African neighbors, Rwanda relies heavily on DHIS2 (District Health Information Software 2) for aggregating national health data. However, Rwanda's implementation is notable for its completeness and data quality.</p>
      <p>The Ministry of Health uses DHIS2 dashboards to track everything from maternal mortality rates to the prevalence of non-communicable diseases (NCDs). During the COVID-19 pandemic, this data infrastructure allowed the government to rapidly deploy contact tracing apps and monitor national ICU bed capacity in real-time, resulting in one of the most effective pandemic responses on the continent.</p>

      <h2>The Challenges of Digital Transformation</h2>
      <p>While the successes are numerous, the digital health rollout faces ongoing hurdles:</p>
      <ul>
        <li><strong>Infrastructure Gaps:</strong> While internet penetration is high by regional standards, reliable electricity and high-speed internet remain challenging in the deepest rural areas, sometimes hindering EMR uptime.</li>
        <li><strong>Data Privacy and Security:</strong> As health records become entirely digitized, protecting sensitive patient data from cyber threats is a growing priority for the Ministry of Health.</li>
        <li><strong>Digital Literacy:</strong> Ensuring that older healthcare workers are comfortable and efficient using tablets and digital systems requires continuous training and change management.</li>
      </ul>

      <h2>Conclusion</h2>
      <p>Rwanda is proving that resource constraints do not preclude digital transformation. By treating data as a critical health asset and embracing innovative technologies like drone delivery and USSD telemedicine, Rwanda is building a resilient, future-proof healthcare system that serves as a blueprint for the rest of Africa.</p>
    `,
    keywords: 'Rwanda, digital health, EMR, Zipline, telemedicine, DHIS2, public health',
  },
  {
    slug: 'entry-level-finance-jobs-kenya-what-to-expect',
    title: 'Entry-Level Finance Jobs in Kenya: Salaries and Expectations',
    summary: 'A realistic look at the job market, salary expectations, and required qualifications for fresh finance graduates entering the Kenyan workforce.',
    category: 'jobs' as const,
    contentHtml: `
      <h2>The Kenyan Finance Sector: An Overview</h2>
      <p>Nairobi is East Africa's undisputed financial hub. Home to a vibrant banking sector, a growing private equity scene, numerous microfinance institutions, and the regional headquarters of major international organizations, the demand for finance professionals is perennial. However, for fresh graduates holding a BCom or Finance degree, the entry-level market is fiercely competitive. This guide outlines what to expect when entering the finance sector in Kenya.</p>

      <h2>The Big Four and Tier 1 Banks</h2>
      <p>The most coveted entry-level roles are graduate trainee programs at the "Big Four" accounting firms (PwC, EY, Deloitte, KPMG) and Tier 1 commercial banks (like Equity, KCB, and Safaricom's finance divisions).</p>
      
      <h3>What to Expect:</h3>
      <ul>
        <li><strong>The Work:</strong> Intense, long hours, steep learning curve. You will be exposed to audit, tax advisory, or corporate finance, working with large corporate clients.</li>
        <li><strong>The Qualifications:</strong> A First-Class or strong Upper Second-Class degree is almost mandatory. Furthermore, having completed or making significant progress in CPA (K) or ACCA gives you a massive edge.</li>
        <li><strong>Salary Range:</strong> Entry-level roles or graduate trainees in these top-tier institutions typically start between KES 70,000 to KES 120,000 gross per month.</li>
      </ul>

      <h2>Microfinance Institutions (MFIs) and SACCOs</h2>
      <p>Kenya has a deeply entrenched cooperative and microfinance movement. SACCOs (Savings and Credit Cooperative Organizations) and MFIs offer numerous entry-level opportunities, particularly as Credit Officers, Tellers, or Accounts Assistants.</p>
      
      <h3>What to Expect:</h3>
      <ul>
        <li><strong>The Work:</strong> Highly operational. You will deal with retail clients, process loans, manage ledgers, and handle cash. The work is less glamorous than corporate finance but provides excellent foundational experience in financial operations.</li>
        <li><strong>The Qualifications:</strong> A degree or diploma in finance/accounting, often coupled with CPA Section 1 or 2.</li>
        <li><strong>Salary Range:</strong> Entry-level salaries here are lower, typically ranging from KES 30,000 to KES 60,000 gross per month.</li>
      </ul>

      <h2>The Fintech Disrupters</h2>
      <p>The rise of fintechs (payments, digital lending, insurtech) has created a new avenue for finance graduates. Companies require analysts to manage reconciliations, Treasury operations, and financial planning & analysis (FP&A).</p>
      
      <h3>What to Expect:</h3>
      <ul>
        <li><strong>The Work:</strong> Fast-paced and unstructured. You need to be highly adaptable and tech-savvy. Proficiency in advanced Excel, SQL, and data visualization tools (like PowerBI) is often prioritized over traditional accounting credentials.</li>
        <li><strong>Salary Range:</strong> Highly variable based on funding. Well-funded startups pay between KES 80,000 to KES 150,000 for junior financial analysts.</li>
      </ul>

      <h2>The Reality of the CPA (K) Requirement</h2>
      <p>In Kenya, the Certified Public Accountant (CPA) qualification, administered by KASNEB, is deeply ingrained in the culture of finance hiring. While a university degree proves academic capability, the CPA(K) (or international equivalents like ACCA) is viewed as proof of technical competence.</p>
      <p>Many entry-level job descriptions explicitly state "Must have CPA Part 2" or "CPA(K) is an added advantage." If you are a finance graduate aiming for rapid upward mobility, enrolling in and completing your professional papers is not optional; it is a necessity.</p>

      <h2>Conclusion: Managing Expectations</h2>
      <p>The journey from a fresh graduate to a Finance Manager or CFO in Kenya is a marathon. The initial years are characterized by modest pay relative to the hours worked, particularly in audit firms or SMEs. However, gaining 2-3 years of solid technical experience, completing your professional papers, and building a network within Nairobi's financial ecosystem will position you for significant salary jumps in your mid-career.</p>
    `,
    keywords: 'finance jobs, Kenya, entry-level, CPA, KASNEB, Big Four, banking, salaries',
  }
];

async function seedGuides() {
  console.log('Seeding more guides...');
  for (const article of articles) {
    try {
      await db.insert(guides).values(article).onConflictDoNothing();
      console.log("Inserted: " + article.title);
    } catch (e) {
      console.error("Failed to insert " + article.slug + ": ", e);
    }
  }
  console.log('Finished seeding guides 2.');
  process.exit(0);
}

seedGuides();
