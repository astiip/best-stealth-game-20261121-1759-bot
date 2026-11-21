// Staged screenshot scenes (?shot=cover|play|alert|exit). Each one sets the
// game to a fixed, real state — guards mid-patrol, a moth sneaking past a cone,
// a guard raising the alarm, the letter delivered at the gate — and the page
// draws exactly that state. No frame is faked: the same update and render code
// runs, only the starting positions are staged.
import { TILE } from './world.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVEL_CLEAR } from './render.js';
import { STATE_CHASE, STATE_SUSPICIOUS } from './guards.js';

function stepPatrol(game, seconds) {
  const dt = 1 / 60;
  const input = { up: false, down: false, left: false, right: false, sneak: true, run: false, duck: false };
  for (let i = 0; i < seconds / dt; i += 1) {
    game.player.update(dt, game.levelDef, input);
    for (const guard of game.guards) guard.update(dt, game.levelDef, game.player);
  }
}

function tileCentre(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

/** Set `game` to the named scene and return the screen to draw over it. */
export function stageShot(name, game) {
  if (name === 'play') {
    // Mid-sneak: the moth crouches in a bush at the edge of a guard's cone
    // while that guard grows suspicious and turns toward it.
    game.loadLevel(0);
    const bush = tileCentre(10, 2);
    game.player.x = bush.x;
    game.player.y = bush.y;
    game.player.sneaking = true;
    game.player.ducking = true;
    const guard = game.guards[0];
    const spot = tileCentre(13, 2);
    guard.x = spot.x;
    guard.y = spot.y;
    guard.dir = Math.PI;
    guard.alert = 48;
    guard.state = STATE_SUSPICIOUS;
    guard.lastSeen = { x: bush.x, y: bush.y };
    game.placedMoths[0].taken = true;
    game.player.moths = 1;
    game.frozen = true;
    game.screen = SCREEN_PLAY;
    return;
  }

  if (name === 'alert') {
    // Near-miss: on the second garden, a guard has spotted the running moth
    // and gives chase, cone burning red, the gate still locked ahead.
    game.loadLevel(1);
    const runner = tileCentre(17, 8);
    game.player.x = runner.x;
    game.player.y = runner.y;
    game.player.dir = Math.PI / 2;
    game.player.running = true;
    game.player.noiseRadius = 132;
    game.player.noisePulse = 0.4;
    const guard = game.guards[1];
    const post = tileCentre(17, 5);
    guard.x = post.x;
    guard.y = post.y;
    guard.dir = Math.PI / 2;
    guard.alert = 92;
    guard.state = STATE_CHASE;
    guard.lastSeen = { x: runner.x, y: runner.y };
    game.placedMoths[0].taken = true;
    game.placedMoths[1].taken = true;
    game.player.moths = 2;
    game.player.hasLetter = true;
    game.letter.taken = true;
    game.frozen = true;
    game.screen = SCREEN_PLAY;
    return;
  }

  if (name === 'exit') {
    // The delivery: letter in hand, the moth reaches the glowing open gate.
    game.loadLevel(0);
    const gate = tileCentre(21, 13);
    game.player.x = gate.x - 34;
    game.player.y = gate.y;
    game.player.dir = 0;
    game.player.hasLetter = true;
    game.letter.taken = true;
    for (const moth of game.placedMoths) moth.taken = true;
    game.player.moths = 3;
    game.score = 740;
    game.elapsed = 58;
    game.screen = SCREEN_LEVEL_CLEAR;
    return;
  }

  // Cover (default): the title over the first garden after a few seconds of
  // patrol, cones sweeping, bushes and the locked gate all in view.
  game.loadLevel(0);
  stepPatrol(game, 5);
  game.screen = SCREEN_TITLE;
}
