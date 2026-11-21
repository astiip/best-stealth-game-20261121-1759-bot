// Lantern guards: patrol waypoints, vision cones, and an alert meter that
// climbs from calm to suspicious to alerted, with a chance to recover.
// A guard that loses you searches where it last saw you, then calms down and
// returns to its patrol. Running is loud: a guard that hears your noise ring
// walks over to investigate it.
import { TILE, findPath, hasLineOfSight } from './world.js';

export const VISION_RANGE = 178;
export const VISION_HALF_ANGLE = 0.62;
export const STATE_PATROL = 'patrol';
export const STATE_SUSPICIOUS = 'suspicious';
export const STATE_CHASE = 'chase';
export const STATE_SEARCH = 'search';

const SUSPICIOUS_AT = 35;
const ALERTED_AT = 75;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function waypointPixel([tx, ty]) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

export class Guard {
  constructor(def) {
    this.waypoints = def.waypoints.map(waypointPixel);
    this.patrolSpeed = def.patrol;
    this.chaseSpeed = def.chase;
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.dir = 0;
    this.waypointIndex = 1 % this.waypoints.length;
    this.forward = true;
    this.pause = 0;
    this.alert = 0;
    this.state = STATE_PATROL;
    this.lastSeen = null;
    this.lostTimer = 0;
    this.searchTimer = 0;
    this.path = [];
    this.repathTimer = 0;
    this.stepPhase = Math.random() * 10;
    this.seesPlayer = false;
  }

  /** Distance and angle test plus line of sight: can this guard see the player? */
  canSee(level, player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > VISION_RANGE) return false;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.dir)) > VISION_HALF_ANGLE) return false;
    if (!hasLineOfSight(level, this.x, this.y, player.x, player.y)) return false;
    if (player.hidden && dist > 55) return false;
    return true;
  }

  followPath(dt, speed) {
    if (this.path.length === 0) return true;
    const target = this.path[0];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) {
      this.path.shift();
      return this.path.length === 0;
    }
    this.dir = Math.atan2(dy, dx);
    const step = Math.min(dist, speed * dt);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.stepPhase += dt * (speed / 14);
    return false;
  }

  setDestination(level, tx, ty) {
    this.path = findPath(level, this.x, this.y, tx, ty);
  }

  update(dt, level, player) {
    this.seesPlayer = this.canSee(level, player);
    const dist = Math.hypot(player.x - this.x, player.y - this.y);

    if (this.seesPlayer) {
      this.lastSeen = { x: player.x, y: player.y };
      this.lostTimer = 0;
      let gain = 58 - (dist / VISION_RANGE) * 34;
      if (player.running) gain *= 1.6;
      if (player.sneaking) gain *= 0.55;
      this.alert = Math.min(100, this.alert + gain * dt);
    } else {
      this.lostTimer += dt;
      this.alert = Math.max(0, this.alert - 17 * dt);
    }

    // A loud runner nearby pulls a calm guard over to listen.
    if (!this.seesPlayer && player.running && dist < player.noiseRadius && this.state === STATE_PATROL) {
      this.alert = Math.max(this.alert, SUSPICIOUS_AT + 2);
      this.lastSeen = { x: player.x, y: player.y };
    }

    const was = this.state;
    if (this.alert >= ALERTED_AT) this.state = STATE_CHASE;
    else if (this.alert >= SUSPICIOUS_AT) this.state = STATE_SUSPICIOUS;
    else if (this.state === STATE_CHASE && this.lostTimer > 3.5) this.state = STATE_SEARCH;
    else if (this.state === STATE_SEARCH && this.alert <= 2) this.state = STATE_PATROL;
    else if (this.state === STATE_SUSPICIOUS && this.alert < SUSPICIOUS_AT) this.state = STATE_PATROL;
    if (this.state !== was && this.state === STATE_SEARCH) this.searchTimer = 4;

    if (this.state === STATE_PATROL) {
      if (this.pause > 0) {
        this.pause -= dt;
        this.dir += Math.sin(this.pause * 2.2) * dt * 0.9;
        return;
      }
      const target = this.waypoints[this.waypointIndex];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const distTo = Math.hypot(dx, dy);
      if (distTo < 6) {
        this.pause = 1.1;
        if (this.forward) {
          this.waypointIndex += 1;
          if (this.waypointIndex >= this.waypoints.length) {
            this.waypointIndex = this.waypoints.length - 2;
            this.forward = false;
          }
        } else {
          this.waypointIndex -= 1;
          if (this.waypointIndex < 0) {
            this.waypointIndex = 1;
            this.forward = true;
          }
        }
        return;
      }
      this.dir = Math.atan2(dy, dx);
      const step = Math.min(distTo, this.patrolSpeed * dt);
      this.x += (dx / distTo) * step;
      this.y += (dy / distTo) * step;
      this.stepPhase += dt * (this.patrolSpeed / 14);
      return;
    }

    if (this.state === STATE_SUSPICIOUS) {
      if (!this.lastSeen) return;
      this.repathTimer -= dt;
      if (this.repathTimer <= 0) {
        this.setDestination(level, this.lastSeen.x, this.lastSeen.y);
        this.repathTimer = 0.5;
      }
      this.followPath(dt, this.patrolSpeed * 0.65);
      return;
    }

    if (this.state === STATE_CHASE) {
      this.repathTimer -= dt;
      if (this.repathTimer <= 0) {
        this.setDestination(level, player.x, player.y);
        this.repathTimer = 0.35;
      }
      this.followPath(dt, this.chaseSpeed);
      return;
    }

    // STATE_SEARCH: wander around the last seen spot, then give up.
    this.searchTimer -= dt;
    if (this.searchTimer <= 0) {
      this.alert = 0;
      this.state = STATE_PATROL;
      this.setDestination(level, this.waypoints[this.waypointIndex].x, this.waypoints[this.waypointIndex].y);
      this.path = [];
      return;
    }
    if (this.path.length === 0 && this.lastSeen) {
      const near = {
        x: this.lastSeen.x + (Math.sin(this.searchTimer * 1.7) * 46),
        y: this.lastSeen.y + (Math.cos(this.searchTimer * 1.3) * 46),
      };
      this.setDestination(level, near.x, near.y);
    }
    if (!this.followPath(dt, this.patrolSpeed * 0.8)) return;
    this.dir += dt * 1.4;
  }
}
