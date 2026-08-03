import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL is required');
}
const sql = postgres(connectionString);

async function fixSecurity() {
  const tables = [
    'business_types', 'compliance_requirements', 'health_data_points', 
    'health_indicators', 'employers', 'job_categories', 'countries', 
    'districts', 'tenders', 'regions', 'tender_sectors', 
    'salary_submissions', 'users', 'user_alerts'
  ];
  
  for (const table of tables) {
    console.log(`Enabling RLS on ${table}...`);
    await sql.unsafe(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
  }
  
  console.log('Revoking EXECUTE from SECURITY DEFINER functions...');
  await sql.unsafe(`REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;`);
  await sql.unsafe(`REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;`);
  await sql.unsafe(`REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM public;`);
  await sql.unsafe(`REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;`);

  console.log('Finding and indexing unindexed foreign keys...');
  const fks = await sql`
    SELECT 
        c.conrelid::regclass::text AS table_name,
        a.attname AS column_name
    FROM pg_constraint c 
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.contype = 'f' 
      AND c.connamespace = 'public'::regnamespace
      AND NOT EXISTS (
          SELECT 1 
          FROM pg_index i 
          WHERE i.indrelid = c.conrelid 
            AND a.attnum = ANY(i.indkey)
      );
  `;

  for (const fk of fks) {
    const cleanTable = fk.table_name.replace('public.', '').replace(/"/g, '');
    const idxName = `${cleanTable}_${fk.column_name}_idx`;
    console.log(`Creating index ${idxName} on ${cleanTable} (${fk.column_name})...`);
    try {
      await sql.unsafe(`CREATE INDEX IF NOT EXISTS "${idxName}" ON public."${cleanTable}" ("${fk.column_name}");`);
    } catch (e: any) {
      console.warn(`Could not create index ${idxName}:`, e.message);
    }
  }

  const unused = [
    'compliance_type_idx',
    'compliance_business_type_idx',
    'compliance_is_mandatory_idx',
    'tenders_sector_id_idx',
    'tenders_deadline_idx',
    'tenders_status_idx',
    'salary_submissions_category_id_idx',
    'jobs_location_idx',
    'jobs_status_idx'
  ];

  for (const idx of unused) {
    console.log(`Dropping unused index ${idx}...`);
    try {
      await sql.unsafe(`DROP INDEX IF EXISTS public."${idx}";`);
    } catch (e: any) {
      console.warn(`Could not drop index ${idx}:`, e.message);
    }
  }

  console.log('All security fixes applied!');
  process.exit(0);
}
fixSecurity().catch(console.error);
