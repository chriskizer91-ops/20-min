// Keyboard: arrow keys or WASD to walk, Space, Enter or E to talk and to turn the page.
export function createKeys(onAction) {
  const down = new Set();
  const map = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  };
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('button, input, textarea')) return;
    const dir = map[e.code];
    if (dir) { down.add(dir); e.preventDefault(); onAction('move'); }
    else if (['Space', 'Enter', 'KeyE', 'NumpadEnter'].includes(e.code)) { if (!e.repeat) onAction('act'); e.preventDefault(); }
    else if (e.code === 'Escape') onAction('back');
    else if (e.code === 'KeyB') onAction('backstage');
    else if (e.code === 'KeyL') onAction('layers');
  });
  addEventListener('keyup', (e) => { const dir = map[e.code]; if (dir) down.delete(dir); });
  addEventListener('blur', () => down.clear());
  return {
    // A direction in world space: up the painting is -z, right is +x.
    vector() {
      const x = (down.has('right') ? 1 : 0) - (down.has('left') ? 1 : 0);
      const z = (down.has('down') ? 1 : 0) - (down.has('up') ? 1 : 0);
      const len = Math.hypot(x, z);
      return len ? { x: x / len, z: z / len } : null;
    },
    clear() { down.clear(); },
  };
}
