// Mothlight — The Night Courier: game loop and state machine.
// Screens: title → play → (caught → retry | level clear → next) → win.
// The moth must carry the lantern letter to the exit gate; moon-moths are a
// bonus. A guard that touches the moth while chasing ends the level. The page
// also answers ?shot=cover|play|alert|exit with a staged scene for screenshots.
import { LEVELS, TILE, parseLevel } from './world.js';
import { Guard, STATE_CHASE } from './guards.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { render, SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVEL_CLEAR, SCREEN_CAUGHT, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input();
const sounds = new SoundBank();

export class Game {
  constructor() {
    this.levelIndex = 0;
    this.levelDef = LEVELS[0];
    this.screen = SCREEN_TITLE;
    this.score = 0;
    this.elapsed = 0;
    this.time = 0;
    this.player = new Player(0, 0);
    this.guards = [];
    this.placedMoths = [];
    this.letter = null;
    this.exit = null;
    this.lanterns = [];
    this.shot = null;
    this.frozen = false;
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.levelDef = LEVELS[index];
    const found = parseLevel(this.levelDef);
    this.player.reset(found.player.x, found.player.y);
    this.guards = this.levelDef.guards.map((def) => new Guard(def));
    this.placedMoths = found.moths;
    this.letter = found.letter;
    this.exit = found.exit;
    this.lanterns = found.lanterns;
    this.elapsed = 0;
  }

  startGame() {
    this.score = 0;
    this.loadLevel(0);
    this.screen = SCREEN_PLAY;
  }

  levelClear() {
    const timeBonus = Math.max(0, 300 - Math.floor(this.elapsed) * 2);
    this.score += 300 + timeBonus;
    sounds.gateChime();
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.screen = SCREEN_WIN;
    } else {
      this.screen = SCREEN_LEVEL_CLEAR;
    }
  }

  caught() {
    sounds.caughtThud();
    this.screen = SCREEN_CAUGHT;
  }

  update(dt) {
    this.time += dt;
    if (this.screen !== SCREEN_PLAY) return;
    this.elapsed += dt;
    this.player.update(dt, this.levelDef, input);
    for (const guard of this.guards) guard.update(dt, this.levelDef, this.player);

    // Pickups: moon-moths and the lantern letter.
    for (const moth of this.placedMoths) {
      if (!moth.taken && Math.hypot(moth.x - this.player.x, moth.y - this.player.y) < 26) {
        moth.taken = true;
        this.player.moths += 1;
        this.score += 100;
        sounds.mothChime();
      }
    }
    if (this.letter && !this.letter.taken && Math.hypot(this.letter.x - this.player.x, this.letter.y - this.player.y) < 28) {
      this.letter.taken = true;
      this.player.hasLetter = true;
      sounds.letterChime();
    }

    // Footsteps: the moth's own soft tread, and the nearest guard's heavier
    // tread panned by where it stands, so you can hear a patrol coming.
    if (this.player.stepped()) {
      sounds.footstep(this.player.running, 0);
    }
    this.guardStepTimer = (this.guardStepTimer ?? 0) - dt;
    if (this.guardStepTimer <= 0) {
      this.guardStepTimer = 0.55;
      let nearest = null;
      let nearestDist = 260;
      for (const guard of this.guards) {
        const dist = Math.hypot(guard.x - this.player.x, guard.y - this.player.y);
        if (dist < nearestDist) {
          nearest = guard;
          nearestDist = dist;
        }
      }
      if (nearest) sounds.footstep(true, (nearest.x - this.player.x) / 260);
    }

    // A guard that spots the moth raises the alarm the first time.
    for (const guard of this.guards) {
      if (guard.state === STATE_CHASE && guard.alert >= 75 && !guard.stingPlayed) {
        guard.stingPlayed = true;
        sounds.alertSting();
      }
      if (guard.state !== STATE_CHASE) guard.stingPlayed = false;
    }

    // Caught: a chasing guard touches the moth.
    for (const guard of this.guards) {
      if (guard.state === STATE_CHASE && Math.hypot(guard.x - this.player.x, guard.y - this.player.y) < 24) {
        this.caught();
        return;
      }
    }

    // Exit: the gate opens only once the letter is carried.
    if (this.exit && this.player.hasLetter && Math.hypot(this.exit.x - this.player.x, this.exit.y - this.player.y) < 30) {
      this.levelClear();
    }
  }

  advance() {
    if (this.screen === SCREEN_TITLE || this.screen === SCREEN_WIN) {
      this.startGame();
    } else if (this.screen === SCREEN_LEVEL_CLEAR) {
      this.loadLevel(this.levelIndex + 1);
      this.screen = SCREEN_PLAY;
    } else if (this.screen === SCREEN_CAUGHT) {
      this.loadLevel(this.levelIndex);
      this.screen = SCREEN_PLAY;
    }
  }

  frame(dt) {
    sounds.ensure();
    if (input.consumeMute()) sounds.toggleMute();
    if (input.consumeAny()) sounds.startAmbient();
    if (this.screen === SCREEN_PLAY && !this.frozen) {
      this.update(dt);
    } else if (input.consumeConfirm()) {
      this.advance();
    } else {
      input.consumeConfirm();
    }
    render(ctx, this, this.time);
  }
}

const game = new Game();
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  game.shot = shot;
  stageShot(shot, game);
}

// A small handle for play-testing: the page's own state, read-only from here.
window.__mothlight = game;

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
