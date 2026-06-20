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
      background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);
      font-family:monospace;color:#fff;
    `;

    const title = document.createElement("h1");
    title.textContent = "PolyTrack";
    title.style.cssText = `
      font-size:64px;font-weight:bold;margin-bottom:8px;
      text-shadow:0 0 40px rgba(0,200,255,0.3);
      letter-spacing:4px;
    `;
    this.container.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.textContent = "Low-Poly Racing";
    subtitle.style.cssText = `
      font-size:16px;opacity:0.5;margin-bottom:48px;letter-spacing:6px;text-transform:uppercase;
    `;
    this.container.appendChild(subtitle);

    const btnStyle = `
      width:260px;height:52px;margin:8px;border:none;border-radius:8px;
      font-family:monospace;font-size:18px;font-weight:bold;cursor:pointer;
      transition:transform 0.15s,box-shadow 0.15s;
    `;

    const playBtn = document.createElement("button");
    playBtn.textContent = "▶  PLAY";
    playBtn.style.cssText = btnStyle +
      "background:#e63946;color:#fff;box-shadow:0 4px 20px rgba(230,57,70,0.4);";
    playBtn.onmouseenter = () => { playBtn.style.transform = "scale(1.05)"; playBtn.style.boxShadow = "0 6px 30px rgba(230,57,70,0.6)"; };
    playBtn.onmouseleave = () => { playBtn.style.transform = ""; playBtn.style.boxShadow = "0 4px 20px rgba(230,57,70,0.4)"; };
    playBtn.onclick = () => this.callback?.("play");
    this.container.appendChild(playBtn);

    const editorBtn = document.createElement("button");
    editorBtn.textContent = "✎  TRACK EDITOR";
    editorBtn.style.cssText = btnStyle +
      "background:transparent;color:#fff;border:2px solid rgba(255,255,255,0.3);";
    editorBtn.onmouseenter = () => { editorBtn.style.borderColor = "#fff"; editorBtn.style.background = "rgba(255,255,255,0.1)"; };
    editorBtn.onmouseleave = () => { editorBtn.style.borderColor = "rgba(255,255,255,0.3)"; editorBtn.style.background = "transparent"; };
    editorBtn.onclick = () => this.callback?.("editor");
    this.container.appendChild(editorBtn);

    const controls = document.createElement("div");
    controls.style.cssText = `
      position:absolute;bottom:24px;font-size:12px;opacity:0.35;text-align:center;line-height:1.8;
    `;
    controls.innerHTML = "WASD / Arrows: Drive &nbsp;|&nbsp; R: Restart &nbsp;|&nbsp; Tab: Editor<br>Mobile: Touch controls on-screen";
    this.container.appendChild(controls);

    document.body.appendChild(this.container);
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
