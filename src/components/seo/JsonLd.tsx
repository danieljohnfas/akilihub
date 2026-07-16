/**
 * JsonLd — renders a <script type="application/ld+json"> tag.
 * Usage: <JsonLd schema={buildJobPostingSchema(job)} />
 */
export function JsonLd({ schema }: { schema: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
