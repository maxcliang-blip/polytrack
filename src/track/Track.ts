import * as THREE from "three";
import * as CANNON from "cannon-es";
import { TrackPiece, TrackPieceData } from "./TrackPiece";
import { ROAD_LENGTH } from "./TrackPiece";

const DEFAULT_TRACK: TrackPieceData[] = [
  { type: "start", x: 0, z: 0, rotation: 0 },
  { type: "straight", x: 0, z: -8, rotation: 0 },
  { type: "straight", x: 0, z: -16, rotation: 0 },
  { type: "turn", x: 0, z: -24, rotation: 0 },
  { type: "straight", x: 8, z: -24, rotation: Math.PI / 2 },
  { type: "straight", x: 16, z: -24, rotation: Math.PI / 2 },
  { type: "turn", x: 24, z: -24, rotation: Math.PI / 2 },
  { type: "straight", x: 24, z: -16, rotation: Math.PI },
  { type: "straight", x: 24, z: -8, rotation: Math.PI },
  { type: "turn", x: 24, z: 0, rotation: Math.PI },
  { type: "straight", x: 16, z: 0, rotation: -Math.PI / 2 },
  { type: "straight", x: 8, z: 0, rotation: -Math.PI / 2 },
];

const SAVE_KEY = "polytrack_track";

export class Track {
  pieces: TrackPiece[] = [];
  private scene: THREE.Scene;
  private world: CANNON.World;

  constructor(scene: THREE.Scene, world: CANNON.World) {
    this.scene = scene;
    this.world = world;
    this.load();
  }

  private load() {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved) as TrackPieceData[];
        for (const d of data) {
          this.pieces.push(new TrackPiece(this.scene, this.world, d));
        }
        return;
      } catch {}
    }
    for (const data of DEFAULT_TRACK) {
      this.pieces.push(new TrackPiece(this.scene, this.world, data));
    }
  }

  save() {
    const data = this.pieces.map((p) => p.data);
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  addPiece(data: TrackPieceData): TrackPiece {
    const piece = new TrackPiece(this.scene, this.world, data);
    this.pieces.push(piece);
    return piece;
  }

  removePieceAt(gx: number, gz: number): boolean {
    const idx = this.pieces.findIndex(
      (p) => Math.round(p.data.x / ROAD_LENGTH) === gx &&
             Math.round(p.data.z / ROAD_LENGTH) === gz
    );
    if (idx === -1) return false;
    const piece = this.pieces[idx];
    piece.dispose();
    this.pieces.splice(idx, 1);
    return true;
  }

  isOccupied(gx: number, gz: number): boolean {
    return this.pieces.some(
      (p) => Math.round(p.data.x / ROAD_LENGTH) === gx &&
             Math.round(p.data.z / ROAD_LENGTH) === gz
    );
  }

  clear() {
    for (const p of this.pieces) p.dispose();
    this.pieces = [];
  }

  toData(): TrackPieceData[] {
    return this.pieces.map((p) => ({ ...p.data }));
  }

  update(_dt: number) {}
}
