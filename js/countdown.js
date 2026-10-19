// Odliczanie do sprawdzianu (data z ustawień).

import * as store from './store.js';

export function countInfo() {
  const iso = store.get().settings.examDate;
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const exam = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((exam - today) / 86400000);
  if (days < 0) return null;
  return {
    days,
    weekday: exam.toLocaleDateString('pl-PL', { weekday: 'long' }),
    full: exam.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

export const plDays = (n) => (n === 1 ? 'dzień' : 'dni');

export function updateCountdown() {
  const el = document.getElementById('countdown');
  const c = countInfo();
  el.textContent = !c ? '' : c.days === 0 ? 'Sprawdzian dzisiaj' : c.days === 1 ? `Sprawdzian jutro · ${c.weekday}` : `Sprawdzian za ${c.days} ${plDays(c.days)} · ${c.weekday}`;
}
