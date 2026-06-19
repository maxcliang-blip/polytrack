import * as CANNON from "cannon-es";

export class HUD {
  private container: HTMLDivElement;
  private speedEl: HTMLDivElement;
  private timeEl: HTMLDivElement;
  private modeEl: HTMLDivElement;
  private infoEl: HTMLDivElement;
  private ghostEl: HTMLDivElement;

  private startTime = 0;
  private running = false;

  constructor() {
    this.container = document.createElement("div");
    this.container.style.cssText = `
      position:fixed;inset:0;pointer-events:none;font-family:monospace;
      color:#fff;z-index:10;
    `;

    this.modeEl = document.createElement("div");
    this.modeEl.style.cssText = `
      position:absolute;top:16px;left:16px;font-size:14px;
      background:rgba(0,0,0,0.5);padding:6px 12px;border-radius:4px;
    `;

    this.timeEl = document.createElement("div");
    this.timeEl.style.cssText = `
      position:absolute;top:16px;left:50%;transform:translateX(-50%);
      font-size:28px;font-weight:bold;text-shadow:0 2px 4px rgba(0,0,0,0.5);
    `;

    this.speedEl = document.createElement("div");
    this.speedEl.style.cssText = `
      position:absolute;bottom:32px;right:24px;font-size:32px;
      font-weight:bold;text-shadow:0 2px 4px rgba(0,0,0,0.5);
    `;

    this.infoEl = document.createElement("div");
    this.infoEl.style.cssText = `
      position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
      font-size:13px;opacity:0.7;text-shadow:0 1px 3px rgba(0,0,0,0.5);
      text-align:center;white-space:pre;
    `;

    this.ghostEl = document.createElement("div");
    this.ghostEl.style.cssText = `
      position:absolute;top:52px;right:16px;font-size:13px;
      background:rgba(0,255,255,0.15);color:#0ff;
      padding:4px 10px;border-radius:4px;
    `;
    this.ghostEl.textContent = "GHOST";
    this.ghostEl.style.display = "none";

    this.container.appendChild(this.modeEl);
    this.container.appendChild(this.timeEl);
    this.container.appendChild(this.speedEl);
    this.container.appendChild(this.infoEl);
    this.container.appendChild(this.ghostEl);
    document.body.appendChild(this.container);
  }

  setMode(mode: "play" | "edit") {
    this.modeEl.textContent = mode === "edit" ? "EDIT MODE [Tab]" : "PLAY";
    this.modeEl.style.color = mode === "edit" ? "#ff0" : "#0f0";

    if (mode === "edit") {
      this.infoEl.textContent =
        "LMB: Place  |  RMB: Delete  |  1-4: Piece type  |  R: Rotate\nDrag: Orbit  |  Scroll: Zoom  |  Shift+Scroll: Pan";
    } else {
      this.infoEl.textContent =
        "WASD/Arrows: Drive  |  R/Enter: Restart  |  Tab: Editor";
    }
  }

  setInfoText(text: string) {
    this.infoEl.textContent = text;
  }

  showGhost(visible: boolean) {
    this.ghostEl.style.display = visible ? "block" : "none";
  }

  startTimer() {
    this.startTime = performance.now();
    this.running = true;
  }

  stopTimer() {
    this.running = false;
  }

  resetTimer() {
    this.startTime = performance.now();
    this.running = true;
  }

  update(chassisBody: CANNON.Body | null) {
    // Speed
    if (chassisBody) {
      const v = chassisBody.velocity;
      const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      this.speedEl.textContent = `${Math.round(speed * 10)} km/h`;
    }

    // Timer
    if (this.running) {
      const elapsed = (performance.now() - this.startTime) / 1000;
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      this.timeEl.textContent = `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
    }
  }

  dispose() {
    document.body.removeChild(this.container);
  }
}
