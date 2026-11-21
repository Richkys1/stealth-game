// vision.js — line of sight and vision cones for Shadow Lantern.
// Guards see in a cone; walls and crates block sight. The player is
// harder to spot in bushes, in shadow, while sneaking, and at range.
// Revision: detection now scales with distance AND light AND movement
// together, so a sneaking player in shadow at long range is barely
// noticed while a running player in the open is spotted almost at once.

import { TILE, tileAt, blocksSight } from './levels.js';

// Bresenham walk over tiles between two pixel points. Returns false the
// moment a sight-blocking tile is crossed (endpoints excluded).
export function hasLineOfSight(grid, x0, y0, x1, y1) {
  let tx0 = Math.floor(x0 / TILE);
  let ty0 = Math.floor(y0 / TILE);
  const tx1 = Math.floor(x1 / TILE);
  const ty1 = Math.floor(y1 / TILE);
  const dx = Math.abs(tx1 - tx0);
  const dy = Math.abs(ty1 - ty0);
  const sx = tx0 < tx1 ? 1 : -1;
  const sy = ty0 < ty1 ? 1 : -1;
  let err = dx - dy;
  let guard = 0;
  while (guard++ < 200) {
    if (tx0 === tx1 && ty0 === ty1) return true;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      tx0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      ty0 += sy;
    }
    if (tx0 === tx1 && ty0 === ty1) return true;
    if (blocksSight(tileAt(grid, tx0, ty0))) return false;
  }
  return false;
}

// True when a point lies inside a guard's vision cone.
export function inVisionCone(guard, px, py) {
  const dx = px - guard.x;
  const dy = py - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > guard.viewRange) return false;
  if (dist < 14) return true;
  const ang = Math.atan2(dy, dx);
  let diff = ang - guard.facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= guard.viewHalfAngle;
}

// How fast a guard's suspicion of the player grows per second (0..1
// scale). Distance, light, movement and cover all matter: a sneaking
// player in shadow at long range is barely noticed, a running player in
// the open up close is spotted almost at once.
export function detectionRate(guard, player, grid) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > guard.viewRange) return 0;
  if (!inVisionCone(guard, player.x, player.y)) return 0;
  if (!hasLineOfSight(grid, guard.x, guard.y, player.x, player.y)) return 0;

  let rate = 1 - dist / guard.viewRange; // 0 far, 1 point blank
  rate = 0.25 + rate * 0.75;

  const tile = tileAt(grid, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  if (tile === 'B') {
    // Hidden in a bush: only seen at very close range.
    if (dist > 70) return 0;
    rate *= 0.25;
  }
  if (tile === 'S') rate *= 0.55; // shadow floor
  if (player.sneaking) rate *= 0.6;
  if (player.running) rate *= 1.6;
  if (player.moving) rate *= 1.15;
  return rate;
}

// Distance from a point to the nearest guard, for footstep audio cues.
export function nearestGuardDistance(guards, x, y) {
  let best = Infinity;
  for (const g of guards) {
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < best) best = d;
  }
  return best;
}

// Cone polygon points (in pixels) for rendering a guard's vision cone.
export function conePolygon(guard, steps = 14) {
  const pts = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= steps; i++) {
    const a = guard.facing - guard.viewHalfAngle + (2 * guard.viewHalfAngle * i) / steps;
    pts.push({
      x: guard.x + Math.cos(a) * guard.viewRange,
      y: guard.y + Math.sin(a) * guard.viewRange,
    });
  }
  return pts;
}
