// Ekran ustawień: rozmiar czcionki, data sprawdzianu, eksport/import postępu, reset

import { h } from './dom.js';
import * as store from './store.js';

export function renderSettings({ version, onChange }) {
  const status = h('div', { class: 'status', role: 'status', 'aria-live': 'polite' });
  const say = (msg) => status.replaceChildren(msg);

  // --- rozmiar czcionki ---
  const sizes = [['s', 'Mała'], ['m', 'Średnia'], ['l', 'Duża']];
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Rozmiar czcionki' });
  const paintSeg = () => {
    seg.replaceChildren(
      ...sizes.map(([k, label]) =>
        h(
          'button',
          {
            type: 'button',
            'aria-pressed': String(store.get().settings.fontScale === k),
            onClick: () => {
              store.update((s) => (s.settings.fontScale = k));
              onChange();
              paintSeg();
            },
          },
          label
        )
      )
    );
  };
  paintSeg();

  // --- data sprawdzianu ---
  const date = h('input', { type: 'date', id: 'exam-date', value: store.get().settings.examDate || '' });
  date.addEventListener('change', () => {
    store.update((s) => (s.settings.examDate = date.value));
    onChange();
    say('Zapisano datę sprawdzianu.');
  });

  // --- eksport ---
  const doExport = async () => {
    const text = store.exportJson();
    const name = `chemia8-postep-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([text], name, { type: 'application/json' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Postęp – Chemia 8' });
        say('Gotowe. Zapisz plik np. w aplikacji Pliki lub wyślij go sobie.');
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    const url = URL.createObjectURL(file);
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    say('Plik z postępem został pobrany.');
  };

  // --- import ---
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', id: 'import-file', 'aria-label': 'Wybierz plik z postępem' });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const res = store.importJson(await f.text());
    say(res.message);
    if (res.ok) onChange();
  });

  // --- reset (dwustopniowy, bez okien dialogowych) ---
  const resetBtn = h('button', { class: 'btn danger', type: 'button' }, 'Wyzeruj postęp');
  let armed = false;
  resetBtn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      resetBtn.textContent = 'Na pewno? Stuknij jeszcze raz';
      setTimeout(() => {
        armed = false;
        resetBtn.textContent = 'Wyzeruj postęp';
      }, 5000);
      return;
    }
    store.reset();
    armed = false;
    resetBtn.textContent = 'Wyzeruj postęp';
    onChange();
    say('Postęp wyzerowany.');
  });

  // --- odświeżenie aplikacji (czyści cache offline) ---
  const refresh = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith('chemia8-')).map((k) => caches.delete(k)));
      }
    } catch (e) {
      /* ignoruj */
    }
    location.reload();
  };

  const persistLine = h('p', { class: 'muted' }, 'Sprawdzam, czy dane są chronione…');
  store.requestPersist().then((ok) => {
    persistLine.textContent =
      ok === true
        ? 'Przeglądarka obiecała nie kasować postępu automatycznie. Mimo to warto czasem zrobić eksport.'
        : store.isMemoryOnly()
          ? 'Uwaga: ta przeglądarka nie pozwala zapisywać danych. Postęp zniknie po zamknięciu aplikacji.'
          : 'Safari może wyczyścić dane aplikacji, gdy długo nie jest używana. Zrób eksport postępu przed większą przerwą.';
  });

  return h(
    'div',
    null,
    h('a', { class: 'back', href: '#/' }, '← Wróć'),
    h('h1', null, 'Ustawienia'),
    h('section', { class: 'card' }, h('h2', null, 'Rozmiar czcionki'), seg),
    h('section', { class: 'card' }, h('h2', null, 'Data sprawdzianu'), h('label', { for: 'exam-date', class: 'muted' }, 'Pokaże się licznik dni na górze ekranu.'), h('div', { style: 'margin-top:.5rem' }, date)),
    h(
      'section',
      { class: 'card' },
      h('h2', null, 'Kopia postępu'),
      persistLine,
      h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'button', onClick: doExport }, 'Eksportuj postęp')),
      h('p', { class: 'muted', style: 'margin-top:1rem' }, 'Wczytaj wcześniej zapisany plik:'),
      fileInput,
      status
    ),
    h('section', { class: 'card' }, h('h2', null, 'Zaawansowane'), h('div', { class: 'btn-row' }, resetBtn, h('button', { class: 'btn quiet', type: 'button', onClick: refresh }, 'Odśwież aplikację (wyczyść pamięć offline)'))),
    h('p', { class: 'muted' }, `Wersja ${version}`)
  );
}
