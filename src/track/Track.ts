import * as THREE from "three";
import * as CANNON from "cannon-es";
import { TrackPiece, TrackPieceData, EntryFace } from "./TrackPiece";
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

function computeEntryFace(data: TrackPieceData[], i: number): EntryFace {
  const prev = data[i - 1];
  if (!prev) return "+z";
  const dx = Math.round((data[i].x - prev.x) / 8);
  const dz = Math.round((data[i].z - prev.z) / 8);
  if (dx !== 0) return dx < 0 ? "-x" : "+x";
  return dz < 0 ? "-z" : "+z";
}

function computeEntryFaces(data: TrackPieceData[]) {
  for (let i = 0; i < data.length; i++) {
    if (data[i].type === "turn" && !data[i].entryFace) {
      data[i].entryFace = computeEntryFace(data, i);
    }
  }
}

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
        computeEntryFaces(data);
        for (const d of data) {
          this.pieces.push(new TrackPiece(this.scene, this.world, d));
        }
        return;
      } catch {}
    }
    const defaultData = [...DEFAULT_TRACK];
    computeEntryFaces(defaultData);
    for (const d of defaultData) {
      this.pieces.push(new TrackPiece(this.scene, this.world, d));
    }
  }

  save() {
    const data = this.pieces.map((p) => {
      const { entryFace, ...rest } = p.data;
      return rest;
    });
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  addPiece(data: TrackPieceData): TrackPiece {
    if (data.type === "turn" && !data.entryFace) {
      data.entryFace = computeEntryFace(
        [...this.pieces.map(p => p.data), data],
        this.pieces.length
      );
    }
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

  loadData(data: TrackPieceData[]) {
    this.clear();
    computeEntryFaces(data);
    for (const d of data) {
      this.pieces.push(new TrackPiece(this.scene, this.world, d));
    }
  }

  update(_dt: number) {}
}
