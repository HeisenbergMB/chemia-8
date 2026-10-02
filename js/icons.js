// Ikony liniowe (inline SVG) – bez emoji, spójny styl

const p = (d) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;

export const icons = {
  flask: p('<path d="M9 3h6M10 3v6.2L4.6 18.4A2 2 0 0 0 6.3 21.4h11.4a2 2 0 0 0 1.7-3L14 9.2V3"/><path d="M7.5 15h9"/>'),
  gear: p('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  play: p('<path d="M7 4.5v15l12-7.5z"/>'),
  book: p('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8 7h8"/>'),
  cards: p('<rect x="3" y="7" width="14" height="13" rx="2"/><path d="M7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/>'),
  check: p('<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8L16 9.5"/>'),
  list: p('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'),
};

/** Przycisk/odnośnik: ikona + tekst */
export const withIcon = (name, label) => `${icons[name] || ''}<span>${label}</span>`;
