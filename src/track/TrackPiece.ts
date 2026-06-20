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
    this.addWalls();
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
