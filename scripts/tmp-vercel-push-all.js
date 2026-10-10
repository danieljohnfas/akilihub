require('dotenv').config({path: '.env.local'});
const { execSync } = require('child_process');

try {
  console.log("Pushing NEXT_PUBLIC_SUPABASE_ANON_KEY...");
  execSync(`vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --type config --value "${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}" --yes --force`, {stdio: 'inherit'});
  
  console.log("Pushing NEXT_PUBLIC_SUPABASE_URL...");
  execSync(`vercel env add NEXT_PUBLIC_SUPABASE_URL production --type config --value "${process.env.NEXT_PUBLIC_SUPABASE_URL}" --yes --force`, {stdio: 'inherit'});
  
  console.log("Pushing DATABASE_URL...");
  execSync(`vercel env add DATABASE_URL production --type secret --value "${process.env.DATABASE_URL}" --yes --force`, {stdio: 'inherit'});
  
  console.log("Pushing DIRECT_URL...");
  execSync(`vercel env add DIRECT_URL production --type secret --value "${process.env.DIRECT_URL}" --yes --force`, {stdio: 'inherit'});
  
  console.log("Pushing SUPABASE_SERVICE_ROLE_KEY...");
  execSync(`vercel env add SUPABASE_SERVICE_ROLE_KEY production --type secret --value "${process.env.SUPABASE_SERVICE_ROLE_KEY}" --yes --force`, {stdio: 'inherit'});
  
  console.log("Pushing TYPESAFE_API_KEY...");
  execSync(`vercel env add TYPESAFE_API_KEY production --type secret --value "${process.env.TYPESAFE_API_KEY}" --yes --force`, {stdio: 'inherit'});
  
  console.log("Triggering Vercel deployment...");
  // Now deploy to production
  execSync('vercel --prod --yes', {stdio: 'inherit'});
  
  console.log("Done!");
} catch (e) {
  console.error("Script Error:", e.message);
}
