// input.js — keyboard and mouse state for Shadow Lantern.
// The game reads movement from WASD / arrow keys, Shift to sneak or run,
// E to interact, Space to distract (throw a pebble), M to mute, P pause.
// The mouse aims the pebble throw and clicks menu buttons.
// Revision: mouse coordinates are stored in canvas backing-store pixels
// and converted to view coordinates by main.js, so the game still clicks
// correctly on high-DPI screens.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, clicked: false, down: false };

  function keyName(event) {
    const k = event.key;
    if (k === ' ') return 'Space';
    return k.length === 1 ? k.toLowerCase() : k;
  }

  window.addEventListener('keydown', (event) => {
    const k = keyName(event);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(keyName(event));
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', (event) => {
    mouse.down = true;
    mouse.clicked = true;
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
    event.preventDefault();
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });

  return {
    keys,
    mouse,
    // True while the key is held down.
    down(name) {
      return keys.has(name);
    },
    // True only on the frame the key was first pressed.
    wasPressed(name) {
      return pressed.has(name);
    },
    // Movement vector from WASD / arrows, normalised.
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.sqrt(2);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    // Clear the one-frame press set at the end of each frame.
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
