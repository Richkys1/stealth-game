// levels.js — the five heists of Shadow Lantern.
// Each level is a tile map plus its guards, intel, alarms and briefing.
// Tiles: # wall, . floor, B bush (hide), C crate (blocks sight),
// S shadow floor (detection rises slowly), I intel, A alarm panel,
// E exit, P player start, G guard spawn. Rows are 26 tiles wide.

export const TILE = 40;
export const COLS = 26;
export const ROWS = 15;

export const LEVELS = [
  {
    id: 'museum',
    name: '1 — Moonlit Museum',
    theme: 'museum',
    briefing: 'Slip through the marble halls. Steal 2 relic ledgers, then vanish through the east door. The guards walk slow rounds — learn them.',
    par: 75,
    map: [
      '##########################',
      '#P......#.......B........#',
      '#.......#................#',
      '#...I...#....####........#',
      '#.......#....#..#....G...#',
      '#..###..#....#..#........#',
      '#..###.......#..#....I...#',
      '#.......#....#..#........#',
      '#..B....#....####....#...#',
      '#.......#.........G..#..E#',
      '#...####.....#####....#..#',
      '#........................#',
      '#....G......B............#',
      '#........................#',
      '##########################',
    ],
    guards: [
      { tx: 19, ty: 4, type: 'patrol', waypoints: [[19, 4], [19, 9], [14, 9], [14, 4]] },
      { tx: 18, ty: 9, type: 'patrol', waypoints: [[18, 9], [22, 9], [22, 12], [10, 12]] },
      { tx: 5, ty: 12, type: 'sentry', waypoints: [[5, 12]], facing: 0 },
    ],
    alarms: [],
    intelNeeded: 2,
    hint: 'Bushes hide you. Stand still in a bush and a guard walks right past.',
  },
  {
    id: 'bank',
    name: '2 — The Gilded Bank',
    theme: 'bank',
    briefing: 'The vault ledgers are worth a fortune. Grab 3, silence the alarm panel if you can, and leave by the east exit.',
    par: 100,
    map: [
      '##########################',
      '#P....#......S....#......#',
      '#.....#...........#..I...#',
      '#..B..#..####.....#......#',
      '#.....#..#..#..G..#..##..#',
      '#..####..#..#.....#..##..#',
      '#.....S..#..#..I..#......#',
      '#..#.....#..#.....#..G...#',
      '#..#..B..#..#.....#......#',
      '#..#.....#..#..####......#',
      '#.....I..#.....#....A....#',
      '#..####..#..G..#....#....#',
      '#.....S.....#..#....#..E.#',
      '#...........#..#....#....#',
      '##########################',
    ],
    guards: [
      { tx: 15, ty: 4, type: 'patrol', waypoints: [[15, 4], [15, 8], [11, 8], [11, 4]] },
      { tx: 22, ty: 7, type: 'sentry', waypoints: [[22, 7]], facing: Math.PI },
      { tx: 11, ty: 11, type: 'patrol', waypoints: [[11, 11], [17, 11], [17, 6], [11, 6]] },
      { tx: 5, ty: 6, type: 'patrol', waypoints: [[5, 6], [5, 12], [8, 12], [8, 6]] },
    ],
    alarms: [{ tx: 19, ty: 10 }],
    intelNeeded: 3,
    hint: 'Shadow floor (dark tiles) slows detection. The alarm panel stops reinforcements — press E beside it.',
  },
  {
    id: 'garden',
    name: '3 — Ember Garden Estate',
    theme: 'garden',
    briefing: 'The countess keeps her secrets in the garden pavilion. 3 intel pages hide among the hedges. Stay in the bushes; the hounds of the house walk fast.',
    par: 120,
    map: [
      '##########################',
      '#P..B...B....#....B...I..#',
      '#......B.....#....B......#',
      '#..B.....B...#..G...B....#',
      '#....B.......#......B..B.#',
      '#.B......B...#....B......#',
      '#...B....B...#..B....B...#',
      '#......B.....#.......B...#',
      '#..B......B..#..I....B..B#',
      '#....B.......#....B......#',
      '#.B....B..B..#..B....B..G#',
      '#......B.....#......B....#',
      '#..B.....B...#..B....B..E#',
      '#....I...B...#....B......#',
      '##########################',
    ],
    guards: [
      { tx: 16, ty: 3, type: 'patrol', waypoints: [[16, 3], [16, 10], [20, 10], [20, 3]] },
      { tx: 23, ty: 10, type: 'sentry', waypoints: [[23, 10]], facing: Math.PI / 2 },
      { tx: 6, ty: 6, type: 'patrol', waypoints: [[6, 6], [12, 6], [12, 12], [6, 12]] },
      { tx: 10, ty: 12, type: 'runner', waypoints: [[10, 12], [4, 12], [4, 4], [10, 4]] },
      { tx: 19, ty: 7, type: 'patrol', waypoints: [[19, 7], [19, 13], [23, 13], [23, 7]] },
    ],
    alarms: [],
    intelNeeded: 3,
    hint: 'Runners patrol fast and spot you sooner. Throw a pebble (Space) to pull a guard away.',
  },
  {
    id: 'harbor',
    name: '4 — Harbor Warehouse',
    theme: 'harbor',
    briefing: 'Crates stacked to the ceiling, one alarm, three shipping manifests. The night shift walks the aisles — use the crates as cover and the shadows as a road.',
    par: 140,
    map: [
      '##########################',
      '#P....C.......#......I...#',
      '#.....C...C...#....C.....#',
      '#..C..C...C...#..G...C...#',
      '#.....C...C...#....C.....#',
      '#..C......C...#..C...C...#',
      '#.....C...C...#....C.....#',
      '#..C..C.......#..C...C..E#',
      '#.....C...C...#....C.....#',
      '#..C......C...#..C...C...#',
      '#.....C...C...#....C.....#',
      '#..C..C...I...#..G...C...#',
      '#.....C...C...#....C...A.#',
      '#..I..C...C...#....C.....#',
      '##########################',
    ],
    guards: [
      { tx: 18, ty: 3, type: 'patrol', waypoints: [[18, 3], [18, 7], [22, 7], [22, 3]] },
      { tx: 18, ty: 11, type: 'patrol', waypoints: [[18, 11], [18, 7], [14, 7], [14, 11]] },
      { tx: 6, ty: 5, type: 'patrol', waypoints: [[6, 5], [10, 5], [10, 11], [6, 11]] },
      { tx: 4, ty: 9, type: 'sentry', waypoints: [[4, 9]], facing: 0 },
      { tx: 12, ty: 3, type: 'runner', waypoints: [[12, 3], [12, 12], [8, 12], [8, 3]] },
      { tx: 20, ty: 12, type: 'sentry', waypoints: [[20, 12]], facing: -Math.PI / 2 },
    ],
    alarms: [{ tx: 22, ty: 12 }],
    intelNeeded: 3,
    hint: 'Crates block a guard\'s line of sight completely. Break line of sight to drop suspicion fast.',
  },
  {
    id: 'casino',
    name: '5 — The Sky Casino',
    theme: 'casino',
    briefing: 'The final job. Four vault codes, two alarms, and Captain Voss herself on the floor. Ghost it — never be seen — and the lantern is yours.',
    par: 180,
    map: [
      '##########################',
      '#P...S....#....S....I....#',
      '#.......S.#....S....#....#',
      '#..B....S.#..G..S...#..B.#',
      '#.......S.#....S....#....#',
      '#..####...#....S..####...#',
      '#..#..#...#..G....#..#...#',
      '#..#..#...#....S..#..#..I#',
      '#..#..#...#..S....#..#...#',
      '#..####...#....S..####...#',
      '#....I....#....S....#..G.#',
      '#..S......#..G.....#....A#',
      '#..I.S....#....S...#.....#',
      '#..A....S.#....S...#...E.#',
      '##########################',
    ],
    guards: [
      { tx: 13, ty: 3, type: 'patrol', waypoints: [[13, 3], [13, 6], [17, 6], [17, 3]] },
      { tx: 13, ty: 6, type: 'runner', waypoints: [[13, 6], [13, 11], [9, 11], [9, 6]] },
      { tx: 13, ty: 11, type: 'patrol', waypoints: [[13, 11], [17, 11], [17, 8], [13, 8]] },
      { tx: 22, ty: 10, type: 'sentry', waypoints: [[22, 10]], facing: Math.PI },
      { tx: 6, ty: 7, type: 'patrol', waypoints: [[6, 7], [6, 12], [3, 12], [3, 7]] },
      { tx: 19, ty: 5, type: 'captain', waypoints: [[19, 5], [19, 12], [22, 12], [22, 5]] },
      { tx: 10, ty: 3, type: 'sentry', waypoints: [[10, 3]], facing: Math.PI / 2 },
    ],
    alarms: [{ tx: 23, ty: 11 }, { tx: 3, ty: 13 }],
    intelNeeded: 4,
    hint: 'Captain Voss sees further and runs faster than any guard. Never cross her cone in the light.',
  },
];

// ---- Level parsing helpers ----

// Turn a level's string map into a grid of tile codes plus entity lists.
export function parseLevel(level) {
  const grid = [];
  const intel = [];
  const guards = [];
  let player = { tx: 1, ty: 1 };
  let exit = { tx: 24, ty: 13 };
  for (let y = 0; y < level.map.length; y++) {
    const row = [];
    for (let x = 0; x < level.map[y].length; x++) {
      const ch = level.map[y][x];
      if (ch === 'P') {
        player = { tx: x, ty: y };
        row.push('.');
      } else if (ch === 'E') {
        exit = { tx: x, ty: y };
        row.push('.');
      } else if (ch === 'I') {
        intel.push({ tx: x, ty: y, taken: false });
        row.push('.');
      } else if (ch === 'G') {
        row.push('.');
      } else if (ch === 'A') {
        row.push('.');
      } else {
        row.push(ch);
      }
    }
    grid.push(row);
  }
  for (const g of level.guards) guards.push({ ...g });
  return { grid, intel, guards, player, exit, alarms: level.alarms.map((a) => ({ ...a, disabled: false })) };
}

// Tile at a tile coordinate; walls outside the map.
export function tileAt(grid, tx, ty) {
  if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) return '#';
  return grid[ty][tx];
}

// True when the tile blocks movement.
export function isSolidTile(tile) {
  return tile === '#' || tile === 'C';
}

// True when the tile blocks a guard's line of sight.
export function blocksSight(tile) {
  return tile === '#' || tile === 'C';
}

// True when the player counts as hidden on this tile.
export function isHidingTile(tile) {
  return tile === 'B';
}

// True when the tile is shadow floor (detection builds slowly).
export function isShadowTile(tile) {
  return tile === 'S';
}

// Pixel centre of a tile.
export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

