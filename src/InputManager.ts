export class InputManager {
  keys: Set<string> = new Set();
  private justPressedKeys: Set<string> = new Set();

  mouseX = 0;
  mouseY = 0;

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

  clearFrame() {
    this.justPressedKeys.clear();
  }

  get forward(): boolean {
    return this.isDown("KeyW") || this.isDown("ArrowUp");
  }
  get backward(): boolean {
    return this.isDown("KeyS") || this.isDown("ArrowDown");
  }
  get left(): boolean {
    return this.isDown("KeyA") || this.isDown("ArrowLeft");
  }
  get right(): boolean {
    return this.isDown("KeyD") || this.isDown("ArrowRight");
  }
  get restart(): boolean {
    return this.wasPressed("KeyR") || this.wasPressed("Enter");
  }
  get toggleMode(): boolean {
    return this.wasPressed("Tab");
  }
}
