export type MenuAction = "play" | "editor";

export class Menu {
  private container: HTMLDivElement;
  private callback: ((action: MenuAction) => void) | null = null;

  constructor() {
    this.container = document.createElement("div");
    this.container.id = "main-menu";
    this.container.style.cssText = `
      position:fixed;inset:0;z-index:100;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:#111;font-family:monospace;color:#fff;
    `;

    const title = document.createElement("div");
    title.textContent = "POLYTRACK";
    title.style.cssText = `
      font-size:56px;font-weight:900;margin-bottom:4px;
      letter-spacing:6px;color:#eee;
    `;
    this.container.appendChild(title);

    const line = document.createElement("div");
    line.style.cssText = "width:60px;height:2px;background:#e63946;margin:16px 0 32px 0;";
    this.container.appendChild(line);

    const playBtn = this.makeBtn("PLAY", false);
    playBtn.onclick = () => this.callback?.("play");
    this.container.appendChild(playBtn);

    const editorBtn = this.makeBtn("TRACK EDITOR", true);
    editorBtn.onclick = () => this.callback?.("editor");
    this.container.appendChild(editorBtn);

    const controls = document.createElement("div");
    controls.style.cssText = `
      position:absolute;bottom:28px;font-size:11px;opacity:0.25;
      text-align:center;line-height:1.8;letter-spacing:0.5px;
    `;
    controls.innerHTML = "WASD / Arrows &nbsp;|&nbsp; R / Enter: Restart &nbsp;|&nbsp; Tab: Editor";
    this.container.appendChild(controls);

    document.body.appendChild(this.container);
  }

  private makeBtn(text: string, outline: boolean): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.cssText = `
      width:220px;height:46px;margin:5px;border-radius:4px;
      font-family:monospace;font-size:14px;font-weight:700;cursor:pointer;
      letter-spacing:2px;transition:background 0.15s;
      ${
        outline
          ? "background:transparent;color:#888;border:1px solid #333;"
          : "background:#e63946;color:#fff;border:none;"
      }
    `;
    btn.onmouseenter = () => {
      btn.style.background = outline ? "rgba(255,255,255,0.08)" : "#ff4d5a";
      btn.style.color = "#fff";
    };
    btn.onmouseleave = () => {
      btn.style.background = outline ? "transparent" : "#e63946";
      btn.style.color = outline ? "#888" : "#fff";
    };
    return btn;
  }

  onAction(cb: (action: MenuAction) => void) {
    this.callback = cb;
  }

  hide() {
    this.container.style.display = "none";
  }

  dispose() {
    document.body.removeChild(this.container);
  }
}
