/*
 * Lists what the app is built from (for the "About" page): the runtime
 * dependencies of package.json plus the build-time packages whose output ships
 * with the app, each with the installed version and its license, and the
 * bundled assets (fonts). Written to src/app/pwa/dependencies.json.
 *
 * Runs after `npm install` and before every start, build, test and typecheck,
 * so the page follows the installed libraries. The output is deterministic.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'src', 'app', 'pwa', 'dependencies.json');

/** Dev dependencies whose output ends up in the shipped app. */
const SHIPPED_BUILD_PACKAGES = ['tailwindcss'];

/** Assets bundled in `src/fonts`, which have no package to read a version from. */
const ASSETS = [
  { name: 'DM Sans', license: 'OFL-1.1' },
  { name: 'Material Design Icons', license: 'Apache-2.0' },
];

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function licenseOf(manifest) {
  const { license, licenses } = manifest;
  if (typeof license === 'string') return license;
  if (license && typeof license.type === 'string') return license.type;
  if (Array.isArray(licenses)) return licenses.map((item) => item.type).filter(Boolean).join(' OR ');
  return '';
}

const manifest = readJson(join(root, 'package.json'));
const names = [...new Set([...Object.keys(manifest.dependencies ?? {}), ...SHIPPED_BUILD_PACKAGES])].sort();

const dependencies = names.map((name) => {
  const path = join(root, 'node_modules', ...name.split('/'), 'package.json');
  if (!existsSync(path)) throw new Error(`${name} is not installed: run npm install first.`);
  const installed = readJson(path);
  return { name, version: installed.version, license: licenseOf(installed) };
});

const content = `${JSON.stringify({ dependencies, assets: ASSETS }, null, 2)}\n`;
if (!existsSync(output) || readFileSync(output, 'utf8') !== content) writeFileSync(output, content);
