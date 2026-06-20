import { InputManager } from "./InputManager";
import { Editor } from "./Editor";

const DEAD_ZONE = 0.25;

export class TouchControls {
  private container: HTMLDivElement | null = null;
  private joystickArea: HTMLDivElement | null = null;
  private joystickKnob: HTMLDivElement | null = null;
  private actionBtns: HTMLDivElement | null = null;
  private editBtns: HTMLDivElement | null = null;

  private joystickId = -1;
  private joystickCenter = { x: 0, y: 0 };
  private joystickVal = { x: 0, y: 0 };

  private input: InputManager;
  private editor: Editor;
  private mode: "play" | "edit" = "play";
  private enabled = false;

  constructor(input: InputManager, editor: Editor) {
    this.input = input;
    this.editor = editor;

    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isMobile) return;

    this.enabled = true;
    this.buildUI();
  }

  private buildUI() {
    this.container = document.createElement("div");
    this.container.id = "touch-controls";
    this.container.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:20;touch-action:none;";

    this.joystickArea = this.buildJoystick();
    this.actionBtns = this.buildActionButtons();
    this.editBtns = this.buildEditButtons();

    this.container.appendChild(this.joystickArea);
    this.container.appendChild(this.actionBtns);
    this.container.appendChild(this.editBtns);
    document.body.appendChild(this.container);

    this.setMode("play");
  }

  setMode(mode: "play" | "edit") {
    if (!this.enabled) return;
    this.mode = mode;
    if (this.actionBtns) this.actionBtns.style.display = mode === "play" ? "" : "none";
    if (this.editBtns) this.editBtns.style.display = mode === "edit" ? "" : "none";
  }

  private buildJoystick(): HTMLDivElement {
    const area = document.createElement("div");
    area.style.cssText =
      "position:absolute;left:24px;bottom:40px;width:140px;height:140px;" +
      "pointer-events:auto;border-radius:50%;" +
      "background:rgba(255,255,255,0.08);border:2px solid rgba(255,255,255,0.15);";

    const knob = document.createElement("div");
    knob.style.cssText =
      "position:absolute;top:50%;left:50%;width:50px;height:50px;" +
      "margin:-25px 0 0 -25px;border-radius:50%;" +
      "background:rgba(255,255,255,0.25);border:2px solid rgba(255,255,255,0.4);";
    this.joystickKnob = knob;
    area.appendChild(knob);

    area.addEventListener("touchstart", (e: TouchEvent) => {
      if (this.joystickId >= 0) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      this.joystickId = t.identifier;
      const r = area.getBoundingClientRect();
      this.joystickCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      this.updateJoystick(t.clientX, t.clientY);
    });

    document.addEventListener("touchmove", (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.joystickId) {
          e.preventDefault();
          this.updateJoystick(t.clientX, t.clientY);
        }
      }
    }, { passive: false });

    document.addEventListener("touchend", (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickId) {
          this.joystickId = -1;
          this.joystickVal = { x: 0, y: 0 };
          if (this.joystickKnob) this.joystickKnob.style.transform = "translate(-50%, -50%)";
        }
      }
    });

    return area;
  }

  private updateJoystick(cx: number, cy: number) {
    const dx = cx - this.joystickCenter.x;
    const dy = cy - this.joystickCenter.y;
    const r = Math.min(45, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);
    this.joystickVal = {
      x: (r / 45) * Math.cos(angle),
      y: (r / 45) * Math.sin(angle),
    };
    if (this.joystickKnob) {
      this.joystickKnob.style.transform =
        `translate(${-25 + r * Math.cos(angle)}px, ${-25 + r * Math.sin(angle)}px)`;
    }
  }

  private styledBtn(text: string, extraCss = ""): HTMLDivElement {
    const btn = document.createElement("div");
    btn.style.cssText =
      "pointer-events:auto;display:flex;align-items:center;justify-content:center;" +
      "font-family:monospace;font-size:14px;font-weight:bold;color:#fff;" +
      "background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);" +
      "border-radius:8px;user-select:none;-webkit-user-select:none;" +
      extraCss;
    btn.textContent = text;
    return btn;
  }

  private buildActionButtons(): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:absolute;right:16px;bottom:40px;display:flex;flex-direction:column;gap:10px;";

    const restartBtn = this.styledBtn("RESTART", "width:72px;height:48px;font-size:11px;");
    restartBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.input.triggerTouchRestart();
    });
    wrap.appendChild(restartBtn);

    const modeBtn = this.styledBtn("EDIT", "width:72px;height:48px;font-size:11px;");
    modeBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.input.triggerTouchToggleMode();
    });
    wrap.appendChild(modeBtn);

    return wrap;
  }

  private buildEditButtons(): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:absolute;bottom:16px;left:50%;transform:translateX(-50%);" +
      "display:flex;gap:8px;pointer-events:none;display:none;";

    const order: ("straight" | "turn" | "start" | "finish")[] = ["straight", "turn", "start", "finish"];
    const labels = ["S", "T", "St", "F"];
    for (let i = 0; i < 4; i++) {
      const btn = this.styledBtn(labels[i], "width:48px;height:44px;font-size:12px;");
      const idx = i;
      btn.addEventListener("touchstart", (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.mode !== "edit") return;
        this.editor.currentType = order[idx];
      });
      wrap.appendChild(btn);
    }

    const rotBtn = this.styledBtn("R", "width:44px;height:44px;font-size:16px;");
    rotBtn.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.mode !== "edit") return;
      this.editor.currentRotation += Math.PI / 2;
      if (this.editor.currentRotation >= Math.PI * 2) this.editor.currentRotation = 0;
    });
    wrap.appendChild(rotBtn);

    const delBtn = this.styledBtn("DEL", "width:48px;height:44px;font-size:11px;");
    delBtn.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.mode !== "edit") return;
      this.input.triggerTouchDelete();
    });
    wrap.appendChild(delBtn);

    const playBtn = this.styledBtn("PLAY",
      "width:48px;height:44px;font-size:11px;background:rgba(0,200,0,0.2);border-color:rgba(0,200,0,0.4);");
    playBtn.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.input.triggerTouchToggleMode();
    });
    wrap.appendChild(playBtn);

    return wrap;
  }

  update() {
    if (!this.enabled) return;
    const v = this.joystickVal;
    this.input.touchForward = v.y < -DEAD_ZONE;
    this.input.touchBackward = v.y > DEAD_ZONE;
    this.input.touchLeft = v.x < -DEAD_ZONE;
    this.input.touchRight = v.x > DEAD_ZONE;
  }

  dispose() {
    if (this.container && this.container.parentNode) {
      document.body.removeChild(this.container);
    }
  }
}
