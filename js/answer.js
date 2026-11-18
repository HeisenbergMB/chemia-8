// Odpowiedzi tekstowe (angielski): normalizacja i porównanie z kluczem. Bez zależności – używane też w narzędziach.
// Zasady jak w kluczach konkursu: pełna poprawność pisowni (łącznie z łącznikami), wielkość liter i spacje nie mają znaczenia.

/** Doprowadza wpisany tekst do postaci porównywalnej: apostrofy typograficzne → ', wielkość liter, spacje, końcowa kropka. */
export function normalizeAnswer(s) {
  return String(s)
    .normalize('NFC')
    .replace(/[‘’ʼ`´]/g, "'") // iPad (inteligentna interpunkcja) wstawia ’
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]+$/, '')
    .trim()
    .toLowerCase();
}

/** Czy wpisany tekst zgadza się z którąkolwiek z akceptowanych odpowiedzi. */
export function matchesAnswer(value, answers) {
  const v = normalizeAnswer(value);
  return v !== '' && answers.some((a) => normalizeAnswer(a) === v);
}

/** Liczba wyrazów jak w poleceniu „maksymalnie pięć wyrazów, wliczając w to wyraz już podany”: skrócenie (hasn't) to jeden wyraz. */
export function wordCount(s) {
  const t = normalizeAnswer(s);
  return t ? t.split(' ').length : 0;
}

/** Czy wyraz kluczowy występuje w odpowiedzi w niezmienionej formie (jako osobny wyraz). */
export function containsWord(answer, word) {
  const re = new RegExp(`(^|[^\\p{L}'])${normalizeAnswer(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}'])`, 'u');
  return re.test(normalizeAnswer(answer));
}
