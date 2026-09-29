import { describe, expect, it } from 'vitest';
import { ParserSpecSchema, getStructuralFingerprint, runParserSpec, specIsUsable } from '../parser-spec';

const html = `
<html><body>
  <ul class="jobs">
    <li class="job"><h2 class="t">Accountant</h2><span class="co">Acme Ltd</span>
      <a class="apply" href="/jobs/1">Apply</a><span class="type">Full Time</span>
      <span class="sal">KES 80,000</span><time datetime="2026-10-30">30 Oct</time></li>
    <li class="job"><h2 class="t">Driver</h2><span class="co">Beta</span>
      <a class="apply" href="javascript:alert(1)">Apply</a><span class="type">Contract</span></li>
    <li class="job"><span class="co">No title here</span></li>
  </ul>
</body></html>`;

const spec = ParserSpecSchema.parse({
  isJobListing: true,
  container: 'li.job',
  fields: {
    title: { selector: '.t' },
    companyName: { selector: '.co' },
    sourceUrl: { selector: 'a.apply', attr: 'href' },
    jobType: { selector: '.type' },
    salaryMin: { selector: '.sal' },
    deadlineIsoString: { selector: 'time', attr: 'datetime' },
  },
});

describe('runParserSpec', () => {
  const jobs = runParserSpec(spec, html, 'https://example.co.ke/list');

  it('extracts fields and skips items without a title', () => {
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({ title: 'Accountant', companyName: 'Acme Ltd', jobType: 'full_time', salaryMin: 80000, deadlineIsoString: '2026-10-30' });
  });

  it('resolves relative URLs and drops non-http(s) schemes', () => {
    expect(jobs[0].sourceUrl).toBe('https://example.co.ke/jobs/1');
    expect(jobs[1].sourceUrl).toBeNull();
  });

  it('returns nothing for non-job pages or missing containers', () => {
    expect(runParserSpec({ ...spec, isJobListing: false }, html, 'https://x.test')).toEqual([]);
    expect(runParserSpec({ ...spec, container: '' }, html, 'https://x.test')).toEqual([]);
  });

  it('survives invalid selectors from the model', () => {
    expect(runParserSpec({ ...spec, container: '[[[' }, html, 'https://x.test')).toEqual([]);
    const bad = ParserSpecSchema.parse({ isJobListing: true, container: 'li.job', fields: { title: { selector: '.t' }, companyName: { selector: '((' } } });
    const out = runParserSpec(bad, html, 'https://x.test');
    expect(out[0].title).toBe('Accountant');
    expect(out[0].companyName).toBeNull();
    expect(specIsUsable(bad, html)).toBe(false);
  });
});

describe('ParserSpecSchema', () => {
  it('rejects anything that is not a plain selector spec (no code fields, bad attrs)', () => {
    expect(ParserSpecSchema.safeParse({ isJobListing: true, container: 'li', fields: { title: { selector: 'h2', attr: 'onclick=alert(1)' } } }).success).toBe(false);
    expect(ParserSpecSchema.safeParse({ isJobListing: true, container: 'x'.repeat(301) }).success).toBe(false);
    expect(ParserSpecSchema.safeParse('require("child_process")').success).toBe(false);
  });
});

describe('getStructuralFingerprint', () => {
  it('ignores text content but not structure', () => {
    const a = getStructuralFingerprint('<div class="a"><p>one</p></div>');
    const b = getStructuralFingerprint('<div class="a"><p>two</p></div>');
    const c = getStructuralFingerprint('<div class="b"><p>one</p></div>');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
