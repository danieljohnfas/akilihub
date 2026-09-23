import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));

const { TypeSafeClient, choice, noul } = require('@typesafe-ai/sdk');
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const client = new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY.trim() });

async function diagnoseFile(file) {
  const content = readFileSync(join(projectRoot, '.github/workflows', file), 'utf-8');
  console.log(`\nDiagnosing ${file}:`);

  const result = await client.systemOne({
    state: `WORKFLOW: ${file}\n\n${content}`,
    questions: {
      dummyDbUrlProblem: noul(
        'Does this workflow use placeholder / dummy database credentials or environment variables that will cause build failure in a real Next.js environment?',
        { true: 'Yes, dummy credentials will cause connection or build failures', false: 'No, env is handled fine' }
      ),
      githubTokenPermissionProblem: noul(
        'Does the workflow have an issue with GITHUB_TOKEN permissions or default token write permissions?',
        { true: 'Yes, default GITHUB_TOKEN may not have write permissions or may trigger infinite loop', false: 'No, permissions are fine' }
      ),
      missingSecretsProblem: noul(
        'Is the workflow missing critical production repository secrets?',
        { true: 'Yes, some secrets are missing from GitHub secrets', false: 'No, secrets are sufficient' }
      ),
      syntaxOrStructureProblem: noul(
        'Does the YAML have syntax, schema, or structural flaws?',
        { true: 'Yes, YAML has structural issues', false: 'No, valid YAML syntax' }
      ),
      specificDefect: choice(
        'What is the single most critical flaw in this workflow?',
        {
          ci_dummy_secrets: 'Dummy or invalid secrets provided that prevent Next.js from building statically',
          github_token_write_perms: 'GITHUB_TOKEN lacks permissions or needs explicit contents: write permissions or PAT to push',
          infinite_loop_trigger: 'git push back to repository will trigger the workflow recursively in an infinite loop',
          unhandled_failure: 'Steps using continue-on-error swallow genuine crashes or failure conditions',
          flawless: 'Workflow has no significant flaws',
        }
      ),
    }
  });

  console.log(`  dummyDbUrlProblem: ${(result.answers.dummyDbUrlProblem?.noul * 100).toFixed(0)}%`);
  console.log(`  githubTokenPermissionProblem: ${(result.answers.githubTokenPermissionProblem?.noul * 100).toFixed(0)}%`);
  console.log(`  missingSecretsProblem: ${(result.answers.missingSecretsProblem?.noul * 100).toFixed(0)}%`);
  console.log(`  syntaxOrStructureProblem: ${(result.answers.syntaxOrStructureProblem?.noul * 100).toFixed(0)}%`);
  console.log(`  specificDefect: ${result.answers.specificDefect?.choice}`);
}

async function main() {
  for (const f of ['ci.yml', 'mass-scrape.yml', 'targeted-scrape.yml', 'data-cleanup-report.yml']) {
    await diagnoseFile(f);
  }
}

main().catch(console.error);
