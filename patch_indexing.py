import re

with open('scripts/mass-scrape.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace return { ins: r.length, errs: [] }; with indexing call
pattern = re.compile(r'const r = await withDbTimeout\(\s*db\.insert\(jobs\)\.values\(enrichedItems\)\.onConflictDoNothing\(\)\.returning\(\{ id: jobs\.id \}\)\s*\);\s*return \{ ins: r\.length, errs: \[\] \};', re.DOTALL)
replacement = '''const r = await withDbTimeout(
      db.insert(jobs).values(enrichedItems).onConflictDoNothing().returning({ id: jobs.id })
    );
    
    // Call Google Indexing API for newly published jobs
    if (r.length > 0) {
      try {
        const { submitToGoogleIndexing } = await import('../src/lib/seo/indexing');
        const urls = r.map((inserted: any) => `https://akilibrain.com/jobs/${inserted.id}`);
        await submitToGoogleIndexing(urls, 'URL_UPDATED');
      } catch (idxErr) {
        console.error('[Indexing] Failed to submit to Google:', idxErr);
      }
    }
    
    return { ins: r.length, errs: [] };'''

content = pattern.sub(replacement, content, count=1)

with open('scripts/mass-scrape.ts', 'w', encoding='utf-8') as f:
    f.write(content)
