// Formatowanie wzorów: Ca(OH)2 -> Ca(OH)<sub>2</sub>, Ca^2+ -> Ca<sup>2+</sup>, -> => →

export const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Formatuje pojedynczy zapis chemiczny do HTML. */
export function formatFormula(src) {
  const s = src
    .replace(/<->/g, '⇄')
    .replace(/->/g, '→')
    .replace(/\(v\)/g, '↓');
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '^') {
      const m = s.slice(i).match(/^\^(\d*)([+-])/);
      if (m) {
        out += `<sup>${m[1]}${m[2] === '-' ? '−' : '+'}</sup>`;
        i += m[0].length;
      } else {
        out += '↑';
        i++;
      }
    } else if (/\d/.test(c)) {
      let run = '';
      while (i < s.length && /\d/.test(s[i])) run += s[i++];
      const prev = s[i - run.length - 1];
      out += prev && /[A-Za-z)\]]/.test(prev) ? `<sub>${run}</sub>` : run;
    } else {
      out += escapeHtml(c);
      i++;
    }
  }
  return out;
}

/**
 * Tekst z wzorami: fragmenty w $...$ są formatowane jako wzory,
 * **pogrubienie**, nowa linia -> <br>. Wzór zaczynający się od "!" jest tylko
 * formatowany (znacznik "!" służy skryptowi sprawdzającemu).
 */
export function richText(text) {
  const parts = String(text).split(/(\$[^$]+\$)/g);
  return parts
    .map((p) => {
      if (p.length > 1 && p.startsWith('$') && p.endsWith('$')) {
        let f = p.slice(1, -1);
        if (f.startsWith('!')) f = f.slice(1);
        return `<span class="chem">${formatFormula(f)}</span>`;
      }
      return escapeHtml(p)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    })
    .join('');
}
