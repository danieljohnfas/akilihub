-- Deduplicate tenders: for each group of (title, contracting_authority, country_id),
-- keep the row with the longest description (richest data), delete the rest.
DELETE FROM "tenders"
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY title, contracting_authority, country_id
        ORDER BY length(coalesce(description, '')) DESC, created_at ASC
      ) AS rn
    FROM "tenders"
  ) ranked
  WHERE rn > 1
);

-- Add composite unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS "tenders_title_authority_country_udx"
  ON "tenders" USING btree ("title", "contracting_authority", "country_id");