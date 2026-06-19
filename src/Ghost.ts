import * as THREE from "three";
import * as CANNON from "cannon-es";

export interface GhostFrame {
  px: number; py: number; pz: number;
  qx: number; qy: number; qz: number; qw: number;
}

export class Ghost {
  private scene: THREE.Scene;
  private frames: GhostFrame[] = [];
  private playbackIndex = 0;
  private elapsed = 0;
  private mesh: THREE.Group | null = null;
  private _hasRecording = false;
  private _isPlaying = false;

  get hasRecording() { return this._hasRecording; }
  get isPlaying() { return this._isPlaying; }

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // Build a simple ghost car
  private buildMesh() {
    if (this.mesh) return;
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.3, 2.8),
      new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.35,
        roughness: 0.6,
      })
    );
    body.position.y = 0.15;
    group.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.3, 1.4),
      new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.25,
        roughness: 0.5,
      })
    );
    cabin.position.set(0, 0.45, -0.3);
    group.add(cabin);

    this.mesh = group;
    this.mesh.visible = false;
    this.scene.add(this.mesh);
  }

  startRecording() {
    this.frames = [];
    this._hasRecording = false;
    this._isPlaying = false;
    if (this.mesh) this.mesh.visible = false;
  }

  recordFrame(body: CANNON.Body) {
    this.frames.push({
      px: body.position.x,
      py: body.position.y,
      pz: body.position.z,
      qx: body.quaternion.x,
      qy: body.quaternion.y,
      qz: body.quaternion.z,
      qw: body.quaternion.w,
    });
  }

  stopRecording() {
    if (this.frames.length > 0) {
      this._hasRecording = true;
    }
  }

  startPlayback() {
    if (!this._hasRecording || this.frames.length < 2) return;
    this.buildMesh();
    this.playbackIndex = 0;
    this.elapsed = 0;
    this._isPlaying = true;
    if (this.mesh) this.mesh.visible = true;
  }

  stopPlayback() {
    this._isPlaying = false;
    if (this.mesh) this.mesh.visible = false;
  }

  clearRecording() {
    this.frames = [];
    this._hasRecording = false;
    this._isPlaying = false;
    if (this.mesh) this.mesh.visible = false;
  }

  update(dt: number) {
    if (!this._isPlaying || !this.mesh || this.frames.length < 2) return;

    this.elapsed += dt;

    // Each frame represents 1 physics step (1/60s)
    const frameDuration = 1 / 60;
    const targetIndex = Math.floor(this.elapsed / frameDuration);

    if (targetIndex >= this.frames.length - 1) {
      this.mesh.visible = false;
      this._isPlaying = false;
      return;
    }

    this.playbackIndex = targetIndex;

    const a = this.frames[this.playbackIndex];
    const b = this.frames[Math.min(this.playbackIndex + 1, this.frames.length - 1)];
    const t = (this.elapsed - this.playbackIndex * frameDuration) / frameDuration;

    this.mesh.position.set(
      a.px + (b.px - a.px) * t,
      a.py + (b.py - a.py) * t,
      a.pz + (b.pz - a.pz) * t
    );

    const q = new THREE.Quaternion();
    q.set(a.qx, a.qy, a.qz, a.qw);
    if (t > 0) {
      const qb = new THREE.Quaternion(b.qx, b.qy, b.qz, b.qw);
      q.slerp(qb, t);
    }
    this.mesh.quaternion.copy(q);
  }
}
