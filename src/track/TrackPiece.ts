import * as THREE from "three";
import * as CANNON from "cannon-es";
import { isLowEnd } from "../Config";

export type PieceType = "straight" | "turn" | "start" | "finish";
export type TurnDir = "left" | "right";

export type EntryFace = "+z" | "-z" | "+x" | "-x";

export interface TrackPieceData {
  type: PieceType;
  x: number;
  z: number;
  rotation: number;
  turnDir?: TurnDir;
  entryFace?: EntryFace;
}

interface TurnConfig {
  cx: number;
  cz: number;
  startAngle: number;
  endAngle: number;
}

function getTurnConfig(entryFace: EntryFace, isRight: boolean): TurnConfig {
  if (isRight) {
    switch (entryFace) {
      case "-z": return { cx: -4, cz: 4, startAngle: 3 * Math.PI / 2, endAngle: 2 * Math.PI };
      case "+x": return { cx: -4, cz: -4, startAngle: 0, endAngle: Math.PI / 2 };
      case "+z": return { cx: 4, cz: -4, startAngle: Math.PI / 2, endAngle: Math.PI };
      case "-x": return { cx: 4, cz: 4, startAngle: Math.PI, endAngle: 3 * Math.PI / 2 };
    }
  } else {
    switch (entryFace) {
      case "-z": return { cx: 4, cz: 4, startAngle: Math.PI, endAngle: 3 * Math.PI / 2 };
      case "+x": return { cx: -4, cz: 4, startAngle: 3 * Math.PI / 2, endAngle: 2 * Math.PI };
      case "+z": return { cx: -4, cz: -4, startAngle: 0, endAngle: Math.PI / 2 };
      case "-x": return { cx: 4, cz: -4, startAngle: Math.PI / 2, endAngle: Math.PI };
    }
  }
}

function inferEntryFace(rot: number, _isRight?: boolean): EntryFace {
  const r = ((rot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (Math.abs(r) < 0.01) return "-z";
  if (Math.abs(r - Math.PI / 2) < 0.01) return "+x";
  if (Math.abs(r - Math.PI) < 0.01) return "+z";
  return "-x";
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
  private turnCfg: TurnConfig | null = null;

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
    const isRight = this.data.turnDir === "right";
    const entry = this.data.entryFace ?? inferEntryFace(this.data.rotation, isRight);
    this.turnCfg = getTurnConfig(entry, isRight);
    this.addRoad(WALL_THICKNESS, undefined, false);
    this.addTurnRoad();
    this.addTurnArrows();
    this.addTurnCurbs();
    this.addTurnWalls();
  }

  private addTurnRoad() {
    const cfg = this.turnCfg!;
    const seg = 16;
    const innerR = 1.8;
    const outerR = 6.2;
    const s = cfg.startAngle;
    const e = cfg.endAngle;

    const shape = new THREE.Shape();
    shape.moveTo(cfg.cx + innerR * Math.cos(s), cfg.cz + innerR * Math.sin(s));
    for (let i = 1; i <= seg; i++) {
      const a = s + (i / seg) * (e - s);
      shape.lineTo(cfg.cx + innerR * Math.cos(a), cfg.cz + innerR * Math.sin(a));
    }
    for (let i = seg; i >= 0; i--) {
      const a = s + (i / seg) * (e - s);
      shape.lineTo(cfg.cx + outerR * Math.cos(a), cfg.cz + outerR * Math.sin(a));
    }
    shape.closePath();

    const roadColor = this.data.type === "start" ? 0x444444 : 0x555555;
    const geo = new THREE.ShapeGeometry(shape);
    const mat = isLowEnd
      ? new THREE.MeshLambertMaterial({ color: roadColor })
      : new THREE.MeshStandardMaterial({ color: roadColor, roughness: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = ROAD_THICKNESS + 0.001;
    mesh.receiveShadow = !isLowEnd;
    this.mesh.add(mesh);
  }

  private addTurnArrows() {
    const cfg = this.turnCfg!;
    const isRight = this.data.turnDir === "right";
    const arrowMat = isLowEnd
      ? new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
      : new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });

    const midR = 4;
    const count = 3;
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const a = isRight
        ? cfg.endAngle - t * (cfg.endAngle - cfg.startAngle)
        : cfg.startAngle + t * (cfg.endAngle - cfg.startAngle);
      const px = cfg.cx + midR * Math.cos(a);
      const pz = cfg.cz + midR * Math.sin(a);

      const arrShape = new THREE.Shape();
      const s = 0.8;
      arrShape.moveTo(0, s * 0.7);
      arrShape.lineTo(-s * 0.4, -s * 0.4);
      arrShape.lineTo(0, -s * 0.15);
      arrShape.lineTo(s * 0.4, -s * 0.4);
      arrShape.closePath();

      const g = new THREE.ShapeGeometry(arrShape);
      const m = new THREE.Mesh(g, arrowMat);
      m.position.set(px, ROAD_THICKNESS + 0.005, pz);
      m.rotation.y = isRight ? Math.PI - a : -a;
      m.rotation.x = -Math.PI / 2;
      this.mesh.add(m);
    }
  }

  private addTurnCurbs() {
    const cfg = this.turnCfg!;
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const seg = 16;
    const s = cfg.startAngle;
    const e = cfg.endAngle;

    for (const radius of [2, 6]) {
      for (let i = 0; i < seg; i++) {
        const a1 = s + (i / seg) * (e - s);
        const a2 = s + ((i + 1) / seg) * (e - s);
        const aMid = (a1 + a2) / 2;
        const px = cfg.cx + radius * Math.cos(aMid);
        const pz = cfg.cz + radius * Math.sin(aMid);
        const arcLen = (a2 - a1) * radius;

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

  private addRoad(extraWidth: number, color?: number, skipVisual?: boolean) {
    if (!skipVisual) {
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
    }

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

  private addTurnWalls() {
    const cfg = this.turnCfg!;
    const seg = 12;
    const s = cfg.startAngle;
    const e = cfg.endAngle;
    const radii = [
      { r: 1.8 - 0.1, wallW: WALL_THICKNESS },
      { r: 6.2 + 0.1, wallW: WALL_THICKNESS },
    ];
    const halfWallH = WALL_HEIGHT / 2;
    const wallMat = isLowEnd
      ? new THREE.MeshLambertMaterial({ color: 0xcc3333 })
      : new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6 });

    for (const { r, wallW } of radii) {
      for (let i = 0; i < seg; i++) {
        const a1 = s + (i / seg) * (e - s);
        const a2 = s + ((i + 1) / seg) * (e - s);
        const aMid = (a1 + a2) / 2;
        const px = cfg.cx + r * Math.cos(aMid);
        const pz = cfg.cz + r * Math.sin(aMid);
        const arcLen = (a2 - a1) * r;

        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(wallW, WALL_HEIGHT, arcLen),
          wallMat
        );
        mesh.position.set(px, ROAD_THICKNESS + halfWallH, pz);
        mesh.rotation.y = -aMid;
        mesh.castShadow = !isLowEnd;
        this.mesh.add(mesh);

        this.body.addShape(
          new CANNON.Box(new CANNON.Vec3(wallW / 2, halfWallH, arcLen / 2)),
          new CANNON.Vec3(px, ROAD_THICKNESS + halfWallH, pz)
        );
      }
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
