import * as THREE from "three";
import * as CANNON from "cannon-es";
import { TrackPiece, TrackPieceData } from "./TrackPiece";

// A simple oval track layout
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

export class Track {
  pieces: TrackPiece[] = [];

  constructor(scene: THREE.Scene, world: CANNON.World) {
    for (const data of DEFAULT_TRACK) {
      this.pieces.push(new TrackPiece(scene, world, data));
    }
  }

  update(dt: number) {
    // Future: animated elements, checkpoints, etc.
  }
}
