// The night courier: a moth-sprite who walks, sneaks and runs through the garden.
// Sneaking is slow and quiet; running is fast and loud, ringing a noise circle
// guards can hear. Ducking (Space) inside a bush makes the moth invisible even
// to a guard standing close. The moth must pick up the lantern letter before
// the exit gate will open, and may gather the three moon-moths on the way.
import { TILE, moveCircle, tileChar } from './world.js';

export const SNEAK_SPEED = 70;
export const RUN_SPEED = 208;
export const PLAYER_RADIUS = 13;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dir = 0;
    this.moving = false;
    this.sneaking = false;
    this.running = false;
    this.ducking = false;
    this.hidden = false;
    this.noiseRadius = 0;
    this.noisePulse = 0;
    this.stepPhase = 0;
    this.stepAcc = 0;
    this.wingPhase = 0;
    this.moths = 0;
    this.hasLetter = false;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.dir = 0;
    this.moving = false;
    this.sneaking = false;
    this.running = false;
    this.ducking = false;
    this.hidden = false;
    this.noiseRadius = 0;
    this.moths = 0;
    this.hasLetter = false;
  }

  update(dt, level, input) {
    let ix = 0;
    let iy = 0;
    if (input.left) ix -= 1;
    if (input.right) ix += 1;
    if (input.up) iy -= 1;
    if (input.down) iy += 1;
    this.moving = ix !== 0 || iy !== 0;
    this.sneaking = Boolean(input.sneak) && !input.run;
    this.running = Boolean(input.run) && this.moving && !input.sneak;
    this.ducking = Boolean(input.duck);

    const speed = this.running ? RUN_SPEED : SNEAK_SPEED;
    if (this.moving) {
      const len = Math.hypot(ix, iy);
      const nx = (ix / len) * speed * dt;
      const ny = (iy / len) * speed * dt;
      const moved = moveCircle(level, this.x, this.y, nx, ny, PLAYER_RADIUS);
      this.x = moved.x;
      this.y = moved.y;
      this.dir = Math.atan2(iy, ix);
      this.stepAcc += speed * dt;
      this.wingPhase += dt * (this.running ? 22 : 13);
    } else {
      this.wingPhase += dt * 5;
    }

    // Noise: only a runner rings. The ring fades as the moth slows.
    if (this.running) {
      this.noiseRadius = 132;
      this.noisePulse += dt;
    } else {
      this.noiseRadius = Math.max(0, this.noiseRadius - 260 * dt);
    }

    // Hidden inside a bush while still, sneaking or ducking.
    const tile = tileChar(level, Math.floor(this.x / TILE), Math.floor(this.y / TILE));
    this.hidden = tile === 'B' && (!this.moving || this.sneaking || this.ducking);
  }

  /** Step sounds fire once per stride; the caller decides how loud they are. */
  stepped() {
    const stride = this.running ? 34 : 30;
    if (this.stepAcc >= stride) {
      this.stepAcc -= stride;
      return true;
    }
    return false;
  }
}
