const { execSync } = require('child_process');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const buildArgs = [];

for (const line of envLocal.split('\n')) {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=');
    if (key.trim()) {
      buildArgs.push(`--build-arg ${key.trim()}="${value.trim()}"`);
    }
  }
}

const buildCmd = `docker build --platform linux/amd64 ${buildArgs.join(' ')} -t akilibrain-web -f Dockerfile .`;
console.log("Running:", buildCmd.replace(/"[^"]+"/g, '"***"')); // hide secrets in log

try {
  execSync(buildCmd, { stdio: 'inherit' });
  console.log("Build successful! Saving to tar...");
  execSync(`docker save akilibrain-web -o akilibrain.tar`, { stdio: 'inherit' });
  console.log("Saved to akilibrain.tar");
} catch (e) {
  console.error("Failed:", e.message);
  process.exit(1);
}
