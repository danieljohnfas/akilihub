const fs = require('fs');
require('dotenv').config({path: '.env.local'});

const cmds = [
  `vercel env add NEXT_PUBLIC_SUPABASE_URL production --type config --value "${process.env.NEXT_PUBLIC_SUPABASE_URL}" --yes --force`,
  `vercel env add DATABASE_URL production --type secret --value "${process.env.DATABASE_URL}" --yes --force`,
  `vercel env add DIRECT_URL production --type secret --value "${process.env.DIRECT_URL}" --yes --force`,
  `vercel env add SUPABASE_SERVICE_ROLE_KEY production --type secret --value "${process.env.SUPABASE_SERVICE_ROLE_KEY}" --yes --force`,
  `vercel env add TYPESAFE_API_KEY production --type secret --value "${process.env.TYPESAFE_API_KEY}" --yes --force`,
  `vercel --prod --yes`
];

fs.writeFileSync('scripts/tmp-vercel-deploy.ps1', cmds.join('\n'));
