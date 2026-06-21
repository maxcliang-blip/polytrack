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

const TURN_CENTER_X = 4;
const TURN_CENTER_Z = 4;
const TURN_INNER_R = 2;
const TURN_OUTER_R = 6;
const TURN_SEGMENTS = 20;

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
    this.addTurnCurvedRoad();
    this.addTurnArrows();
    this.addTurnCurbs();
    this.addTurnWalls();
  }

  private addTurnCurvedRoad() {
    const shape = new THREE.Shape();
    shape.moveTo(
      TURN_CENTER_X - TURN_INNER_R * Math.cos(0),
      TURN_CENTER_Z - TURN_INNER_R * Math.sin(0)
    );
    for (let i = 1; i <= TURN_SEGMENTS; i++) {
      const a = (i / TURN_SEGMENTS) * (Math.PI / 2);
      shape.lineTo(
        TURN_CENTER_X - TURN_INNER_R * Math.cos(a),
        TURN_CENTER_Z - TURN_INNER_R * Math.sin(a)
      );
    }
    for (let i = TURN_SEGMENTS; i >= 0; i--) {
      const a = (i / TURN_SEGMENTS) * (Math.PI / 2);
      shape.lineTo(
        TURN_CENTER_X - TURN_OUTER_R * Math.cos(a),
        TURN_CENTER_Z - TURN_OUTER_R * Math.sin(a)
      );
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
    const count = 3;
    for (let i = 0; i < count; i++) {
      const a = ((i + 0.5) / count) * (Math.PI / 2);
      const px = TURN_CENTER_X - midR * Math.cos(a);
      const pz = TURN_CENTER_Z - midR * Math.sin(a);

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
      m.rotation.y = a;
      m.rotation.x = -Math.PI / 2;
      this.mesh.add(m);
    }
  }

  private addTurnCurbs() {
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const seg = 16;

    for (const [radius, isInner] of [[TURN_INNER_R, true], [TURN_OUTER_R, false]] as const) {
      for (let i = 0; i < seg; i++) {
        const a1 = (i / seg) * (Math.PI / 2);
        const a2 = ((i + 1) / seg) * (Math.PI / 2);
        const aMid = (a1 + a2) / 2;
        const px = TURN_CENTER_X - radius * Math.cos(aMid);
        const pz = TURN_CENTER_Z - radius * Math.sin(aMid);
        const arcLen = (a2 - a1) * radius;

        const c = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.06, arcLen),
          i % 2 === 0 ? redMat : whiteMat
        );
        c.position.set(px, ROAD_THICKNESS + 0.004, pz);
        c.rotation.y = aMid;
        this.mesh.add(c);
      }
    }
  }

  private addTurnWalls() {
    const wallMat = isLowEnd
      ? new THREE.MeshLambertMaterial({ color: 0xcc3333 })
      : new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6 });

    const segCount = 12;
    const wallHalfH = WALL_HEIGHT / 2;
    const wallHalfT = WALL_THICKNESS / 2;

    for (const radius of [TURN_INNER_R - WALL_THICKNESS / 2, TURN_OUTER_R + WALL_THICKNESS / 2]) {
      for (let i = 0; i < segCount; i++) {
        const a1 = (i / segCount) * (Math.PI / 2);
        const a2 = ((i + 1) / segCount) * (Math.PI / 2);
        const aMid = (a1 + a2) / 2;
        const px = TURN_CENTER_X - radius * Math.cos(aMid);
        const pz = TURN_CENTER_Z - radius * Math.sin(aMid);
        const arcLen = (a2 - a1) * radius;

        const wallGeo = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, arcLen);
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(px, ROAD_THICKNESS + wallHalfH, pz);
        wall.rotation.y = aMid;
        wall.castShadow = !isLowEnd;
        this.mesh.add(wall);

        this.body.addShape(
          new CANNON.Box(new CANNON.Vec3(wallHalfT, wallHalfH, arcLen / 2)),
          new CANNON.Vec3(px, ROAD_THICKNESS + wallHalfH, pz),
          new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(0, 1, 0), aMid)
        );
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
