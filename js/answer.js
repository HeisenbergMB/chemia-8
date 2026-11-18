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

const CONTRACTION = /(n't|'ll|'ve|'re|'d|'m)\b/gi;

/** Liczba wyrazów jak w poleceniu „maksymalnie pięć wyrazów, wliczając skrócone”: skrócenie (n't, 'll…) liczy się jako osobny wyraz. */
export function wordCount(s) {
  const t = normalizeAnswer(s);
  if (!t) return 0;
  return t.split(' ').length + (t.match(CONTRACTION) || []).length;
}

/** Czy wyraz kluczowy występuje w odpowiedzi w niezmienionej formie (jako osobny wyraz). */
export function containsWord(answer, word) {
  const re = new RegExp(`(^|[^\\p{L}'])${normalizeAnswer(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}'])`, 'u');
  return re.test(normalizeAnswer(answer));
}
