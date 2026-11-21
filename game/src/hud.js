// hud.js — the interface of Shadow Lantern: top bar, detection meter,
// objectives, minimap, and the title / briefing / win / lose screens.
// Everything is drawn on the same canvas as the world.

import { TILE, COLS, ROWS } from './levels.js';
import { VIEW, THEMES } from './render.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function button(ctx, x, y, w, h, label, hover) {
  ctx.fillStyle = hover ? '#3d6b4f' : '#2a4a38';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = '#7fd6a0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = '#e8fff0';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  return { x, y, w, h };
}

export function drawTopBar(ctx, state) {
  const level = state.level;
  const t = THEMES[level.theme] || THEMES.museum;
  ctx.fillStyle = 'rgba(10, 12, 22, 0.92)';
  ctx.fillRect(0, 0, VIEW.width, 64);
  ctx.fillStyle = t.accent;
  ctx.fillRect(0, 62, VIEW.width, 2);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f2f2f2';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(level.name, 24, 24);
  ctx.fillStyle = '#aab4c8';
  ctx.font = '14px monospace';
  ctx.fillText(`Intel ${state.intelTaken}/${level.intelNeeded}   Pebbles ${state.player.pebbles}   Time ${formatTime(state.elapsed)}`, 24, 48);

  // Detection meter: the hottest guard's suspicion, 0..100.
  const meterX = VIEW.width - 340;
  ctx.fillStyle = '#aab4c8';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('DETECTION', meterX, 20);
  ctx.fillStyle = '#222';
  roundRect(ctx, meterX, 30, 220, 14, 7);
  ctx.fill();
  const v = state.maxSuspicion / 100;
  ctx.fillStyle = v >= 1 ? '#ff4444' : v >= 0.35 ? '#ffb13c' : '#ffe98a';
  if (v > 0.02) {
    roundRect(ctx, meterX, 30, Math.max(10, 220 * v), 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = state.alarmActive ? '#ff6666' : '#7fd6a0';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(state.alarmActive ? 'ALARM ACTIVE' : 'ALARM OFF', meterX + 232, 37);

  // Objective line on the right.
  ctx.fillStyle = '#d8e2f2';
  ctx.font = '13px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(state.objectiveText, VIEW.width - 24, 56);
  ctx.textAlign = 'left';
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Minimap in the bottom-right corner: walls, player, guards, intel, exit.
export function drawMinimap(ctx, state) {
  const mw = COLS * 5;
  const mh = ROWS * 5;
  const mx = VIEW.width - mw - 16;
  const my = VIEW.height - mh - 16;
  ctx.fillStyle = 'rgba(8, 10, 18, 0.85)';
  ctx.fillRect(mx - 6, my - 6, mw + 12, mh + 12);
  ctx.strokeStyle = 'rgba(160, 180, 220, 0.5)';
  ctx.strokeRect(mx - 6, my - 6, mw + 12, mh + 12);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (state.grid[y][x] === '#') {
        ctx.fillStyle = '#5a6a86';
        ctx.fillRect(mx + x * 5, my + y * 5, 5, 5);
      } else if (state.grid[y][x] === 'C') {
        ctx.fillStyle = '#7a5a34';
        ctx.fillRect(mx + x * 5, my + y * 5, 5, 5);
      }
    }
  }
  for (const item of state.intel) {
    if (item.taken) continue;
    ctx.fillStyle = '#ffe98a';
    ctx.fillRect(mx + item.tx * 5 + 1, my + item.ty * 5 + 1, 3, 3);
  }
  ctx.fillStyle = '#5cf08a';
  ctx.fillRect(mx + state.exit.tx * 5, my + state.exit.ty * 5, 5, 5);
  for (const guard of state.guards) {
    ctx.fillStyle = guard.alerted ? '#ff4444' : guard.color;
    ctx.beginPath();
    ctx.arc(mx + (guard.x / TILE) * 5, my + (guard.y / TILE) * 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#3ddc84';
  ctx.beginPath();
  ctx.arc(mx + (state.player.x / TILE) * 5, my + (state.player.y / TILE) * 5, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#aab4c8';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('MAP', mx - 2, my - 12);
  return { x: mx, y: my, w: mw, h: mh };
}

export function drawHintBar(ctx, state) {
  ctx.fillStyle = 'rgba(10, 12, 22, 0.85)';
  ctx.fillRect(0, VIEW.height - 28, VIEW.width, 28);
  ctx.fillStyle = '#c8d2e4';
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.hintText, VIEW.width / 2, VIEW.height - 13);
  ctx.textAlign = 'left';
}

export function drawToast(ctx, state) {
  if (!state.toast || state.toastTimer <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, state.toastTimer);
  ctx.fillStyle = 'rgba(10, 14, 24, 0.9)';
  const w = ctx.measureText(state.toast).width + 36;
  roundRect(ctx, (VIEW.width - w) / 2, 78, w, 34, 8);
  ctx.fill();
  ctx.strokeStyle = '#7fd6a0';
  ctx.stroke();
  ctx.fillStyle = '#e8fff0';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.toast, VIEW.width / 2, 96);
  ctx.restore();
  ctx.textAlign = 'left';
}

function dimScreen(ctx, alpha) {
  ctx.fillStyle = `rgba(4, 6, 14, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function centerText(ctx, text, y, font, color) {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, VIEW.width / 2, y);
}

// ---- Full screens ----

export function drawTitleScreen(ctx, state, mouse) {
  dimScreen(ctx, 0.55);
  // Lantern emblem.
  ctx.save();
  ctx.translate(VIEW.width / 2, 150);
  ctx.fillStyle = 'rgba(255, 217, 138, 0.2)';
  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2733';
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  centerText(ctx, 'SHADOW LANTERN', 260, 'bold 64px monospace', '#ffe9a0');
  centerText(ctx, 'Five heists. One lantern. Never be seen.', 310, '20px monospace', '#c8d2e4');
  centerText(ctx, 'WASD / arrows — move    Shift — sneak    Space — throw a pebble    E — interact    M — mute', 360, '16px monospace', '#9fb0c8');
  centerText(ctx, 'Steal the intel, silence the alarms, reach the green EXIT unseen.', 392, '16px monospace', '#9fb0c8');
  centerText(ctx, 'Guards see in cones. Bushes hide you. Shadows slow their suspicion. Pebbles pull them away.', 420, '16px monospace', '#9fb0c8');
  const hover = mouse.x >= VIEW.width / 2 - 130 && mouse.x <= VIEW.width / 2 + 130 && mouse.y >= 470 && mouse.y <= 522;
  const btn = button(ctx, VIEW.width / 2 - 130, 470, 260, 52, 'BEGIN THE FIRST HEIST', hover);
  centerText(ctx, '5 levels  •  25 guards  •  15 intel ledgers  •  4 alarms  •  1 lantern', 560, '14px monospace', '#7d8aa0');
  centerText(ctx, 'An original game built for make.fun — no network, no files leave this folder.', 640, '13px monospace', '#5d6a80');
  return { startButton: btn };
}

export function drawBriefingScreen(ctx, state, mouse) {
  dimScreen(ctx, 0.72);
  const level = state.level;
  centerText(ctx, level.name.toUpperCase(), 150, 'bold 40px monospace', '#ffe9a0');
  centerText(ctx, `Par ${level.par}s  •  ${level.guards.length} guards  •  ${level.intelNeeded} intel  •  ${level.alarms.length} alarm${level.alarms.length === 1 ? '' : 's'}`, 200, '16px monospace', '#c8d2e4');
  wrapText(ctx, level.briefing, VIEW.width / 2 - 320, 250, 640, 24, '17px monospace', '#e8eef8');
  centerText(ctx, 'TIP: ' + level.hint, 380, '15px monospace', '#8fd07a');
  const hover = mouse.x >= VIEW.width / 2 - 110 && mouse.x <= VIEW.width / 2 + 110 && mouse.y >= 430 && mouse.y <= 482;
  const btn = button(ctx, VIEW.width / 2 - 110, 430, 220, 52, 'START HEIST', hover);
  centerText(ctx, 'Click START or press Enter', 520, '14px monospace', '#7d8aa0');
  return { startButton: btn };
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, font, color) {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
  ctx.textAlign = 'left';
}

export function drawLevelClearScreen(ctx, state, mouse) {
  dimScreen(ctx, 0.7);
  centerText(ctx, 'HEIST COMPLETE', 220, 'bold 52px monospace', '#5cf08a');
  centerText(ctx, state.level.name, 280, '22px monospace', '#e8eef8');
  const ghost = state.timesSeen === 0;
  centerText(ctx, `Time ${formatTime(state.elapsed)}   (par ${state.level.par}s)`, 330, '18px monospace', '#c8d2e4');
  centerText(ctx, `Intel ${state.intelTaken}/${state.level.intelNeeded}   •   Spotted ${state.timesSeen} time${state.timesSeen === 1 ? '' : 's'}`, 362, '18px monospace', '#c8d2e4');
  centerText(ctx, ghost ? 'GHOST — never seen once. The lantern burns brighter.' : 'Seen, but never caught. The lantern still burns.', 400, '17px monospace', ghost ? '#ffd98a' : '#9fb0c8');
  const isLast = state.levelIndex >= 4;
  const hover = mouse.x >= VIEW.width / 2 - 130 && mouse.x <= VIEW.width / 2 + 130 && mouse.y >= 450 && mouse.y <= 502;
  const btn = button(ctx, VIEW.width / 2 - 130, 450, 260, 52, isLast ? 'SEE THE FINALE' : 'NEXT HEIST', hover);
  return { nextButton: btn };
}

export function drawCaughtScreen(ctx, state, mouse) {
  dimScreen(ctx, 0.72);
  centerText(ctx, 'SPOTTED!', 220, 'bold 56px monospace', '#ff5555');
  centerText(ctx, `${state.caughtBy || 'A guard'} caught you in the open.`, 290, '20px monospace', '#e8eef8');
  centerText(ctx, 'The lantern flickers out — but a thief always gets another night.', 330, '16px monospace', '#9fb0c8');
  centerText(ctx, `Intel kept: ${state.intelTaken}/${state.level.intelNeeded}   •   Time ${formatTime(state.elapsed)}`, 372, '16px monospace', '#c8d2e4');
  const hover = mouse.x >= VIEW.width / 2 - 110 && mouse.x <= VIEW.width / 2 + 110 && mouse.y >= 430 && mouse.y <= 482;
  const btn = button(ctx, VIEW.width / 2 - 110, 430, 220, 52, 'TRY AGAIN (R)', hover);
  return { retryButton: btn };
}

export function drawWinScreen(ctx, state, mouse) {
  dimScreen(ctx, 0.72);
  centerText(ctx, 'THE LANTERN IS YOURS', 180, 'bold 48px monospace', '#ffd98a');
  centerText(ctx, 'All five heists complete. Five vaults, five museums, five estates —', 240, '18px monospace', '#e8eef8');
  centerText(ctx, 'and not one guard ever laid a hand on Wren.', 272, '18px monospace', '#e8eef8');
  let y = 330;
  state.levelResults.forEach((r) => {
    centerText(ctx, `${r.name} — ${formatTime(r.time)}  •  spotted ${r.spotted}×  ${r.ghost ? '•  GHOST' : ''}`, y, '16px monospace', '#c8d2e4');
    y += 28;
  });
  centerText(ctx, `Total time ${formatTime(state.totalTime)}   •   Ghost heists ${state.levelResults.filter((r) => r.ghost).length}/5`, y + 16, '18px monospace', '#ffe9a0');
  const hover = mouse.x >= VIEW.width / 2 - 110 && mouse.x <= VIEW.width / 2 + 110 && mouse.y >= y + 60 && mouse.y <= y + 112;
  const btn = button(ctx, VIEW.width / 2 - 110, y + 60, 220, 52, 'PLAY AGAIN', hover);
  return { restartButton: btn };
}

export function drawPausedScreen(ctx, state) {
  dimScreen(ctx, 0.6);
  centerText(ctx, 'PAUSED', 300, 'bold 48px monospace', '#e8eef8');
  centerText(ctx, 'Press P to keep sneaking', 360, '18px monospace', '#9fb0c8');
}

// Small "NEAR MISS" flash when a guard's suspicion crosses 80 while the
// player escapes — drawn as a red vignette pulse.
export function drawNearMissFlash(ctx, state) {
  if (!state.nearMissTimer || state.nearMissTimer <= 0) return;
  const a = Math.min(0.35, state.nearMissTimer * 0.3);
  const g = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.3, VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.75);
  g.addColorStop(0, 'rgba(255, 60, 60, 0)');
  g.addColorStop(1, `rgba(255, 60, 60, ${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}
