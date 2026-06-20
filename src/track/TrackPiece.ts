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
    this.buildTurnRoad();
    this.buildTurnWalls();
  }

  private buildTurnRoad() {
    const shape = new THREE.Shape();
    const hw = ROAD_WIDTH / 2;
    const hl = ROAD_LENGTH / 2;
    // L-shape: incoming from -Z, outgoing to +X
    // Boundary of union of R1=[-hw,hw]×[-hl,0] and R2=[0,hl]×[-hw,hw]
    shape.moveTo(-hw, -hl);
    shape.lineTo(hw, -hl);
    shape.lineTo(hw, -hw);
    shape.lineTo(hl, -hw);
    shape.lineTo(hl, hw);
    shape.lineTo(0, hw);
    shape.lineTo(0, 0);
    shape.lineTo(-hw, 0);
    shape.closePath();

    const extrudeSettings = { depth: ROAD_THICKNESS, bevelEnabled: false };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mat = isLowEnd
      ? new THREE.MeshLambertMaterial({ color: 0x777777 })
      : new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.8 });
    const road = new THREE.Mesh(geo, mat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0;
    road.receiveShadow = !isLowEnd;
    this.mesh.add(road);

    // Physics: two overlapping boxes forming the L
    this.body.addShape(
      new CANNON.Box(new CANNON.Vec3(hw, ROAD_THICKNESS / 2, hl)),
      new CANNON.Vec3(0, ROAD_THICKNESS / 2, -hl / 2)
    );
    this.body.addShape(
      new CANNON.Box(new CANNON.Vec3(hl, ROAD_THICKNESS / 2, hw)),
      new CANNON.Vec3(hl / 2, ROAD_THICKNESS / 2, 0)
    );
  }

  private buildTurnWalls() {
    const hw = ROAD_WIDTH / 2;
    const hl = ROAD_LENGTH / 2;
    const halfWallH = WALL_HEIGHT / 2;
    const halfWallT = WALL_THICKNESS / 2;
    const y = ROAD_THICKNESS + halfWallH;

    const wallMat = isLowEnd
      ? new THREE.MeshLambertMaterial({ color: 0xcc3333 })
      : new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6 });

    const addWall = (sx: number, sz: number, sw: number, sd: number) => {
      const geo = new THREE.BoxGeometry(sw, WALL_HEIGHT, sd);
      const wall = new THREE.Mesh(geo, wallMat);
      wall.position.set(sx, y, sz);
      wall.castShadow = !isLowEnd;
      this.mesh.add(wall);
      this.body.addShape(
        new CANNON.Box(new CANNON.Vec3(sw / 2, halfWallH, sd / 2)),
        new CANNON.Vec3(sx, y, sz)
      );
    };

    // Left outer wall: x = -(hw + halfWallT), z = -hl to 0
    addWall(-(hw + halfWallT), -hl / 2, WALL_THICKNESS, hl);
    // Right incoming outer wall: x = hw + halfWallT, z = -hl to -hw
    addWall(hw + halfWallT, -(hl + hw) / 2, WALL_THICKNESS, hl - hw);
    // Corner outer wall: z = -(hw + halfWallT), x = hw to hl
    addWall(hw + (hl - hw) / 2, -(hw + halfWallT), hl - hw, WALL_THICKNESS);
    // Right outgoing outer wall: x = hl + halfWallT, z = -hw to hw
    addWall(hl + halfWallT, 0, WALL_THICKNESS, hw * 2);
    // Top outer wall: z = hw + halfWallT, x = 0 to hl
    addWall(hl / 2, hw + halfWallT, hl, WALL_THICKNESS);
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
