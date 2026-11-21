// render.js — everything Shadow Lantern draws on the canvas.
// Top-down view: themed floors, walls, bushes and crates you can read at
// a glance, guards with bright vision cones, a lantern-light radius
// around the thief, and a darkness overlay that shows what is safe.

import { TILE, COLS, ROWS } from './levels.js';
import { conePolygon } from './vision.js';

export const VIEW = { width: 1280, height: 720, ox: 120, oy: 84 };

export const THEMES = {
  museum: { floor: '#2e3440', floorAlt: '#343b4a', wall: '#4c566a', wallTop: '#5e6a80', accent: '#d8b25c', glow: '#ffd98a' },
  bank: { floor: '#3a3226', floorAlt: '#423a2c', wall: '#6b5a33', wallTop: '#857144', accent: '#e8c85c', glow: '#ffe9a0' },
  garden: { floor: '#243626', floorAlt: '#2a4030', wall: '#3d5a40', wallTop: '#4d7050', accent: '#8fd07a', glow: '#b8f0a0' },
  harbor: { floor: '#33302e', floorAlt: '#3a3633', wall: '#5c5148', wallTop: '#6e6156', accent: '#d08a4c', glow: '#ffb877' },
  casino: { floor: '#331e33', floorAlt: '#3b233b', wall: '#5e2f5e', wallTop: '#703a70', accent: '#e85ca8', glow: '#ff9ed2' },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawWorld(ctx, state) {
  const { level, grid, theme } = state;
  const t = THEMES[level.theme] || THEMES.museum;
  ctx.save();
  ctx.translate(VIEW.ox, VIEW.oy);

  // Floor: checkerboard tiles with a faint grid.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = grid[y][x];
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = (x + y) % 2 === 0 ? t.floor : t.floorAlt;
      ctx.fillRect(px, py, TILE, TILE);
      if (tile === 'S') {
        ctx.fillStyle = 'rgba(8, 10, 26, 0.5)';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(120, 140, 255, 0.18)';
        ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
      }
      if (tile === 'B') {
        ctx.fillStyle = '#1d4d24';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#2c6b32';
        for (let i = 0; i < 5; i++) {
          const bx = px + 6 + ((i * 7 + y * 3) % 28);
          const by = py + 6 + ((i * 11 + x * 5) % 28);
          ctx.beginPath();
          ctx.arc(bx, by, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // Crates: wooden boxes that block sight and movement.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] !== 'C') continue;
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = '#7a5a34';
      ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
      ctx.strokeStyle = '#54391e';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
      ctx.beginPath();
      ctx.moveTo(px + 2, py + 2);
      ctx.lineTo(px + TILE - 2, py + TILE - 2);
      ctx.moveTo(px + TILE - 2, py + 2);
      ctx.lineTo(px + 2, py + TILE - 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  // Exit door: a glowing green arch on the east side.
  const ex = state.exit;
  const exX = ex.tx * TILE;
  const exY = ex.ty * TILE;
  const exitOpen = state.intelTaken >= state.level.intelNeeded;
  ctx.fillStyle = exitOpen ? '#1f7a3a' : '#274a2e';
  ctx.fillRect(exX, exY, TILE, TILE);
  ctx.strokeStyle = exitOpen ? '#5cf08a' : '#3a6b44';
  ctx.lineWidth = 3;
  ctx.strokeRect(exX + 2, exY + 2, TILE - 4, TILE - 4);
  ctx.lineWidth = 1;
  ctx.fillStyle = exitOpen ? '#a9ffbe' : '#6f9a78';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(exitOpen ? 'EXIT' : 'LOCK', exX + TILE / 2, exY + TILE / 2);
  if (exitOpen) {
    ctx.strokeStyle = 'rgba(120, 255, 160, 0.7)';
    ctx.beginPath();
    ctx.arc(exX + TILE / 2, exY + TILE / 2, TILE * 0.75 + Math.sin(state.time * 3) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Intel ledgers: glowing amber scrolls.
  for (const item of state.intel) {
    if (item.taken) continue;
    const cx = item.tx * TILE + TILE / 2;
    const cy = item.ty * TILE + TILE / 2;
    const bob = Math.sin(state.time * 2.5 + item.tx) * 3;
    ctx.fillStyle = 'rgba(255, 205, 90, 0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy + bob, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a0';
    roundRect(ctx, cx - 9, cy - 6 + bob, 18, 12, 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6a1e';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 2 + bob);
    ctx.lineTo(cx + 6, cy - 2 + bob);
    ctx.moveTo(cx - 6, cy + 2 + bob);
    ctx.lineTo(cx + 6, cy + 2 + bob);
    ctx.stroke();
  }

  // Alarm panels: red boxes on the wall; grey once disabled.
  for (const alarm of state.alarms) {
    const cx = alarm.tx * TILE + TILE / 2;
    const cy = alarm.ty * TILE + TILE / 2;
    ctx.fillStyle = alarm.disabled ? '#3a3a3a' : '#8a1f1f';
    roundRect(ctx, cx - 11, cy - 11, 22, 22, 4);
    ctx.fill();
    ctx.strokeStyle = alarm.disabled ? '#666' : '#ff5c5c';
    ctx.strokeRect(cx - 11, cy - 11, 22, 22);
    ctx.fillStyle = alarm.disabled ? '#888' : '#ffb3b3';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(alarm.disabled ? 'OFF' : '!!!', cx, cy);
  }

  // Walls on top of the floor so they read as solid blocks.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] !== '#') continue;
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = t.wall;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = t.wallTop;
      ctx.fillRect(px, py, TILE, 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
    }
  }

  ctx.restore();
}

// Draw every guard's vision cone, then the guards themselves.
export function drawGuards(ctx, state) {
  ctx.save();
  ctx.translate(VIEW.ox, VIEW.oy);
  for (const guard of state.guards) {
    const pts = conePolygon(guard);
    const alert = guard.alerted;
    const suspicious = guard.suspicion >= 35;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = alert
      ? 'rgba(255, 60, 60, 0.34)'
      : suspicious
        ? 'rgba(255, 190, 60, 0.28)'
        : 'rgba(255, 220, 110, 0.16)';
    ctx.fill();
    ctx.strokeStyle = alert ? 'rgba(255, 90, 90, 0.8)' : 'rgba(255, 220, 110, 0.4)';
    ctx.stroke();
  }

  for (const guard of state.guards) {
    const bob = Math.sin(guard.bobPhase) * 1.5;
    // Body: a round-shouldered guard with a cap brim facing its view.
    ctx.fillStyle = '#20242e';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y + bob, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = guard.color;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10131a';
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.facing) * 5, guard.y + Math.sin(guard.facing) * 5 + bob, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Eyes: two dots looking along the facing.
    const ex = Math.cos(guard.facing);
    const ey = Math.sin(guard.facing);
    const px = -ey;
    const py = ex;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(guard.x + ex * 4 + px * 4, guard.y + ey * 4 + py * 4 + bob, 1.8, 0, Math.PI * 2);
    ctx.arc(guard.x + ex * 4 - px * 4, guard.y + ey * 4 - py * 4 + bob, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Suspicion meter above the head.
    if (guard.suspicion > 2) {
      const w = 30;
      const sx = guard.x - w / 2;
      const sy = guard.y - 24 + bob;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(sx, sy, w, 5);
      ctx.fillStyle = guard.alerted ? '#ff4444' : guard.suspicion >= 35 ? '#ffb13c' : '#ffe98a';
      ctx.fillRect(sx, sy, (w * guard.suspicion) / 100, 5);
    }
    // "?" while suspicious, "!" while alerted.
    if (guard.alerted || guard.suspicion >= 35) {
      ctx.fillStyle = guard.alerted ? '#ff5555' : '#ffcf4d';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(guard.alerted ? '!' : '?', guard.x, guard.y - 34 + bob);
    }
    // A small lantern glow for the captain.
    if (guard.type === 'captain') {
      ctx.strokeStyle = 'rgba(180, 76, 232, 0.8)';
      ctx.beginPath();
      ctx.arc(guard.x, guard.y + bob, 17, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Draw the player: a hooded thief with a little lantern.
export function drawPlayer(ctx, state) {
  const player = state.player;
  ctx.save();
  ctx.translate(VIEW.ox, VIEW.oy);
  const bob = Math.sin(player.bobPhase) * 1.5;
  if (player.hidden) {
    // Half-sunk in the bush: only the hood and lantern show.
    ctx.globalAlpha = 0.85;
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 11, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2733';
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3ddc84';
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, 9.5, 0, Math.PI * 2);
  ctx.fill();
  // Hood point and face shadow.
  ctx.fillStyle = '#1c2733';
  ctx.beginPath();
  ctx.moveTo(player.x + Math.cos(player.facing) * 14, player.y + Math.sin(player.facing) * 14 + bob);
  ctx.lineTo(player.x + Math.cos(player.facing + 2.5) * 9, player.y + Math.sin(player.facing + 2.5) * 9 + bob);
  ctx.lineTo(player.x + Math.cos(player.facing - 2.5) * 9, player.y + Math.sin(player.facing - 2.5) * 9 + bob);
  ctx.closePath();
  ctx.fill();
  // The lantern: a warm dot swinging at the player's side.
  const lx = player.x - Math.cos(player.facing) * 10;
  const ly = player.y - Math.sin(player.facing) * 10 + bob;
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath();
  ctx.arc(lx, ly, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 217, 138, 0.35)';
  ctx.beginPath();
  ctx.arc(lx, ly, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Thrown pebbles and their landing rings.
export function drawPebbles(ctx, state) {
  ctx.save();
  ctx.translate(VIEW.ox, VIEW.oy);
  for (const pebble of state.pebbles) {
    ctx.fillStyle = '#cfd6de';
    ctx.beginPath();
    ctx.arc(pebble.x, pebble.y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (pebble.ring > 0) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, 0.8 - pebble.ring / 60)})`;
      ctx.beginPath();
      ctx.arc(pebble.x, pebble.y, pebble.ring, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Darkness overlay: the world is dim except for a lantern radius around
// the player, the exit and the intel. Darkness is what makes a tile
// read as safe.
export function drawLighting(ctx, state) {
  const light = document.createElement('canvas');
  light.width = VIEW.width;
  light.height = VIEW.height;
  const lctx = light.getContext('2d');
  lctx.fillStyle = 'rgba(4, 6, 18, 0.52)';
  lctx.fillRect(0, 0, VIEW.width, VIEW.height);
  lctx.globalCompositeOperation = 'destination-out';
  const punch = (x, y, r) => {
    const g = lctx.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,0.95)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.6)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g;
    lctx.beginPath();
    lctx.arc(x, y, r, 0, Math.PI * 2);
    lctx.fill();
  };
  punch(VIEW.ox + state.player.x, VIEW.oy + state.player.y, 150);
  for (const item of state.intel) {
    if (!item.taken) punch(VIEW.ox + item.tx * TILE + TILE / 2, VIEW.oy + item.ty * TILE + TILE / 2, 46);
  }
  punch(VIEW.ox + state.exit.tx * TILE + TILE / 2, VIEW.oy + state.exit.ty * TILE + TILE / 2, 60);
  for (const guard of state.guards) {
    punch(VIEW.ox + guard.x, VIEW.oy + guard.y, 70);
  }
  ctx.drawImage(light, 0, 0);
}

