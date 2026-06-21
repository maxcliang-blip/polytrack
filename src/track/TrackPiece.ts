import * as THREE from "three";
import * as CANNON from "cannon-es";
import { isLowEnd } from "../Config";

export type PieceType = "straight" | "turn" | "start" | "finish";

export interface TrackPieceData {
  type: PieceType;
  x: number;
  z: number;
  rotation: number;
}

export const ROAD_WIDTH = 4;
export const ROAD_LENGTH = 8;
export const ROAD_THICKNESS = 0.3;
export const WALL_HEIGHT = 0.5;
export const WALL_THICKNESS = 0.2;

export class TrackPiece {
  mesh: THREE.Group;
  body: CANNON.Body;
  private scene: THREE.Scene;
  private world: CANNON.World;

  constructor(
    scene: THREE.Scene,
    world: CANNON.World,
    public data: TrackPieceData
  ) {
    this.scene = scene;
    this.world = world;

    this.mesh = new THREE.Group();
    this.mesh.position.set(data.x, 0, data.z);
    this.mesh.rotation.y = data.rotation;

    this.body = new CANNON.Body({ mass: 0 });
    this.body.position.set(data.x, 0, data.z);

    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), data.rotation);
    this.body.quaternion = q;

    switch (data.type) {
      case "straight":
      case "start":
      case "finish":
        this.buildStraight();
        break;
      case "turn":
        this.buildTurn();
        break;
    }

    scene.add(this.mesh);
    world.addBody(this.body);
  }

  private buildStraight() {
    this.addRoad(WALL_THICKNESS);
    this.addWalls();
  }

  private buildTurn() {
    this.addRoad(WALL_THICKNESS, 0x777777);
    this.addTurnRoad();
    this.addTurnArrows();
    this.addTurnCurbs();
  }

  private addTurnRoad() {
    const seg = 20;
    const innerR = 2;
    const outerR = 6;
    const a0 = Math.PI;
    const a1 = 3 * Math.PI / 2;

    const shape = new THREE.Shape();
    shape.moveTo(
      4 + innerR * Math.cos(a0),
      4 + innerR * Math.sin(a0)
    );
    for (let i = 1; i <= seg; i++) {
      const a = a0 + (i / seg) * (a1 - a0);
      shape.lineTo(4 + innerR * Math.cos(a), 4 + innerR * Math.sin(a));
    }
    for (let i = seg; i >= 0; i--) {
      const a = a0 + (i / seg) * (a1 - a0);
      shape.lineTo(4 + outerR * Math.cos(a), 4 + outerR * Math.sin(a));
    }
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    const mat = isLowEnd
      ? new THREE.MeshLambertMaterial({ color: 0x5a5a5a })
      : new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = ROAD_THICKNESS + 0.002;
    mesh.receiveShadow = !isLowEnd;
    this.mesh.add(mesh);
  }

  private addTurnArrows() {
    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const midR = 4;
    const a0 = Math.PI;
    const count = 3;
    for (let i = 0; i < count; i++) {
      const a = a0 + ((i + 0.5) / count) * (Math.PI / 2);
      const px = 4 + midR * Math.cos(a);
      const pz = 4 + midR * Math.sin(a);

      const arrShape = new THREE.Shape();
      const s = 0.5;
      arrShape.moveTo(0, s * 0.7);
      arrShape.lineTo(-s * 0.4, -s * 0.4);
      arrShape.lineTo(0, -s * 0.15);
      arrShape.lineTo(s * 0.4, -s * 0.4);
      arrShape.closePath();

      const g = new THREE.ShapeGeometry(arrShape);
      const m = new THREE.Mesh(g, arrowMat);
      m.position.set(px, ROAD_THICKNESS + 0.005, pz);
      m.rotation.y = a - Math.PI;
      m.rotation.x = -Math.PI / 2;
      this.mesh.add(m);
    }
  }

  private addTurnCurbs() {
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const seg = 16;
    const a0 = Math.PI;
    const a1 = 3 * Math.PI / 2;

    for (const radius of [2, 6]) {
      for (let i = 0; i < seg; i++) {
        const a1_ = a0 + (i / seg) * (a1 - a0);
        const a2_ = a0 + ((i + 1) / seg) * (a1 - a0);
        const aMid = (a1_ + a2_) / 2;
        const px = 4 + radius * Math.cos(aMid);
        const pz = 4 + radius * Math.sin(aMid);
        const arcLen = (a2_ - a1_) * radius;

        const c = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.06, arcLen),
          i % 2 === 0 ? redMat : whiteMat
        );
        c.position.set(px, ROAD_THICKNESS + 0.004, pz);
        c.rotation.y = -aMid;
        this.mesh.add(c);
      }
    }
  }

  private addRoad(extraWidth: number, color?: number) {
    const geo = new THREE.BoxGeometry(
      ROAD_WIDTH + extraWidth * 2,
      ROAD_THICKNESS,
      ROAD_LENGTH
    );
    const mat = isLowEnd
      ? new THREE.MeshLambertMaterial({ color: color ?? (this.data.type === "start" ? 0x444444 : 0x555555) })
      : new THREE.MeshStandardMaterial({
          color: color ?? (this.data.type === "start" ? 0x444444 : 0x555555),
          roughness: 0.8,
        });
    const road = new THREE.Mesh(geo, mat);
    road.position.y = ROAD_THICKNESS / 2;
    road.receiveShadow = !isLowEnd;
    this.mesh.add(road);

    this.body.addShape(
      new CANNON.Box(
        new CANNON.Vec3(
          ROAD_WIDTH / 2 + extraWidth,
          ROAD_THICKNESS / 2,
          ROAD_LENGTH / 2
        )
      ),
      new CANNON.Vec3(0, ROAD_THICKNESS / 2, 0)
    );
  }

  private addWalls() {
    const halfWidth = ROAD_WIDTH / 2;
    const halfLen = ROAD_LENGTH / 2;
    const halfWallH = WALL_HEIGHT / 2;
    const halfWallT = WALL_THICKNESS / 2;

    const wallMat = isLowEnd
      ? new THREE.MeshLambertMaterial({ color: 0xcc3333 })
      : new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6 });

    for (const side of [-1, 1]) {
      const wallGeo = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, ROAD_LENGTH);
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(side * (halfWidth + halfWallT), ROAD_THICKNESS + halfWallH, 0);
      wall.castShadow = !isLowEnd;
      this.mesh.add(wall);

      this.body.addShape(
        new CANNON.Box(new CANNON.Vec3(halfWallT, halfWallH, halfLen)),
        new CANNON.Vec3(side * (halfWidth + halfWallT), ROAD_THICKNESS + halfWallH, 0)
      );
    }
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.world.removeBody(this.body);
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
