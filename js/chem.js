// Czysta logika chemiczna (bez DOM) – używana przez aplikację i przez tools/check-data.js

const SYMBOLS = new Set((
  'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr ' +
  'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu ' +
  'Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr'
).split(' '));

/** Wzór (np. "Ca(OH)2", "Ca^2+", "OH^-") -> { atoms, charge } */
export function parseFormula(input) {
  let f = input.trim();
  let charge = 0;
  const m = f.match(/\^(\d*)([+-])$/);
  if (m) {
    charge = (m[1] ? Number(m[1]) : 1) * (m[2] === '+' ? 1 : -1);
    f = f.slice(0, m.index);
  }
  if (!f) throw new Error(`pusty wzór w "${input}"`);
  let i = 0;
  const num = () => {
    let s = '';
    while (i < f.length && /\d/.test(f[i])) s += f[i++];
    return s ? Number(s) : 1;
  };
  const group = () => {
    const atoms = {};
    while (i < f.length) {
      const c = f[i];
      if (c === '(') {
        i++;
        const inner = group();
        if (f[i] !== ')') throw new Error(`brak ")" w "${input}"`);
        i++;
        const n = num();
        for (const k in inner) atoms[k] = (atoms[k] || 0) + inner[k] * n;
      } else if (c === ')') {
        return atoms;
      } else if (/[A-Z]/.test(c)) {
        let el = c;
        i++;
        while (i < f.length && /[a-z]/.test(f[i])) el += f[i++];
        if (!SYMBOLS.has(el)) throw new Error(`nieznany pierwiastek "${el}" w "${input}"`);
        atoms[el] = (atoms[el] || 0) + num();
      } else {
        throw new Error(`nieoczekiwany znak "${c}" w "${input}"`);
      }
    }
    return atoms;
  };
  const atoms = group();
  if (i < f.length) throw new Error(`nadmiarowy nawias w "${input}"`);
  return { atoms, charge };
}

/** "2NaOH↑" -> { coef: 2, formula: "NaOH", mark: "↑" } */
export function parseSpecies(token) {
  const m = token.trim().match(/^(\d+)?\s*([A-Z(].*?)\s*([↑↓])?$/);
  if (!m) throw new Error(`nie rozumiem składnika "${token}"`);
  return { coef: m[1] ? Number(m[1]) : 1, formula: m[2], mark: m[3] || '' };
}

/** "2Na + 2H2O -> 2NaOH + H2↑" -> { left: [...], right: [...] } */
export function parseEquation(str) {
  const parts = str.split(/\s*(?:->|→)\s*/);
  if (parts.length !== 2) throw new Error(`równanie musi mieć dokładnie jedną strzałkę: "${str}"`);
  const side = (s) => s.trim().split(/\s\+\s/).map(parseSpecies);
  return { left: side(parts[0]), right: side(parts[1]) };
}

function totals(species) {
  const atoms = {};
  let charge = 0;
  for (const sp of species) {
    const { atoms: a, charge: c } = parseFormula(sp.formula);
    for (const k in a) atoms[k] = (atoms[k] || 0) + a[k] * sp.coef;
    charge += c * sp.coef;
  }
  return { atoms, charge };
}

/** Sprawdza bilans atomów i ładunków. */
export function checkBalance(eq) {
  const L = totals(eq.left);
  const R = totals(eq.right);
  const diffs = [];
  const keys = new Set([...Object.keys(L.atoms), ...Object.keys(R.atoms)]);
  for (const k of keys) {
    const l = L.atoms[k] || 0;
    const r = R.atoms[k] || 0;
    if (l !== r) diffs.push(`${k}: lewa ${l}, prawa ${r}`);
  }
  if (L.charge !== R.charge) diffs.push(`ładunek: lewa ${L.charge}, prawa ${R.charge}`);
  return { ok: diffs.length === 0, diffs };
}

/** Rozbija tekst na wzory wewnątrz $...$ (np. do walidacji). */
export function extractFormulaSegments(text) {
  const out = [];
  const re = /\$([^$]+)\$/g;
  let m;
  while ((m = re.exec(text))) out.push(m[1]);
  return out;
}
