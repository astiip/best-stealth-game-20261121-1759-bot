// Keyboard and mouse state: movement keys, sneak, run, duck, and the
// confirm key that starts the game and moves between screens. Also tracks
// fresh presses (Enter, mute) so the game loop can act on them once.
const MOVE_KEYS = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

export class Input {
  constructor() {
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.sneak = false;
    this.duck = false;
    this.confirmPressed = false;
    this.mutePressed = false;
    this.anyPressed = false;
    this._held = new Set();
    this._onKeyDown = (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      this.anyPressed = true;
      if (event.repeat) return;
      this._held.add(event.code);
      const dir = MOVE_KEYS[event.code];
      if (dir) this[dir] = true;
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') this.sneak = true;
      if (event.code === 'Space' || event.code === 'KeyE') this.duck = true;
      if (event.code === 'Enter' || event.code === 'Space') this.confirmPressed = true;
      if (event.code === 'KeyM') this.mutePressed = true;
    };
    this._onKeyUp = (event) => {
      this._held.delete(event.code);
      const dir = MOVE_KEYS[event.code];
      if (dir) this[dir] = [...this._held].some((code) => MOVE_KEYS[code] === dir);
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        this.sneak = this._held.has('ShiftLeft') || this._held.has('ShiftRight');
      }
      if (event.code === 'Space' || event.code === 'KeyE') {
        this.duck = this._held.has('Space') || this._held.has('KeyE');
      }
    };
    this._onMouse = () => {
      this.anyPressed = true;
      this.confirmPressed = true;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousedown', this._onMouse);
  }

  get run() {
    // Hurrying is the default pace; sneak (Shift) or duck (Space) overrides
    // it. There is no separate run key: the moth hurries unless it is
    // sneaking or ducking, and hurrying is loud.
    return !this.sneak && !this.duck;
  }

  consumeConfirm() {
    const pressed = this.confirmPressed;
    this.confirmPressed = false;
    return pressed;
  }

  consumeMute() {
    const pressed = this.mutePressed;
    this.mutePressed = false;
    return pressed;
  }

  consumeAny() {
    const pressed = this.anyPressed;
    this.anyPressed = false;
    return pressed;
  }
}
