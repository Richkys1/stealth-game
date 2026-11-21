// guards.js — guard AI for Shadow Lantern.
// A guard patrols waypoints, pauses to scan, grows suspicious when it
// glimpses the player, investigates noises and last-seen spots, and
// chases when fully alerted. Suspicion decays when the player is unseen,
// so a near miss is a chance to recover, not an instant fail.
// Revision: the chase now re-arms its timer whenever the guard still
// sees the player, so a guard that keeps eyes on you does not give up
// mid-chase — and 'return' walks to the nearest waypoint, not the start.

import { TILE, tileCenter, tileAt, isSolidTile } from './levels.js';
import { detectionRate, hasLineOfSight } from './vision.js';

export const GUARD_TYPES = {
  patrol: { speed: 52, viewRange: 190, halfAngle: 0.52, spotRate: 0.85, color: '#e8b64c', name: 'Patrol Guard' },
  sentry: { speed: 0, viewRange: 210, halfAngle: 0.6, spotRate: 0.95, color: '#e87a4c', name: 'Sentry' },
  runner: { speed: 78, viewRange: 175, halfAngle: 0.5, spotRate: 1.05, color: '#d94c6e', name: 'Runner' },
  captain: { speed: 62, viewRange: 250, halfAngle: 0.55, spotRate: 1.2, color: '#b44ce8', name: 'Captain Voss' },
};

export function createGuard(def, index) {
  const type = GUARD_TYPES[def.type] || GUARD_TYPES.patrol;
  const start = tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
  return {
    id: index,
    type: def.type,
    name: type.name,
    x: start.x,
    y: start.y,
    facing: def.facing !== undefined ? def.facing : 0,
    speed: type.speed,
    viewRange: type.viewRange,
    viewHalfAngle: type.halfAngle,
    spotRate: type.spotRate,
    color: type.color,
    waypoints: def.waypoints.map(([tx, ty]) => tileCenter(tx, ty)),
    wpIndex: 1 % def.waypoints.length,
    state: 'patrol', // patrol | scan | investigate | chase | return
    suspicion: 0, // 0..100; 100 = fully alerted
    alerted: false,
    pauseTimer: 0,
    scanTimer: 0,
    scanDir: 1,
    scanBase: 0,
    target: null, // {x, y} investigation point
    lastSeen: null,
    chaseTimer: 0,
    stuckTimer: 0,
    wasSuspicious: false,
    bobPhase: index * 1.7,
  };
}

function angleTo(x0, y0, x1, y1) {
  return Math.atan2(y1 - y0, x1 - x0);
}

function turnToward(guard, targetAngle, dt, turnSpeed) {
  let diff = targetAngle - guard.facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const step = turnSpeed * dt;
  if (Math.abs(diff) <= step) {
    guard.facing = targetAngle;
  } else {
    guard.facing += Math.sign(diff) * step;
  }
}

// Move toward a point, sliding along walls. Returns distance remaining.
function moveToward(guard, tx, ty, speed, dt, grid) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return 0;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  const r = 12;
  const canX = !isSolidTile(tileAt(grid, Math.floor((nx + Math.sign(dx) * r) / TILE), Math.floor(guard.y / TILE)));
  const canY = !isSolidTile(tileAt(grid, Math.floor(guard.x / TILE), Math.floor((ny + Math.sign(dy) * r) / TILE)));
  if (canX) guard.x = nx;
  if (canY) guard.y = ny;
  guard.facing = angleTo(guard.x, guard.y, tx, ty);
  return Math.hypot(tx - guard.x, ty - guard.y);
}

export function updateGuard(guard, dt, ctx) {
  const { player, grid, events, time } = ctx;
  guard.bobPhase += dt * 6;

  // --- Seeing the player ---
  const rate = detectionRate(guard, player, grid);
  if (rate > 0) {
    const before = guard.suspicion;
    guard.suspicion = Math.min(100, guard.suspicion + rate * guard.spotRate * 55 * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    if (before < 35 && guard.suspicion >= 35 && !guard.wasSuspicious) {
      events.push({ type: 'suspicious', guard });
    }
    if (guard.suspicion >= 100 && !guard.alerted) {
      guard.alerted = true;
      guard.state = 'chase';
      guard.chaseTimer = 6;
      events.push({ type: 'spotted', guard });
    }
  } else if (guard.suspicion > 0 && guard.state !== 'chase') {
    // Unseen: suspicion drains, faster when the player breaks line of sight.
    const los = hasLineOfSight(grid, guard.x, guard.y, player.x, player.y);
    guard.suspicion = Math.max(0, guard.suspicion - (los ? 6 : 22) * dt);
    if (guard.suspicion < 35) guard.wasSuspicious = false;
  }
  if (guard.suspicion >= 35) guard.wasSuspicious = true;

  // --- Hearing a noise ---
  if (ctx.noise && guard.state !== 'chase') {
    const d = Math.hypot(ctx.noise.x - guard.x, ctx.noise.y - guard.y);
    if (d < ctx.noise.radius) {
      guard.target = { x: ctx.noise.x, y: ctx.noise.y };
      guard.state = 'investigate';
      guard.suspicion = Math.max(guard.suspicion, 45);
    }
  }

  // --- Behaviour by state ---
  if (guard.state === 'patrol') {
    if (guard.waypoints.length > 1) {
      const wp = guard.waypoints[guard.wpIndex];
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        turnToward(guard, guard.scanBase + Math.sin(time * 1.4 + guard.id) * 0.9, dt, 2.2);
      } else {
        const remaining = moveToward(guard, wp.x, wp.y, guard.speed, dt, grid);
        if (remaining < 6) {
          guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
          guard.pauseTimer = 0.9;
          guard.scanBase = guard.facing;
        }
      }
    } else {
      // Sentry: stand and sweep the view back and forth.
      turnToward(guard, guard.scanBase + Math.sin(time * 0.7 + guard.id * 2.1) * 1.1, dt, 1.6);
      if (guard.scanBase === 0 && guard.facing !== 0) guard.scanBase = guard.facing;
    }
    if (guard.suspicion >= 35 && guard.suspicion < 100) {
      guard.state = 'investigate';
      guard.target = guard.lastSeen ? { ...guard.lastSeen } : { x: player.x, y: player.y };
    }
  } else if (guard.state === 'investigate') {
    if (guard.target) {
      const remaining = moveToward(guard, guard.target.x, guard.target.y, guard.speed * 1.35, dt, grid);
      if (remaining < 10) {
        guard.state = 'scan';
        guard.scanTimer = 2.2;
        guard.scanBase = guard.facing;
      }
    } else {
      guard.state = 'scan';
      guard.scanTimer = 1.5;
      guard.scanBase = guard.facing;
    }
    if (guard.suspicion < 20) {
      guard.state = 'return';
    }
  } else if (guard.state === 'scan') {
    guard.scanTimer -= dt;
    turnToward(guard, guard.scanBase + Math.sin(time * 2.4) * 1.3, dt, 3.2);
    if (guard.scanTimer <= 0) {
      guard.state = guard.suspicion >= 35 ? 'investigate' : 'return';
      if (guard.state === 'investigate' && guard.lastSeen) {
        guard.target = { ...guard.lastSeen };
      }
    }
  } else if (guard.state === 'chase') {
    guard.chaseTimer -= dt;
    const seen = detectionRate(guard, player, grid) > 0;
    if (seen) {
      guard.lastSeen = { x: player.x, y: player.y };
      guard.chaseTimer = 4;
    }
    const dest = guard.lastSeen || { x: player.x, y: player.y };
    moveToward(guard, dest.x, dest.y, guard.speed * 2.1, dt, grid);
    const d = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (d < 26) {
      events.push({ type: 'caught', guard });
    }
    if (guard.chaseTimer <= 0) {
      guard.alerted = false;
      guard.suspicion = 55;
      guard.state = 'investigate';
      guard.target = guard.lastSeen ? { ...guard.lastSeen } : null;
    }
  } else if (guard.state === 'return') {
    // Walk back to the nearest patrol waypoint, then resume the round.
    let best = 0;
    let bestDist = Infinity;
    guard.waypoints.forEach((wp, i) => {
      const d = Math.hypot(wp.x - guard.x, wp.y - guard.y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    const wp = guard.waypoints[best];
    const remaining = moveToward(guard, wp.x, wp.y, guard.speed, dt, grid);
    if (remaining < 8) {
      guard.wpIndex = (best + 1) % guard.waypoints.length;
      guard.state = 'patrol';
      guard.suspicion = 0;
    }
  }
}

// How alarmed the whole level is: 0 calm .. 1 full alarm.
export function levelAlertLevel(guards) {
  let top = 0;
  for (const g of guards) {
    if (g.alerted) return 1;
    top = Math.max(top, g.suspicion / 100);
  }
  return top;
}
