// main.js — Shadow Lantern: the game loop, the screens, the heists.
// A top-down stealth game in five levels. Steal the intel, silence the
// alarms, reach the exit unseen. Deterministic: levels, patrols and
// pickups are fixed by the level data; only the player's choices vary.

import { LEVELS, parseLevel, tileAt, TILE } from './levels.js';
import { createGuard, updateGuard, levelAlertLevel } from './guards.js';
import { createPlayer, updatePlayer } from './player.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { drawWorld, drawGuards, drawPlayer, drawPebbles, drawLighting, VIEW } from './render.js';
import {
  drawTopBar, drawMinimap, drawHintBar, drawToast,
  drawTitleScreen, drawBriefingScreen, drawLevelClearScreen,
  drawCaughtScreen, drawWinScreen, drawPausedScreen, drawNearMissFlash,
} from './hud.js';
import { makeRng } from './rng.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = VIEW.width * dpr;
  canvas.height = VIEW.height * dpr;
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

const input = createInput(canvas);
const audio = createAudio();
const params = new URLSearchParams(window.location.search);
const demoMode = params.get('demo') || '';

// Mouse in view coordinates (1280x720): input.js stores backing-store
// pixels, so divide by the backing-store scale.
function viewMouse() {
  const s = canvas.width / VIEW.width;
  return { x: input.mouse.x / s, y: input.mouse.y / s, clicked: input.mouse.clicked, down: input.mouse.down };
}

const state = {
  screen: 'title',
  levelIndex: 0,
  level: LEVELS[0],
  grid: [],
  intel: [],
  guards: [],
  alarms: [],
  exit: { tx: 24, ty: 13 },
  player: null,
  pebbles: [],
  elapsed: 0,
  intelTaken: 0,
  timesSeen: 0,
  maxSuspicion: 0,
  alarmActive: false,
  toast: '',
  toastTimer: 0,
  hintText: '',
  objectiveText: '',
  nearMissTimer: 0,
  nearMissArmed: false,
  caughtBy: '',
  levelResults: [],
  totalTime: 0,
  time: 0,
  rng: makeRng('shadow-lantern'),
  buttons: {},
};

function loadLevel(index) {
  const level = LEVELS[index];
  const parsed = parseLevel(level);
  state.levelIndex = index;
  state.level = level;
  state.grid = parsed.grid;
  state.intel = parsed.intel;
  state.alarms = parsed.alarms;
  state.exit = parsed.exit;
  state.guards = parsed.guards.map((def, i) => createGuard(def, i));
  state.player = createPlayer(parsed.player);
  state.pebbles = [];
  state.elapsed = 0;
  state.intelTaken = 0;
  state.timesSeen = 0;
  state.maxSuspicion = 0;
  state.alarmActive = false;
  state.toast = '';
  state.toastTimer = 0;
  state.nearMissTimer = 0;
  state.nearMissArmed = false;
  state.hintText = level.hint;
  state.rng = makeRng(`shadow-lantern-${level.id}`);
  updateObjectiveText();
  state.screen = 'briefing';
}

function updateObjectiveText() {
  const remaining = state.level.intelNeeded - state.intelTaken;
  state.objectiveText = remaining > 0
    ? `Steal ${remaining} more intel`
    : 'All intel stolen — reach the EXIT';
}

function showToast(text) {
  state.toast = text;
  state.toastTimer = 2.6;
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

// ---- Demo staging (?demo=...) ----
// Real renders of the game's own code, staged for the screenshots:
// title, mid-play, a near-detection alert, and the level-clear screen.
function applyDemo(mode) {
  if (mode === 'play') {
    loadLevel(1);
    state.screen = 'play';
    state.player.x = 9 * TILE + 20;
    state.player.y = 6 * TILE + 20;
    state.intel[0].taken = true;
    state.intelTaken = 1;
    state.elapsed = 47;
    state.guards[0].suspicion = 42;
    state.guards[0].state = 'investigate';
    state.guards[0].target = { x: state.player.x + 60, y: state.player.y + 40 };
    updateObjectiveText();
  } else if (mode === 'alert') {
    loadLevel(3);
    state.screen = 'play';
    state.player.x = 17 * TILE + 20;
    state.player.y = 5 * TILE + 20;
    state.player.sneaking = true;
    state.intel[0].taken = true;
    state.intel[1].taken = true;
    state.intelTaken = 2;
    state.elapsed = 96;
    const guard = state.guards[0];
    guard.alerted = true;
    guard.state = 'chase';
    guard.suspicion = 100;
    guard.lastSeen = { x: state.player.x, y: state.player.y };
    guard.chaseTimer = 4;
    state.maxSuspicion = 100;
    state.alarmActive = true;
    state.nearMissTimer = 1.0;
    showToast('SPOTTED! Break line of sight — now!');
    updateObjectiveText();
  } else if (mode === 'win') {
    loadLevel(4);
    state.screen = 'clear';
    state.elapsed = 154;
    state.intelTaken = 4;
    state.timesSeen = 0;
    state.levelResults = [
      { name: '1 — Moonlit Museum', time: 68, spotted: 0, ghost: true },
      { name: '2 — The Gilded Bank', time: 91, spotted: 1, ghost: false },
      { name: '3 — Ember Garden Estate', time: 112, spotted: 0, ghost: true },
      { name: '4 — Harbor Warehouse', time: 129, spotted: 2, ghost: false },
      { name: '5 — The Sky Casino', time: 154, spotted: 0, ghost: true },
    ];
  }
}

// ---- Per-frame update ----

function handleEvents(events) {
  for (const event of events) {
    if (event.type === 'suspicious') {
      audio.suspicious();
      showToast(`${event.guard.name} heard something…`);
    } else if (event.type === 'spotted') {
      audio.spotted();
      state.timesSeen += 1;
      showToast(`SPOTTED by ${event.guard.name}! Run for cover!`);
      if (state.alarms.some((a) => !a.disabled)) {
        state.alarmActive = true;
        for (const g of state.guards) {
          if (g.state !== 'chase') {
            g.state = 'investigate';
            g.target = { x: state.player.x, y: state.player.y };
            g.suspicion = Math.max(g.suspicion, 45);
          }
        }
      }
    } else if (event.type === 'caught') {
      state.caughtBy = event.guard.name;
      state.screen = 'caught';
      audio.caught();
      audio.stopMusic();
      setStatus(`Caught by ${event.guard.name}. Press R to try again.`);
    } else if (event.type === 'footstep') {
      state.noise = { x: event.x, y: event.y, radius: event.noiseRadius };
    } else if (event.type === 'pebble') {
      state.pebbles.push({ x: event.x, y: event.y, ring: 2, ttl: 1.4 });
      state.noise = { x: event.x, y: event.y, radius: 170 };
      audio.pebbleLand();
    }
  }
}

function updatePlay(dt) {
  state.elapsed += dt;
  state.time += dt;
  const events = [];
  state.noise = null;

  // Mouse position in world pixels: view coords minus the play offset.
  const vm = viewMouse();
  const worldMouse = { x: vm.x - VIEW.ox, y: vm.y - VIEW.oy };

  updatePlayer(state.player, dt, {
    input,
    grid: state.grid,
    audio,
    events,
    mouseWorld: worldMouse,
  });

  const guardCtx = {
    player: state.player,
    grid: state.grid,
    events,
    time: state.time,
    noise: state.noise,
  };
  for (const guard of state.guards) {
    updateGuard(guard, dt, guardCtx);
    guardCtx.noise = state.noise;
  }
  handleEvents(events);

  // Pebble rings expand and fade.
  for (const pebble of state.pebbles) {
    pebble.ring += dt * 90;
    pebble.ttl -= dt;
  }
  state.pebbles = state.pebbles.filter((p) => p.ttl > 0);

  // Intel pickup: walk over a ledger to steal it.
  for (const item of state.intel) {
    if (item.taken) continue;
    const dx = item.tx * TILE + TILE / 2 - state.player.x;
    const dy = item.ty * TILE + TILE / 2 - state.player.y;
    if (Math.hypot(dx, dy) < 26) {
      item.taken = true;
      state.intelTaken += 1;
      audio.pickup();
      showToast(state.intelTaken >= state.level.intelNeeded
        ? 'All intel stolen — reach the green EXIT!'
        : `Intel stolen (${state.intelTaken}/${state.level.intelNeeded})`);
      updateObjectiveText();
    }
  }

  // Alarm panel: press E beside it to cut the wires.
  if (input.wasPressed('e')) {
    for (const alarm of state.alarms) {
      if (alarm.disabled) continue;
      const dx = alarm.tx * TILE + TILE / 2 - state.player.x;
      const dy = alarm.ty * TILE + TILE / 2 - state.player.y;
      if (Math.hypot(dx, dy) < 52) {
        alarm.disabled = true;
        audio.alarmOff();
        showToast('Alarm disabled — the guards walk their rounds again.');
        if (state.alarms.every((a) => a.disabled)) {
          state.alarmActive = false;
          for (const g of state.guards) {
            if (g.state === 'investigate' && !g.alerted) {
              g.state = 'return';
              g.suspicion = Math.max(0, g.suspicion - 30);
            }
          }
        }
      }
    }
  }

  // Detection meter + near-miss flash.
  let top = 0;
  for (const g of state.guards) top = Math.max(top, g.suspicion);
  state.maxSuspicion = top;
  if (top >= 80) state.nearMissArmed = true;
  if (state.nearMissArmed && top < 35) {
    state.nearMissTimer = 1.2;
    state.nearMissArmed = false;
    showToast('Near miss! They lost you — stay in the dark.');
  }
  state.nearMissTimer = Math.max(0, state.nearMissTimer - dt);
  state.toastTimer = Math.max(0, state.toastTimer - dt);

  // Alarm: while it rings, every guard stays at least suspicious.
  if (state.alarmActive && state.alarms.some((a) => !a.disabled)) {
    for (const g of state.guards) {
      if (!g.alerted && g.suspicion < 40) g.suspicion = Math.min(60, g.suspicion + 8 * dt);
    }
  }

  // Exit: step onto it with all intel to finish the heist.
  const exitCx = state.exit.tx * TILE + TILE / 2;
  const exitCy = state.exit.ty * TILE + TILE / 2;
  if (Math.hypot(exitCx - state.player.x, exitCy - state.player.y) < 30) {
    if (state.intelTaken >= state.level.intelNeeded) {
      finishLevel();
    } else {
      showToast(`The exit is locked — steal ${state.level.intelNeeded - state.intelTaken} more intel first.`);
      state.toastTimer = 1.2;
    }
  }

  // Pause and mute.
  if (input.wasPressed('p') || input.wasPressed('Escape')) {
    state.screen = 'paused';
  }
  if (input.wasPressed('m')) {
    const muted = audio.toggleMute();
    showToast(muted ? 'Sound muted (M to unmute)' : 'Sound on');
  }
}

function finishLevel() {
  const ghost = state.timesSeen === 0;
  state.levelResults.push({
    name: state.level.name,
    time: state.elapsed,
    spotted: state.timesSeen,
    ghost,
  });
  state.totalTime += state.elapsed;
  state.screen = 'clear';
  if (state.levelIndex >= LEVELS.length - 1) {
    audio.gameWin();
  } else {
    audio.levelClear();
  }
  setStatus(`${state.level.name} complete in ${Math.round(state.elapsed)} seconds.`);
}

function nextLevel() {
  if (state.levelIndex >= LEVELS.length - 1) {
    state.screen = 'win';
    setStatus('All five heists complete. The lantern is yours.');
    return;
  }
  loadLevel(state.levelIndex + 1);
}

// ---- Rendering ----

function render() {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#0a0c16';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  if (state.screen === 'title') {
    // A dimmed museum hall behind the title.
    loadLevelBackdrop();
    drawWorld(ctx, state);
    drawGuards(ctx, state);
    drawPlayer(ctx, state);
    state.buttons = drawTitleScreen(ctx, state, viewMouse());
    return;
  }

  drawWorld(ctx, state);
  drawGuards(ctx, state);
  drawPlayer(ctx, state);
  drawPebbles(ctx, state);
  drawLighting(ctx, state);

  if (state.screen === 'play' || state.screen === 'paused') {
    drawTopBar(ctx, state);
    drawMinimap(ctx, state);
    drawHintBar(ctx, state);
    drawToast(ctx, state);
    drawNearMissFlash(ctx, state);
    if (state.screen === 'paused') drawPausedScreen(ctx, state);
  } else if (state.screen === 'briefing') {
    state.buttons = drawBriefingScreen(ctx, state, viewMouse());
  } else if (state.screen === 'clear') {
    state.buttons = drawLevelClearScreen(ctx, state, viewMouse());
  } else if (state.screen === 'caught') {
    state.buttons = drawCaughtScreen(ctx, state, viewMouse());
  } else if (state.screen === 'win') {
    state.buttons = drawWinScreen(ctx, state, viewMouse());
  }
}

// The title screen shows the first level as a backdrop.
let backdropLoaded = false;
function loadLevelBackdrop() {
  if (backdropLoaded) return;
  backdropLoaded = true;
  const parsed = parseLevel(LEVELS[0]);
  state.grid = parsed.grid;
  state.intel = parsed.intel;
  state.alarms = parsed.alarms;
  state.exit = parsed.exit;
  state.guards = parsed.guards.map((def, i) => createGuard(def, i));
  state.player = createPlayer(parsed.player);
  state.player.x = 6 * TILE + 20;
  state.player.y = 8 * TILE + 20;
}

// ---- Input on menus ----

function clickInside(btn) {
  const vm = viewMouse();
  return btn && vm.x >= btn.x && vm.x <= btn.x + btn.w
    && vm.y >= btn.y && vm.y <= btn.y + btn.h;
}

function handleMenuInput() {
  if (state.screen === 'title') {
    if ((viewMouse().clicked && clickInside(state.buttons.startButton)) || input.wasPressed('Enter')) {
      audio.unlock();
      audio.startMusic();
      audio.click();
      loadLevel(0);
    }
  } else if (state.screen === 'briefing') {
    if ((viewMouse().clicked && clickInside(state.buttons.startButton)) || input.wasPressed('Enter')) {
      audio.click();
      state.screen = 'play';
      setStatus(`${state.level.name}. ${state.objectiveText}`);
    }
  } else if (state.screen === 'clear') {
    if ((viewMouse().clicked && clickInside(state.buttons.nextButton)) || input.wasPressed('Enter')) {
      audio.click();
      nextLevel();
    }
  } else if (state.screen === 'caught') {
    if ((viewMouse().clicked && clickInside(state.buttons.retryButton)) || input.wasPressed('r') || input.wasPressed('Enter')) {
      audio.click();
      loadLevel(state.levelIndex);
    }
  } else if (state.screen === 'win') {
    if ((viewMouse().clicked && clickInside(state.buttons.restartButton)) || input.wasPressed('Enter')) {
      audio.click();
      state.levelResults = [];
      state.totalTime = 0;
      loadLevel(0);
    }
  } else if (state.screen === 'paused') {
    if (input.wasPressed('p') || input.wasPressed('Escape') || input.wasPressed('Enter')) {
      state.screen = 'play';
    }
  }
}

// ---- Main loop ----

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  state.time += dt;

  if (state.screen === 'play') {
    updatePlay(dt);
  } else if (state.screen === 'title' || state.screen === 'briefing') {
    // Let the backdrop guards patrol behind the menus.
    if (state.guards.length) {
      const events = [];
      const guardCtx = { player: state.player, grid: state.grid, events, time: state.time, noise: null };
      for (const guard of state.guards) updateGuard(guard, dt, guardCtx);
    }
  }
  handleMenuInput();
  render();
  input.endFrame();
  requestAnimationFrame(frame);
}

// Boot.
loadLevelBackdrop();
if (demoMode) applyDemo(demoMode);
setStatus('Shadow Lantern — press Enter to begin the first heist.');
requestAnimationFrame(frame);
