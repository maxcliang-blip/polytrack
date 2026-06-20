export class InputManager {
  keys: Set<string> = new Set();
  private justPressedKeys: Set<string> = new Set();

  mouseX = 0;
  mouseY = 0;

  // Touch state (set by TouchControls)
  touchForward = false;
  touchBackward = false;
  touchLeft = false;
  touchRight = false;
  private _touchRestart = false;
  private _touchToggleMode = false;
  private _touchDelete = false;

  constructor() {
    window.addEventListener("keydown", (e) => {
      if (!this.keys.has(e.code)) {
        this.justPressedKeys.add(e.code);
      }
      this.keys.add(e.code);
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener("mousemove", (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  wasPressed(code: string): boolean {
    return this.justPressedKeys.has(code);
  }

  triggerTouchRestart() {
    this._touchRestart = true;
  }

  triggerTouchToggleMode() {
    this._touchToggleMode = true;
  }

  triggerTouchDelete() {
    this._touchDelete = true;
  }

  clearFrame() {
    this.justPressedKeys.clear();
    this._touchRestart = false;
    this._touchToggleMode = false;
    this._touchDelete = false;
  }

  get forward(): boolean {
    return this.touchForward || this.isDown("KeyW") || this.isDown("ArrowUp");
  }
  get backward(): boolean {
    return this.touchBackward || this.isDown("KeyS") || this.isDown("ArrowDown");
  }
  get left(): boolean {
    return this.touchLeft || this.isDown("KeyA") || this.isDown("ArrowLeft");
  }
  get right(): boolean {
    return this.touchRight || this.isDown("KeyD") || this.isDown("ArrowRight");
  }
  get restart(): boolean {
    return this._touchRestart || this.wasPressed("KeyR") || this.wasPressed("Enter");
  }
  get toggleMode(): boolean {
    return this._touchToggleMode || this.wasPressed("Tab");
  }
  get deletePressed(): boolean {
    return this._touchDelete || this.wasPressed("Delete") || this.wasPressed("Backspace");
  }
}
