// Router oparty na hashu. Każdy ekran eksportuje własną tablicę `routes` ([wyrażenie, funkcja]),
// a app.js je tylko scala. Pierwsze pasujące wyrażenie wygrywa – dlatego `matches` służy w testach
// do wykrywania tras, które się zasłaniają.

/** Wszystkie trasy, których wyrażenie pasuje do hasha (powinna być dokładnie jedna). */
export const matches = (routes, hash) => routes.filter(([re]) => re.test(hash));

/** Zwraca { render } z wynikiem funkcji trasy albo null, gdy żadna trasa nie pasuje. */
export function resolve(routes, hash) {
  for (const [re, fn] of routes) {
    const m = hash.match(re);
    if (m) return { node: fn(...m.slice(1)) };
  }
  return null;
}
