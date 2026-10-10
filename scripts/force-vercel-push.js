require('dotenv').config({path: '.env.local'});
const { spawn } = require('child_process');

const cmds = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", type: "config", val: process.env.NEXT_PUBLIC_SUPABASE_URL },
  { key: "DATABASE_URL", type: "secret", val: process.env.DATABASE_URL },
  { key: "DIRECT_URL", type: "secret", val: process.env.DIRECT_URL },
  { key: "SUPABASE_SERVICE_ROLE_KEY", type: "secret", val: process.env.SUPABASE_SERVICE_ROLE_KEY },
  { key: "TYPESAFE_API_KEY", type: "secret", val: process.env.TYPESAFE_API_KEY }
];

async function runCmd(cmdStr, searchString) {
  return new Promise((resolve) => {
    console.log(`Running: ${cmdStr}`);
    const parts = cmdStr.split(' ');
    const child = spawn(parts[0], parts.slice(1), { shell: true });
    
    let done = false;
    
    child.stdout.on('data', (data) => {
      const str = data.toString();
      process.stdout.write(str);
      if (str.includes(searchString) && !done) {
        done = true;
        child.kill('SIGKILL');
        resolve();
      }
    });
    
    child.stderr.on('data', (data) => {
      const str = data.toString();
      process.stderr.write(str);
      if (str.includes(searchString) && !done) {
        done = true;
        child.kill('SIGKILL');
        resolve();
      }
    });

    child.on('close', () => {
      if (!done) resolve();
    });
  });
}

async function main() {
  for (const {key, type, val} of cmds) {
    if (!val) continue;
    const cmd = `vercel env add ${key} production --type ${type} --value "${val}" --yes --force`;
    await runCmd(cmd, "Next steps:");
  }
  console.log("Triggering deployment...");
  await runCmd("vercel --prod --yes", "Production:");
  console.log("ALL DONE!");
  process.exit(0);
}

main();
