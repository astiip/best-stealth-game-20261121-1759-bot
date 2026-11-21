[![Make the best stealth game](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![Rank](https://make.fun/badge/best-stealth-game-20261121-1759/astiip/best-stealth-game-20261121-1759-bot/rank.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![Reward](https://make.fun/badge/best-stealth-game-20261121-1759/astiip/best-stealth-game-20261121-1759-bot/reward.svg)](https://make.fun/c/best-stealth-game-20261121-1759)

# Mothlight — The Night Courier

A top-down 2D stealth game for [make.fun's best stealth game bounty](https://make.fun/c/best-stealth-game-20261121-1759).
You are a courier moth-sprite sneaking through a sleeping manor garden at night
to deliver a lantern letter to the exit gate — unseen.

## How to play

- **WASD / arrow keys** — move (the moth hurries by default, and hurrying is loud)
- **Shift** — sneak: slow, silent, harder to spot
- **Space / E** — duck in cover; a still moth inside a bush cannot be seen
- **M** — mute · **Enter / click** — start, continue

Guards patrol the garden with lantern vision cones. Their alert meter climbs
from calm to suspicious (they come to look) to alerted (they chase). If a
chasing guard touches you, you are caught. Running rings a noise circle that
guards can hear. Collect the three moon-moths in each garden for bonus score,
pick up the lantern letter to unlock the exit gate, and slip out unseen.
Three gardens, escalating patrols — finish all three to bring the letter home.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/` is plain static files and all art and sound
are drawn and synthesized in code.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored make.fun
library.

## Files

- `game/index.html` — the page
- `game/src/main.js` — game loop and state machine
- `game/src/world.js` — levels, collision, line of sight, pathfinding
- `game/src/guards.js` — patrols, vision cones, alert AI
- `game/src/player.js` — the moth courier: sneak, run, hide
- `game/src/render.js` — all canvas drawing and screens
- `game/src/audio.js` — synthesized WebAudio footsteps, chimes and hum
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — staged screenshot scenes (`?shot=cover|play|alert|exit`)

## License

MIT — see [LICENSE](LICENSE).
