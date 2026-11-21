// rng.js — deterministic seeded random numbers for Shadow Lantern.
// Every random choice in the game comes from a seeded generator, so a
// level always plays the same way on every run. No Math.random, no Date.
// Revision: the shuffle helper below was added after the first draft so
// patrol idle-variation can be seeded too, instead of hard-coding it.

export function hashSeed(text) {
  // FNV-1a hash: turns a level name into a stable 32-bit seed.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seedText) {
  const next = mulberry32(hashSeed(seedText));
  return {
    next,
    // Float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // Integer in [min, max] inclusive.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // Pick one element of an array.
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // True with the given probability (0..1).
    chance(p) {
      return next() < p;
    },
  };
}

// A tiny deterministic shuffle (Fisher-Yates driven by the seeded rng).
export function shuffleSeeded(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
