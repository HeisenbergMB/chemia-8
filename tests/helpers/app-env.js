// Uruchamia prawdziwą aplikację (js/app.js) w jsdom, z danymi z dysku – bez przeglądarki.
// Użycie: const app = await bootApp(); await app.goto('#/module/x'); app.main.textContent …
// Uwaga: app.js jest singletonem modułu, więc jeden `bootApp()` na plik testowy.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Generator liczb pseudolosowych (mulberry32) – do powtarzalnych zrzutów ekranów. */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function bootApp({ hash = '#/' } = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push(`jsdomError: ${e.message}`));
  vc.on('error', (...a) => errors.push(`console.error: ${a.join(' ')}`));
  const html = readFileSync(join(root, 'index.html'), 'utf8').replace(/<script[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, { url: 'http://localhost/' + hash, pretendToBeVisual: true, virtualConsole: vc });
  const { window } = dom;
  window.scrollTo = () => {};
  window.Element.prototype.scrollIntoView = function () {};
  window.addEventListener('error', (e) => errors.push(`error: ${e.message}`));

  for (const k of ['window', 'document', 'location', 'localStorage', 'navigator']) {
    Object.defineProperty(globalThis, k, { value: window[k], configurable: true, writable: true });
  }
  for (const k of ['File', 'HTMLElement', 'Node', 'CustomEvent']) globalThis[k] = window[k];
  globalThis.fetch = async (path) => {
    try {
      const text = readFileSync(join(root, String(path)), 'utf8');
      return { ok: true, status: 200, json: async () => JSON.parse(text), text: async () => text };
    } catch {
      return { ok: false, status: 404 };
    }
  };

  await import('../../js/app.js');
  for (let i = 0; i < 100 && window.document.querySelector('#main .loading'); i++) await sleep(10);
  await sleep(20);

  const main = window.document.getElementById('main');
  const side = window.document.getElementById('side');

  /** Przechodzi pod hash i zwraca końcowy hash (router przekierowuje nieznane adresy na #/). */
  async function goto(target) {
    if (window.location.hash !== target) {
      const changed = new Promise((res) => window.addEventListener('hashchange', res, { once: true }));
      window.location.hash = target;
      await changed;
    } else {
      window.dispatchEvent(new window.HashChangeEvent('hashchange'));
    }
    await sleep(15);
    return window.location.hash;
  }

  const links = (scope) => [...scope.querySelectorAll('a[href^="#/"]')].map((a) => a.getAttribute('href'));
  return { window, document: window.document, main, side, errors, goto, links: () => [...new Set([...links(main), ...links(side)])] };
}
