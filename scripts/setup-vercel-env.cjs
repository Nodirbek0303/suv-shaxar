const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const envPath = resolve(__dirname, '../.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const apiDir = resolve(__dirname, '../apps/api');
const vars = {
  DATABASE_URL: env.DATABASE_URL,
  JWT_SECRET: env.JWT_SECRET,
  JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
  DISABLE_BACKGROUND_SERVICES: 'true',
  CORS_ORIGINS:
    'https://suv-shaxar-portal.vercel.app,https://suv-shaxar-obodon.vercel.app,https://suv-shaxar-hokimiyat.vercel.app',
};

for (const [name, value] of Object.entries(vars)) {
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  console.log(`Setting ${name}...`);
  execSync(
    `npx vercel env add ${name} production --value ${JSON.stringify(value)} --yes --force --sensitive`,
    { cwd: apiDir, stdio: 'inherit', shell: true },
  );
}

console.log('Done. Deploying...');
execSync('npx vercel --prod --yes', { cwd: apiDir, stdio: 'inherit', shell: true });
