// Generuje pliki zależne od wersji i listy plików:
//   js/version.js  – APP_VERSION (źródło prawdy: "version" w package.json)
//   sw.js          – VERSION oraz lista ASSETS (między znacznikami GENERATED)
//
// Użycie:
//   node tools/build.js                 – zapisuje zmiany
//   node tools/build.js --check         – tylko sprawdza, czy pliki są aktualne (kod wyjścia 1, jeśli nie)
//   node tools/build.js --bump patch    – podbija wersję (patch | minor | major) i buduje

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'package.json');
const swPath = join(root, 'sw.js');
const versionPath = join(root, 'js', 'version.js');

const BEGIN = '  // BEGIN GENERATED ASSETS (node tools/build.js)';
const END = '  // END GENERATED ASSETS';

/** Pliki, które muszą być dostępne offline. */
export function listAssets() {
  const out = ['./', 'index.html', 'manifest.webmanifest'];
  const walk = (dir, test) => {
    const abs = join(root, dir);
    if (!existsSync(abs)) return;
    for (const name of readdirSync(abs).sort()) {
      const p = join(abs, name);
      const rel = relative(root, p).split('\\').join('/');
      if (statSync(p).isDirectory()) walk(rel, test);
      else if (test(rel)) out.push(rel);
    }
  };
  walk('css', (f) => f.endsWith('.css'));
  walk('js', (f) => f.endsWith('.js'));
  if (!out.includes('js/version.js')) out.splice(out.indexOf('js/app.js') + 1, 0, 'js/version.js'); // powstaje przy pierwszym buildzie
  walk('data', (f) => f.endsWith('.json') && !f.endsWith('ids.lock.json'));
  walk('icons', (f) => f.endsWith('.png'));
  return out;
}

export const readVersion = () => JSON.parse(readFileSync(pkgPath, 'utf8')).version;

export function bumpVersion(kind) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const [a, b, c] = pkg.version.split('.').map(Number);
  pkg.version = kind === 'major' ? `${a + 1}.0.0` : kind === 'minor' ? `${a}.${b + 1}.0` : `${a}.${b}.${c + 1}`;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  return pkg.version;
}

/** Oczekiwana zawartość plików generowanych: { 'js/version.js': tekst, 'sw.js': tekst }. */
export function expectedFiles() {
  const version = readVersion();
  const versionJs = `// PLIK GENEROWANY przez tools/build.js – nie edytuj. Wersję zmieniaj w package.json (npm run bump).\nexport const APP_VERSION = '${version}';\n`;

  let sw = readFileSync(swPath, 'utf8');
  const i = sw.indexOf(BEGIN);
  const j = sw.indexOf(END);
  if (i < 0 || j < i) throw new Error('sw.js: brak znaczników BEGIN/END GENERATED ASSETS');
  const list = listAssets().map((f) => `  '${f}',`).join('\n');
  sw = sw.slice(0, i) + BEGIN + '\n' + list + '\n' + sw.slice(j);
  sw = sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
  return { 'js/version.js': versionJs, 'sw.js': sw };
}

/** Zwraca listę plików, które nie są aktualne. */
export function staleFiles() {
  const stale = [];
  for (const [rel, text] of Object.entries(expectedFiles())) {
    const p = join(root, rel);
    if (!existsSync(p) || readFileSync(p, 'utf8') !== text) stale.push(rel);
  }
  return stale;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const bump = args.indexOf('--bump');
  if (bump >= 0) {
    const kind = args[bump + 1] || 'patch';
    if (!['patch', 'minor', 'major'].includes(kind)) {
      console.error('--bump: patch | minor | major');
      process.exit(1);
    }
    console.log(`Wersja: ${bumpVersion(kind)}`);
  }
  if (args.includes('--check')) {
    const stale = staleFiles();
    if (stale.length) {
      console.error(`Nieaktualne pliki generowane: ${stale.join(', ')}. Uruchom: npm run build`);
      process.exit(1);
    }
    console.log('Pliki generowane aktualne.');
  } else {
    for (const [rel, text] of Object.entries(expectedFiles())) writeFileSync(join(root, rel), text);
    console.log(`Zbudowano (wersja ${readVersion()}, ${listAssets().length} plików w cache).`);
  }
}
