import * as THREE from "three";
import * as CANNON from "cannon-es";
import { InputManager } from "./InputManager";

const WHEEL_RADIUS = 0.35;
const WHEEL_WIDTH = 0.25;
const CHASSIS_MASS = 150;
const MAX_FORCE = 800;
const MAX_BRAKE = 50;
const MAX_STEER = 0.5;

const wheelPositions = [
  { x: -0.7, z: -1.2 },
  { x: 0.7, z: -1.2 },
  { x: -0.7, z: 1.2 },
  { x: 0.7, z: 1.2 },
];

export class Car {
  mesh: THREE.Group;
  chassisBody: CANNON.Body;
  vehicle: CANNON.RaycastVehicle;
  private wheelMeshes: THREE.Mesh[] = [];
  private input: InputManager;
  private steeringAngle = 0;
  private frozen = false;
  isRunning = false;

  constructor(scene: THREE.Scene, world: CANNON.World, input: InputManager) {
    this.input = input;

    this.mesh = new THREE.Group();

    const chassisGeo = new THREE.BoxGeometry(1.8, 0.3, 2.8);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0xe63946,
      roughness: 0.6,
      metalness: 0.4,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.15;
    chassis.castShadow = true;
    this.mesh.add(chassis);

    const cabinGeo = new THREE.BoxGeometry(1.4, 0.3, 1.4);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x1d3557,
      roughness: 0.5,
      metalness: 0.3,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.45, -0.3);
    cabin.castShadow = true;
    this.mesh.add(cabin);

    this.chassisBody = new CANNON.Body({ mass: CHASSIS_MASS });
    this.chassisBody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.9, 0.15, 1.4))
    );
    this.chassisBody.position.set(0, 1, 0);
    world.addBody(this.chassisBody);

    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 1,
      indexUpAxis: 0,
      indexForwardAxis: 2,
    });

    const wheelOptions = {
      radius: WHEEL_RADIUS,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 30,
      suspensionRestLength: 0.4,
      dampingRelaxation: 2.3,
      dampingCompression: 4.4,
      frictionSlip: 1.4,
      maxSuspensionForce: 10000,
      rollInfluence: 0.01,
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

    const wheelGeo = new THREE.CylinderGeometry(
      WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 12
    );
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
    });

    for (let i = 0; i < 4; i++) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      this.mesh.add(wheel);
      this.wheelMeshes.push(wheel);
    }

    scene.add(this.mesh);
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

    this.vehicle.updateWheelTransform(0);
    this.vehicle.updateWheelTransform(1);
    this.vehicle.updateWheelTransform(2);
    this.vehicle.updateWheelTransform(3);

    for (let i = 0; i < 4; i++) {
      const t = this.vehicle.wheelInfos[i].worldTransform;
      const m = this.wheelMeshes[i];
      m.position.copy(t.position as unknown as THREE.Vector3);
      m.quaternion.copy(t.quaternion as unknown as THREE.Quaternion);
    }

    this.mesh.position.copy(this.chassisBody.position as unknown as THREE.Vector3);
    this.mesh.quaternion.copy(this.chassisBody.quaternion as unknown as THREE.Quaternion);

    // Track if car is moving
    const vel = this.chassisBody.velocity;
    this.isRunning = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z) > 0.5;

    if (this.input.restart) {
      this.reset();
    }
  }

  reset() {
    this.chassisBody.position.set(0, 1.5, 0);
    this.chassisBody.velocity.setZero();
    this.chassisBody.angularVelocity.setZero();
    this.chassisBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), 0);
    this.isRunning = false;
  }
}
