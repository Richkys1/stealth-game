// player.js — Wren, the lantern thief, in Shadow Lantern.
// Sneak (slow, quiet, hard to spot), walk, or run (fast, loud, easy to
// spot). Hide in bushes, collect intel, disable alarms, throw pebbles to
// pull guards away, and reach the exit unseen.

import { TILE, tileAt, isSolidTile, isHidingTile, isShadowTile } from './levels.js';

export const PLAYER_RADIUS = 13;

export function createPlayer(start) {
  return {
    x: start.tx * TILE + TILE / 2,
    y: start.ty * TILE + TILE / 2,
    vx: 0,
    vy: 0,
    facing: 0,
    sneaking: false,
    running: false,
    moving: false,
    hidden: false,
    inShadow: false,
    stepTimer: 0,
    pebbles: 5,
    pebbleCooldown: 0,
    bobPhase: 0,
  };
}

// Move the player one frame. Returns events: footsteps, pebble throws.
export function updatePlayer(player, dt, ctx) {
  const { input, grid, audio, events } = ctx;
  const vec = input.moveVector();
  player.moving = vec.x !== 0 || vec.y !== 0;
  player.sneaking = input.down('Shift') || input.down('Control');
  // Sneak is Shift (slow, quiet, hard to spot); anything else is a run
  // (fast, loud, easy to spot). There is no middle walk speed.
  const speed = player.sneaking ? 62 : 148;
  player.running = player.moving && !player.sneaking;

  const tx = player.x + vec.x * speed * dt;
  const ty = player.y + vec.y * speed * dt;
  const r = PLAYER_RADIUS;
  const solidAt = (px, py) => isSolidTile(tileAt(grid, Math.floor(px / TILE), Math.floor(py / TILE)));
  if (!solidAt(tx + Math.sign(vec.x) * r, player.y - r + 2) && !solidAt(tx + Math.sign(vec.x) * r, player.y + r - 2)) {
    player.x = tx;
  }
  if (!solidAt(player.x - r + 2, ty + Math.sign(vec.y) * r) && !solidAt(player.x + r - 2, ty + Math.sign(vec.y) * r)) {
    player.y = ty;
  }
  if (player.moving) {
    player.facing = Math.atan2(vec.y, vec.x);
    player.bobPhase += dt * (player.sneaking ? 7 : 11);
  }

  const tile = tileAt(grid, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  player.hidden = isHidingTile(tile);
  player.inShadow = isShadowTile(tile);

  // Footsteps: quiet while sneaking, louder and faster while running.
  if (player.moving) {
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = player.sneaking ? 0.55 : 0.34;
      events.push({
        type: 'footstep',
        x: player.x,
        y: player.y,
        running: !player.sneaking,
        // Noise radius a guard can hear: sneaking is almost silent.
        noiseRadius: player.sneaking ? 26 : 95,
      });
      if (audio) audio.footstep(!player.sneaking);
    }
  }

  // Throw a pebble toward the mouse (Space): it lands, taps, and any
  // guard in earshot walks over to investigate.
  player.pebbleCooldown = Math.max(0, player.pebbleCooldown - dt);
  if (input.wasPressed(' ') && player.pebbles > 0 && player.pebbleCooldown <= 0) {
    player.pebbles -= 1;
    player.pebbleCooldown = 0.6;
    const mx = ctx.mouseWorld.x;
    const my = ctx.mouseWorld.y;
    const dx = mx - player.x;
    const dy = my - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    const throwDist = Math.min(260, dist);
    events.push({
      type: 'pebble',
      x: player.x + (dx / dist) * throwDist,
      y: player.y + (dy / dist) * throwDist,
    });
    if (audio) audio.pebble();
  }
  return events;
}

// Distance-based helpers the HUD and renderers use.
export function playerTile(player) {
  return { tx: Math.floor(player.x / TILE), ty: Math.floor(player.y / TILE) };
}
