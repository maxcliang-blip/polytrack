import * as THREE from "three";
import { Track } from "./track/Track";
import {
  TrackPieceData,
  PieceType,
  ROAD_LENGTH,
  ROAD_WIDTH,
  ROAD_THICKNESS,
} from "./track/TrackPiece";

const GRID_SIZE = ROAD_LENGTH;
const GRID_EXTENT = 60;

const PIECE_ORDER: PieceType[] = ["straight", "turn", "start", "finish"];

export class Editor {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private track: Track;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private active = false;

  private gridLines: THREE.LineSegments | null = null;
  private preview: THREE.Group | null = null;
  private previewValid = false;

  currentType: PieceType = "straight";
  currentRotation = 0;

  // Orbit
  private orbitTarget = new THREE.Vector3(0, 0, 0);
  private orbitPhi = Math.PI / 4;
  private orbitTheta = Math.PI / 4;
  private orbitRadius = 40;
  private isOrbiting = false;
  private prevMouse = { x: 0, y: 0 };

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    track: Track
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.track = track;

    this.buildGrid();
    renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

    renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    renderer.domElement.addEventListener("pointermove", this.onPointerMove);
    renderer.domElement.addEventListener("pointerup", this.onPointerUp);
    renderer.domElement.addEventListener("wheel", this.onWheel, { passive: false });

    window.addEventListener("keydown", this.onKeyDown);
  }

  private buildGrid() {
    const verts: number[] = [];
    const half = GRID_EXTENT;
    const step = GRID_SIZE;

    for (let x = -half; x <= half; x += step) {
      verts.push(x, 0.05, -half, x, 0.05, half);
    }
    for (let z = -half; z <= half; z += step) {
      verts.push(-half, 0.05, z, half, 0.05, z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
    });
    this.gridLines = new THREE.LineSegments(geo, mat);
    this.gridLines.visible = false;
    this.scene.add(this.gridLines);
  }

  private getGridPos(clientX: number, clientY: number): { gx: number; gz: number } | null {
    this.pointer.x = (clientX / this.renderer.domElement.clientWidth) * 2 - 1;
    this.pointer.y = -(clientY / this.renderer.domElement.clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    const intersect = this.raycaster.ray.intersectPlane(plane, point);
    if (!intersect) return null;

    const gx = Math.round(point.x / GRID_SIZE);
    const gz = Math.round(point.z / GRID_SIZE);
    return { gx, gz };
  }

  private buildPreview(gx: number, gz: number) {
    this.clearPreview();

    const group = new THREE.Group();
    group.position.set(gx * GRID_SIZE, 0, gz * GRID_SIZE);
    group.rotation.y = this.currentRotation;

    const extra = 0.2;
    const geo = new THREE.BoxGeometry(ROAD_WIDTH + extra * 2, ROAD_THICKNESS, ROAD_LENGTH);
    const mat = new THREE.MeshStandardMaterial({
      color: this.track.isOccupied(gx, gz) ? 0xff0000 : 0x00ff00,
      transparent: true,
      opacity: 0.4,
      roughness: 0.8,
    });
    const road = new THREE.Mesh(geo, mat);
    road.position.y = ROAD_THICKNESS / 2;
    group.add(road);

    this.preview = group;
    this.scene.add(this.preview);
    this.previewValid = !this.track.isOccupied(gx, gz);
  }

  private clearPreview() {
    if (this.preview) {
      this.scene.remove(this.preview);
      this.preview = null;
    }
  }

  placePiece(gx: number, gz: number) {
    if (this.track.isOccupied(gx, gz)) return;
    const data: TrackPieceData = {
      type: this.currentType,
      x: gx * GRID_SIZE,
      z: gz * GRID_SIZE,
      rotation: this.currentRotation,
    };
    this.track.addPiece(data);
    this.track.save();
  }

  removePiece(gx: number, gz: number) {
    if (this.track.removePieceAt(gx, gz)) {
      this.track.save();
    }
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!this.active) return;
    if (e.button === 0) {
      const pos = this.getGridPos(e.clientX, e.clientY);
      if (pos) this.placePiece(pos.gx, pos.gz);
    } else if (e.button === 2) {
      this.isOrbiting = true;
      this.prevMouse.x = e.clientX;
      this.prevMouse.y = e.clientY;
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.active && !this.isOrbiting) return;
    if (this.isOrbiting) {
      const dx = e.clientX - this.prevMouse.x;
      const dy = e.clientY - this.prevMouse.y;
      this.orbitTheta -= dx * 0.01;
      this.orbitPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.orbitPhi + dy * 0.01));
      this.prevMouse.x = e.clientX;
      this.prevMouse.y = e.clientY;
      return;
    }
    const pos = this.getGridPos(e.clientX, e.clientY);
    if (pos) this.buildPreview(pos.gx, pos.gz);
    else this.clearPreview();
  };

  private onPointerUp = (_e: PointerEvent) => {
    this.isOrbiting = false;
  };

  private onWheel = (e: WheelEvent) => {
    if (e.shiftKey) {
      this.orbitTarget.y += e.deltaY * 0.1;
    } else {
      this.orbitRadius = Math.max(10, Math.min(120, this.orbitRadius + e.deltaY * 0.1));
    }
    e.preventDefault();
  };

  get mousePos() {
    // For delete, called from game loop
    return { x: 0, y: 0 };
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.active) return;
    if (e.code === "KeyR") {
      this.currentRotation += Math.PI / 2;
      if (this.currentRotation >= Math.PI * 2) this.currentRotation = 0;
      this.clearPreview();
    } else if (e.code === "Delete" || e.code === "Backspace") {
      // Delete is handled via the game loop with current cursor pos
    } else if (e.code.startsWith("Digit") || e.code.startsWith("Numpad")) {
      const num = parseInt(e.code.replace("Digit", "").replace("Numpad", ""), 10);
      if (num >= 1 && num <= PIECE_ORDER.length) {
        this.currentType = PIECE_ORDER[num - 1];
        this.clearPreview();
      }
    }
  };

  deleteAtCursor(clientX: number, clientY: number) {
    const pos = this.getGridPos(clientX, clientY);
    if (pos) this.removePiece(pos.gx, pos.gz);
  }

  update() {
    this.camera.position.x =
      this.orbitTarget.x + this.orbitRadius * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta);
    this.camera.position.y =
      this.orbitTarget.y + this.orbitRadius * Math.cos(this.orbitPhi);
    this.camera.position.z =
      this.orbitTarget.z + this.orbitRadius * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta);
    this.camera.lookAt(this.orbitTarget);
  }

  show() {
    this.active = true;
    if (this.gridLines) this.gridLines.visible = true;
  }

  hide() {
    this.active = false;
    if (this.gridLines) this.gridLines.visible = false;
    this.clearPreview();
  }

  dispose() {
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.removeEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.removeEventListener("pointerup", this.onPointerUp);
    this.renderer.domElement.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("keydown", this.onKeyDown);
    this.clearPreview();
    if (this.gridLines) {
      this.scene.remove(this.gridLines);
      this.gridLines.geometry.dispose();
      (this.gridLines.material as THREE.Material).dispose();
    }
  }
}
