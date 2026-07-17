import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const url = process.env.DATABASE_URL!;
const sql = postgres(url.includes('sslmode=require') ? url : url + '?sslmode=require', { max: 1 });

async function main() {
  console.log('Setting up Supabase Auth Trigger...');

  // Create the trigger function
  await sql.unsafe(`
    create or replace function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer set search_path = public
    as $$
    begin
      insert into public.users (id, email, full_name)
      values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name'
      );
      return new;
    end;
    $$;
  `);
  console.log('Function public.handle_new_user created');

  // Drop existing trigger if it exists
  await sql.unsafe(`
    drop trigger if exists on_auth_user_created on auth.users;
  `);

  // Create the trigger
  await sql.unsafe(`
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  `);
  console.log('Trigger on_auth_user_created created');

  console.log('Auth Trigger Setup Complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Setup failed!', err);
  process.exit(1);
});
