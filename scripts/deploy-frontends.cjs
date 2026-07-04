const { execSync } = require('child_process');
const { resolve } = require('path');

const root = resolve(__dirname, '..');
const apiUrl = 'https://suv-shaxar-api.vercel.app/api';

const apps = [
  {
    dir: 'apps/portal',
    project: 'suv-shaxar-portal',
    env: {
      VITE_OBODON_URL: 'https://suv-shaxar-obodon.vercel.app/login',
      VITE_HOKIMIYAT_URL: 'https://suv-shaxar-hokimiyat.vercel.app/login',
    },
  },
  {
    dir: 'apps/operator',
    project: 'suv-shaxar-obodon',
    env: {
      VITE_API_URL: apiUrl,
    },
  },
  {
    dir: 'apps/monitoring',
    project: 'suv-shaxar-hokimiyat',
    env: {
      VITE_API_URL: apiUrl,
    },
  },
];

for (const app of apps) {
  const cwd = resolve(root, app.dir);
  console.log(`\n=== ${app.project} ===`);

  try {
    execSync(`npx vercel link --yes --project ${app.project}`, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });
  } catch {
    console.log(`Link skipped or failed for ${app.project}, continuing...`);
  }

  for (const [name, value] of Object.entries(app.env)) {
    console.log(`Setting ${name}...`);
    execSync(
      `npx vercel env add ${name} production --value ${JSON.stringify(value)} --yes --force`,
      { cwd, stdio: 'inherit', shell: true },
    );
  }

  console.log('Deploying...');
  execSync('npx vercel --prod --yes', { cwd, stdio: 'inherit', shell: true });
}

console.log('\nAll frontends deployed.');
