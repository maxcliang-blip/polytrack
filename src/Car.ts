import * as THREE from "three";
import * as CANNON from "cannon-es";
import { InputManager } from "./InputManager";

const WHEEL_RADIUS = 0.3;
const WHEEL_WIDTH = 0.22;
const CHASSIS_MASS = 250;
const MAX_FORCE = 2000;
const MAX_BRAKE = 60;
const MAX_STEER = 0.4;

const wheelPositions = [
  { x: -0.7, z: 1.2 },  // front-left  (+Z = forward)
  { x: 0.7, z: 1.2 },   // front-right
  { x: -0.7, z: -1.2 }, // rear-left
  { x: 0.7, z: -1.2 },  // rear-right
];

export class Car {
  mesh: THREE.Group;
  chassisBody: CANNON.Body;
  vehicle: CANNON.RaycastVehicle;
  private wheelMeshes: THREE.Object3D[] = [];
  private input: InputManager;
  private steeringAngle = 0;
  private frozen = false;
  isRunning = false;

  constructor(scene: THREE.Scene, world: CANNON.World, input: InputManager) {
    this.input = input;

    this.mesh = new THREE.Group();
    this.buildChassis();
    this.buildWheels(scene);

    this.chassisBody = new CANNON.Body({ mass: CHASSIS_MASS });
    this.chassisBody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.9, 0.2, 1.4))
    );
    // Start with wheels just touching ground (no initial drop)
    this.chassisBody.position.set(0, 0.8, 0);
    world.addBody(this.chassisBody);

    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });

    const wheelOptions = {
      radius: WHEEL_RADIUS,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 250,
      suspensionRestLength: 0.4,
      dampingRelaxation: 10,
      dampingCompression: 15,
      frictionSlip: 2,
      maxSuspensionForce: 50000,
      rollInfluence: 0.2,
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(0, 0, 0),
      maxSuspensionTravel: 0.3,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
    };

    for (const pos of wheelPositions) {
      const opts = { ...wheelOptions };
      opts.chassisConnectionPointLocal = new CANNON.Vec3(pos.x, -0.1, pos.z);
      this.vehicle.addWheel(opts);
    }

    this.vehicle.addToWorld(world);

    scene.add(this.mesh);
  }

  private buildChassis() {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe63946,
      roughness: 0.4,
      metalness: 0.5,
    });
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.2, 2.6),
      bodyMat
    );
    body.castShadow = true;
    this.mesh.add(body);

    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x1d3557,
      roughness: 0.3,
      metalness: 0.6,
    });
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.22, 1.1),
      cabinMat
    );
    cabin.position.set(0, 0.21, 0.3);
    cabin.castShadow = true;
    this.mesh.add(cabin);

    // Spoiler at rear (-Z)
    const spoilerMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.8,
    });
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.05, 0.2),
      spoilerMat
    );
    spoiler.position.set(0, 0.1, -1.25);
    this.mesh.add(spoiler);

    // Headlights at front (+Z)
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: 0xffffaa,
      emissiveIntensity: 0.3,
    });
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.08, 0.05),
        lightMat
      );
      light.position.set(side * 0.4, -0.1, 1.3);
      this.mesh.add(light);
    }

    // Taillights at rear (-Z)
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.3,
    });
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.08, 0.05),
        tailMat
      );
      light.position.set(side * 0.4, -0.1, -1.3);
      this.mesh.add(light);
    }
  }

  private buildWheels(scene: THREE.Scene) {
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.9,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x999999,
      metalness: 0.8,
      roughness: 0.3,
    });

    for (let i = 0; i < 4; i++) {
      const group = new THREE.Group();

      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 12),
        wheelMat
      );
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      group.add(tire);

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, WHEEL_WIDTH + 0.02, 6),
        rimMat
      );
      rim.rotation.z = Math.PI / 2;
      group.add(rim);

      scene.add(group);
      this.wheelMeshes.push(group);
    }
  }

  freeze() {
    this.frozen = true;
    this.chassisBody.type = CANNON.Body.KINEMATIC;
  }

  unfreeze() {
    this.frozen = false;
    this.chassisBody.type = CANNON.Body.DYNAMIC;
  }

  update(dt: number) {
    if (this.frozen) return;

    const engineForce = this.input.forward ? MAX_FORCE : 0;
    const brakeForce = this.input.backward ? MAX_BRAKE : 0;
    const steerInput = this.input.left ? 1 : this.input.right ? -1 : 0;

    const targetSteer = steerInput * MAX_STEER;
    this.steeringAngle += (targetSteer - this.steeringAngle) * Math.min(1, 10 * dt);

    const wheels = this.vehicle.wheelInfos;
    wheels[0].steering = this.steeringAngle;
    wheels[1].steering = this.steeringAngle;

    for (let i = 0; i < 4; i++) {
      this.vehicle.applyEngineForce(engineForce, i);
      this.vehicle.setBrake(brakeForce, i);
    }

    for (let i = 0; i < 4; i++) {
      this.vehicle.updateWheelTransform(i);
    }

    for (let i = 0; i < 4; i++) {
      const t = this.vehicle.wheelInfos[i].worldTransform;
      const m = this.wheelMeshes[i];
      m.position.copy(t.position as unknown as THREE.Vector3);
      m.quaternion.copy(t.quaternion as unknown as THREE.Quaternion);
    }

    this.mesh.position.copy(
      this.chassisBody.position as unknown as THREE.Vector3
    );
    this.mesh.quaternion.copy(
      this.chassisBody.quaternion as unknown as THREE.Quaternion
    );

    const vel = this.chassisBody.velocity;
    this.isRunning =
      Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z) > 0.5;

    if (this.input.restart) {
      this.reset();
    }
  }

  reset() {
    this.chassisBody.position.set(0, 0.8, 0);
    this.chassisBody.velocity.setZero();
    this.chassisBody.angularVelocity.setZero();
    this.chassisBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(0, 0, 1),
      0
    );
    this.isRunning = false;
  }
}
