// Wspólne przeciąganie (Pointer Events) dla klocków i dopasowywania.
// Zawsze działa też alternatywa: samo stuknięcie (onTap), a potem stuknięcie miejsca docelowego.

/**
 * opts: { isLocked(), onTap(), onDrop(targetEl), target: '.slot' }
 * Przeciąganie zaczyna się po przesunięciu o >10 px; zwykłe stuknięcie wywołuje onTap.
 */
export function bindDrag(btn, { isLocked = () => false, onTap, onDrop, target = '.slot' }) {
  let pid = null;
  let sx = 0;
  let sy = 0;
  let dragging = false;
  let ghost = null;
  let suppressClick = false;

  const targetAt = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    return el && el.closest ? el.closest(target) : null;
  };
  const highlight = (t) => document.querySelectorAll(target).forEach((el) => el.classList.toggle('hover', el === t));

  btn.addEventListener('pointerdown', (e) => {
    if (isLocked()) return;
    pid = e.pointerId;
    sx = e.clientX;
    sy = e.clientY;
    dragging = false;
    try { btn.setPointerCapture(pid); } catch (err) { /* ignoruj */ }
  });

  btn.addEventListener('pointermove', (e) => {
    if (pid !== e.pointerId) return;
    if (!dragging && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) {
      dragging = true;
      ghost = btn.cloneNode(true);
      ghost.classList.add('ghost');
      ghost.removeAttribute('aria-pressed');
      document.body.append(ghost);
      btn.classList.add('dragging');
    }
    if (dragging) {
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
      highlight(targetAt(e));
    }
  });

  const end = (e) => {
    if (pid !== e.pointerId) return;
    pid = null;
    const was = dragging;
    dragging = false;
    if (ghost) { ghost.remove(); ghost = null; }
    btn.classList.remove('dragging');
    highlight(null);
    if (was) {
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
      if (e.type === 'pointerup') {
        const t = targetAt(e);
        if (t) onDrop(t);
      }
    }
  };
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', end);

  btn.addEventListener('click', () => {
    if (suppressClick || isLocked()) return;
    onTap();
  });
}
