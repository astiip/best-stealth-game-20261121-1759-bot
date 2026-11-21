// Everything the eye sees: the night garden, lantern light, vision cones, the
// moth courier, the guards and every screen. Flat vector art drawn on canvas,
// no images. Light means danger here: a guard's cone is bright, and the safe
// places are the dark bushes and the shadows between the lantern pools.
import { COLS, ROWS, TILE, WORLD_W, WORLD_H, tileChar, mulberry32 } from './world.js';
import { VISION_RANGE, VISION_HALF_ANGLE, STATE_CHASE, STATE_SUSPICIOUS } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_LEVEL_CLEAR = 'clear';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';

const FLOWER_SPOTS = (() => {
  const rand = mulberry32(20261121);
  const spots = [];
  for (let i = 0; i < 90; i += 1) {
    spots.push({ x: rand() * WORLD_W, y: rand() * WORLD_H, r: 1 + rand() * 1.6, c: rand() });
  }
  return spots;
})();

function coneColor(guard) {
  if (guard.state === STATE_CHASE) return 'rgba(255, 64, 48, 0.34)';
  if (guard.state === STATE_SUSPICIOUS) return 'rgba(255, 176, 48, 0.30)';
  return 'rgba(255, 196, 88, 0.22)';
}

function drawFloor(ctx, level, time) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const ch = level.map[ty][tx];
      const x = tx * TILE;
      const y = ty * TILE;
      const checker = (tx + ty) % 2 === 0;
      ctx.fillStyle = checker ? '#101d33' : '#0d1829';
      ctx.fillRect(x, y, TILE, TILE);
      if (ch === ',') {
        ctx.fillStyle = '#152a4a';
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
  for (const spot of FLOWER_SPOTS) {
    ctx.fillStyle = spot.c > 0.66 ? '#7d8fb8' : spot.c > 0.33 ? '#3d5a86' : '#27405f';
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHedgesAndCover(ctx, level) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const ch = level.map[ty][tx];
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === '#') {
        ctx.fillStyle = '#0e2b1a';
        ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
        ctx.fillStyle = '#17452a';
        ctx.fillRect(x + 3, y + 3, TILE - 6, 9);
        ctx.fillStyle = '#1d5a35';
        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath();
          ctx.arc(x + 8 + i * 12, y + 24 + ((tx + ty + i) % 2) * 6, 3.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (ch === 'B') {
        ctx.fillStyle = '#123524';
        ctx.beginPath();
        ctx.arc(x + 12, y + 22, 15, 0, Math.PI * 2);
        ctx.arc(x + 28, y + 18, 13, 0, Math.PI * 2);
        ctx.arc(x + 20, y + 28, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e5c39';
        ctx.beginPath();
        ctx.arc(x + 12, y + 18, 4, 0, Math.PI * 2);
        ctx.arc(x + 27, y + 26, 4, 0, Math.PI * 2);
        ctx.arc(x + 20, y + 12, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (ch === 'C') {
        ctx.fillStyle = '#4a3419';
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.strokeStyle = '#6b4d26';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + TILE - 4, y + TILE - 4);
        ctx.moveTo(x + TILE - 4, y + 4);
        ctx.lineTo(x + 4, y + TILE - 4);
        ctx.stroke();
      }
    }
  }
}

function drawLantern(ctx, x, y, time) {
  const flicker = 0.85 + Math.sin(time * 2.1 + x) * 0.08 + Math.sin(time * 5.7 + y) * 0.05;
  const glow = ctx.createRadialGradient(x, y - 8, 4, x, y - 8, 86);
  glow.addColorStop(0, `rgba(255, 190, 90, ${0.34 * flicker})`);
  glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 86, y - 94, 172, 172);
  ctx.fillStyle = '#2c2118';
  ctx.fillRect(x - 2, y - 4, 4, 18);
  ctx.fillStyle = '#ffb84d';
  ctx.beginPath();
  ctx.arc(x, y - 8, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe6a8';
  ctx.beginPath();
  ctx.arc(x, y - 8, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawMothCollectible(ctx, moth, time) {
  if (moth.taken) return;
  const bob = Math.sin(time * 2.4 + moth.phase) * 3;
  const glow = ctx.createRadialGradient(moth.x, moth.y + bob, 1, moth.x, moth.y + bob, 22);
  glow.addColorStop(0, 'rgba(190, 225, 255, 0.85)');
  glow.addColorStop(1, 'rgba(190, 225, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(moth.x - 22, moth.y + bob - 22, 44, 44);
  const flap = Math.sin(time * 9 + moth.phase) * 0.5;
  ctx.fillStyle = '#dfeeff';
  ctx.save();
  ctx.translate(moth.x, moth.y + bob);
  ctx.rotate(-0.5 - flap * 0.4);
  ctx.beginPath();
  ctx.ellipse(-5, -2, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(1 + flap * 0.8);
  ctx.beginPath();
  ctx.ellipse(5, -2, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#5a6b8a';
  ctx.beginPath();
  ctx.arc(moth.x, moth.y + bob, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawLetter(ctx, letter, time) {
  if (!letter || letter.taken) return;
  const bob = Math.sin(time * 2.6) * 2;
  const glow = ctx.createRadialGradient(letter.x, letter.y + bob, 2, letter.x, letter.y + bob, 34);
  glow.addColorStop(0, 'rgba(255, 214, 120, 0.5)');
  glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(letter.x - 34, letter.y + bob - 34, 68, 68);
  ctx.save();
  ctx.translate(letter.x, letter.y + bob);
  ctx.rotate(Math.sin(time * 1.4) * 0.12);
  ctx.fillStyle = '#f3e3b3';
  ctx.fillRect(-11, -8, 22, 16);
  ctx.strokeStyle = '#b3924d';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-11, -8);
  ctx.lineTo(0, 1);
  ctx.lineTo(11, -8);
  ctx.stroke();
  ctx.restore();
}

function drawExit(ctx, exit, open, time) {
  const pulse = open ? 0.75 + Math.sin(time * 3) * 0.2 : 0.3;
  const glow = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, 56);
  glow.addColorStop(0, open ? `rgba(120, 255, 170, ${pulse})` : 'rgba(120, 160, 255, 0.25)');
  glow.addColorStop(1, 'rgba(120, 255, 170, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(exit.x - 56, exit.y - 56, 112, 112);
  ctx.strokeStyle = open ? '#7dffab' : '#8fa8d8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(exit.x, exit.y + 8, 22, Math.PI, 0);
  ctx.moveTo(exit.x - 22, exit.y + 8);
  ctx.lineTo(exit.x - 22, exit.y + 20);
  ctx.moveTo(exit.x + 22, exit.y + 8);
  ctx.lineTo(exit.x + 22, exit.y + 20);
  ctx.stroke();
  ctx.fillStyle = open ? 'rgba(125, 255, 171, 0.85)' : 'rgba(143, 168, 216, 0.5)';
  ctx.fillRect(exit.x - 18, exit.y - 12, 36, 26);
  if (!open) {
    ctx.strokeStyle = '#d8b25a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(exit.x - 18, exit.y + 2);
    ctx.lineTo(exit.x + 18, exit.y + 2);
    ctx.moveTo(exit.x - 12, exit.y - 8);
    ctx.lineTo(exit.x + 12, exit.y + 10);
    ctx.stroke();
  }
  ctx.fillStyle = open ? '#0e3d22' : '#33456b';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT OPEN' : 'LOCKED', exit.x, exit.y + 38);
}

function drawGuard(ctx, guard, time) {
  const dir = guard.dir;
  ctx.fillStyle = coneColor(guard);
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, VISION_RANGE, dir - VISION_HALF_ANGLE, dir + VISION_HALF_ANGLE);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = coneColor(guard).replace(/0\.\d+\)$/, '0.55)');
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, VISION_RANGE, dir - VISION_HALF_ANGLE, dir + VISION_HALF_ANGLE);
  ctx.closePath();
  ctx.stroke();

  // Lantern-carrier: amber body, helmet, swinging lantern.
  const bob = Math.sin(guard.stepPhase) * 1.5;
  ctx.fillStyle = '#7a4d16';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a86f24';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob, 13, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#3a2a12';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob - 2, 8, 0, Math.PI * 2);
  ctx.fill();
  const lampX = guard.x + Math.cos(dir) * 17;
  const lampY = guard.y + Math.sin(dir) * 17 + bob;
  const glow = ctx.createRadialGradient(lampX, lampY, 1, lampX, lampY, 26);
  glow.addColorStop(0, 'rgba(255, 190, 90, 0.55)');
  glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(lampX - 26, lampY - 26, 52, 52);
  ctx.fillStyle = '#ffcf6e';
  ctx.beginPath();
  ctx.arc(lampX, lampY, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Alert meter arc and mark.
  if (guard.alert > 2) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y + bob, 19, -Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();
    ctx.strokeStyle = guard.state === STATE_CHASE ? '#ff4030' : '#ffb030';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y + bob, 19, -Math.PI / 2, -Math.PI / 2 + (guard.alert / 100) * Math.PI * 2);
    ctx.stroke();
  }
  if (guard.state === STATE_CHASE) {
    ctx.fillStyle = '#ff5040';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y + bob - 26);
  } else if (guard.state === STATE_SUSPICIOUS) {
    ctx.fillStyle = '#ffb030';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y + bob - 26);
  }
}

function drawPlayer(ctx, player, time) {
  const flap = Math.sin(player.wingPhase) * 0.55;
  const glow = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, 34);
  glow.addColorStop(0, 'rgba(150, 200, 255, 0.30)');
  glow.addColorStop(1, 'rgba(150, 200, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(player.x - 34, player.y - 34, 68, 68);
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.dir);
  ctx.fillStyle = player.hidden ? 'rgba(214, 230, 255, 0.55)' : '#d6e6ff';
  ctx.beginPath();
  ctx.ellipse(-7, -7 - flap * 5, 9, 5.5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-7, 7 + flap * 5, 9, 5.5, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2c3550';
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd76e';
  ctx.beginPath();
  ctx.arc(9, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (player.hidden || player.ducking) {
    // A hidden moth is hard to see by design, but never invisible: a soft
    // dashed ring keeps it locatable for the player (and the judge).
    ctx.strokeStyle = 'rgba(214, 230, 255, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawNoiseRing(ctx, player) {
  if (player.noiseRadius <= 4) return;
  const alpha = Math.max(0, 0.5 - (player.noisePulse % 1) * 0.4);
  ctx.strokeStyle = `rgba(255, 220, 130, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.noiseRadius * (0.55 + (player.noisePulse % 1) * 0.45), 0, Math.PI * 2);
  ctx.stroke();
}

function alertWord(game) {
  let worst = 0;
  let worstState = null;
  for (const guard of game.guards) {
    if (guard.alert > worst) {
      worst = guard.alert;
      worstState = guard.state;
    }
  }
  if (worstState === STATE_CHASE) return { text: 'SPOTTED — RUN!', color: '#ff5040' };
  if (worstState === STATE_SUSPICIOUS) return { text: 'Suspicious…', color: '#ffb030' };
  return { text: 'Unseen', color: '#7dffab' };
}

function drawHud(ctx, game) {
  const level = game.levelDef;
  ctx.fillStyle = 'rgba(4, 8, 18, 0.82)';
  ctx.fillRect(0, 0, WORLD_W, 34);
  ctx.fillStyle = '#8fa8d8';
  ctx.font = 'bold 14px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Level ${game.levelIndex + 1}/3 — ${level.name}`, 12, 22);
  ctx.fillStyle = '#dfeeff';
  ctx.font = '13px Georgia, serif';
  const moths = game.placedMoths.filter((m) => m.taken).length;
  ctx.fillText(`Moon-moths ${moths}/3`, 300, 22);
  ctx.fillText(game.player.hasLetter ? 'Letter ✓' : 'Letter ✗', 430, 22);
  const alert = alertWord(game);
  ctx.fillStyle = alert.color;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(alert.text, 540, 22);
  ctx.fillStyle = '#dfeeff';
  ctx.font = '13px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Score ${game.score}   ${Math.floor(game.elapsed)}s`, WORLD_W - 12, 22);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#5f739e';
  ctx.font = '12px Georgia, serif';
  const tip = game.player.hasLetter
    ? 'The gate is open — reach it unseen.'
    : 'Find the lantern letter, then slip out through the gate.';
  ctx.fillText(tip, 12, WORLD_H - 10);
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(3, 6, 14, 0.72)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, WORLD_W / 2, 210);
  ctx.fillStyle = '#dfeeff';
  ctx.font = '17px Georgia, serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, WORLD_W / 2, 260 + i * 30);
  });
  ctx.textAlign = 'left';
}

export function render(ctx, game, time) {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);
  drawFloor(ctx, game.levelDef, time);
  for (const lantern of game.lanterns) drawLantern(ctx, lantern.x, lantern.y, time);
  drawHedgesAndCover(ctx, game.levelDef);
  for (const moth of game.placedMoths) drawMothCollectible(ctx, moth, time);
  drawLetter(ctx, game.letter, time);
  drawExit(ctx, game.exit, game.player.hasLetter, time);
  for (const guard of game.guards) drawGuard(ctx, guard, time);
  drawNoiseRing(ctx, game.player);
  drawPlayer(ctx, game.player, time);
  drawHud(ctx, game);

  if (game.screen === SCREEN_TITLE) {
    overlay(ctx, 'MOTHLIGHT', [
      'The Night Courier',
      'Carry the lantern letter through the sleeping manor garden.',
      'WASD / arrows to move · Shift to sneak · Space to duck in cover',
      'Running is loud — guards hear it. Bushes hide a still moth.',
      '',
      'Press Enter or click to begin',
    ], '#ffd76e');
  } else if (game.screen === SCREEN_LEVEL_CLEAR) {
    overlay(ctx, 'DELIVERED', [
      `Level ${game.levelIndex + 1} clear — the letter is through.`,
      `Score ${game.score} · Moon-moths ${game.player.moths}/3 this level`,
      '',
      'Press Enter for the next garden',
    ], '#7dffab');
  } else if (game.screen === SCREEN_CAUGHT) {
    overlay(ctx, 'CAUGHT!', [
      'A lantern found you. The garden wakes, and the letter is lost.',
      `Score ${game.score}`,
      '',
      'Press Enter to try this garden again',
    ], '#ff5040');
  } else if (game.screen === SCREEN_WIN) {
    overlay(ctx, 'THE LETTER IS HOME', [
      'Three gardens crossed unseen. The manor sleeps on, none the wiser.',
      `Final score ${game.score} · Time ${Math.floor(game.elapsed)}s`,
      '',
      'Press Enter to play again',
    ], '#ffd76e');
  }
}
