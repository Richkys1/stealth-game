# Shadow Lantern — a stealth heist game

[![make.fun bounty](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Richkys1/stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Richkys1/stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

**Shadow Lantern** is a top-down stealth game built for make.fun's [Make the best stealth game](https://make.fun/bounty/best-stealth-game-20261121-1759) bounty ($50 in USDC).

You are Wren, a thief with one lantern and five impossible heists. Slip past patrolling guards, steal the intel ledgers, silence the alarms, and reach the green exit unseen.

## How to play

Serve the game and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests — every file the game loads lives under `game/`.

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Sneak (slow, quiet, hard to spot) |
| Space | Throw a pebble toward the mouse (lures guards away) |
| E | Disable an alarm panel (stand beside it) |
| P / Esc | Pause |
| M | Mute |

## The five heists

1. **Moonlit Museum** — 3 guards, 2 intel. Learn the rounds.
2. **The Gilded Bank** — 4 guards, 3 intel, 1 alarm. Shadow floor slows detection.
3. **Ember Garden Estate** — 5 guards, 3 intel. Bushes hide you; runners patrol fast.
4. **Harbor Warehouse** — 6 guards, 3 intel, 1 alarm. Crates block sight completely.
5. **The Sky Casino** — 7 guards including Captain Voss, 4 intel, 2 alarms.

## Stealth systems

- **Vision cones** — guards see in a cone; walls and crates block sight.
- **Detection meter** — suspicion builds when you are seen and drains when you break line of sight, so a near miss is a chance to recover.
- **Hiding** — bushes conceal you unless a guard is very close; shadow floor slows detection; sneaking is quiet and hard to spot, running is fast and loud.
- **Noise** — footsteps and pebble taps pull guards to investigate the sound.
- **Alarms** — a spotted guard rings the alarm and every guard hunts you until you cut the panel.
- **Ghost runs** — finish a level never spotted for a GHOST rating.
- **Minimap, HUD, detection meter, pause, title/briefing/win/lose screens**, and a fully synthesised WebAudio soundscape (footsteps, alarm stings, pickup chimes, ambient pad music).

## Deterministic

Levels, patrols and pickups are fixed data; the seeded RNG (`game/src/rng.js`) drives only cosmetic variation. Running `main.ts` twice writes byte-identical output.

## Layout

- `game/index.html` — the page; `game/src/main.js` — loop and screens
- `game/src/levels.js` — the five heists; `game/src/guards.js` — guard AI
- `game/src/vision.js` — line of sight and cones; `game/src/player.js` — the thief
- `game/src/render.js` — canvas drawing and lantern lighting; `game/src/hud.js` — HUD and menus
- `game/src/audio.js` — synthesised WebAudio sounds; `game/src/input.js` — keyboard/mouse
- `main.ts` — the hand-in program (Node 22, stdlib only); `vendor/makefun-game.ts` — the kit library, unchanged

## Referral

Play code: `xmc7n7gx`

## License

MIT — see [LICENSE](LICENSE).
