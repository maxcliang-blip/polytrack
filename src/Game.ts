import * as THREE from "three";
import * as CANNON from "cannon-es";
import { InputManager } from "./InputManager";
import { Car } from "./Car";
import { Track } from "./track/Track";
import { Editor } from "./Editor";
import { Ghost } from "./Ghost";
import { HUD } from "./HUD";

type GameMode = "play" | "edit";

export class Game {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  world: CANNON.World;
  input: InputManager;
  car: Car;
  track: Track;
  editor: Editor;
  ghost: Ghost;
  hud: HUD;

  mode: GameMode = "play";
  private clock = new THREE.Clock();
  private cameraTarget = new THREE.Vector3();

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 80, 200);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 8, -10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    this.world = new CANNON.World();
    this.world.gravity.set(0, -25, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.defaultContactMaterial.friction = 0.8;

    this.input = new InputManager();
    this.track = new Track(this.scene, this.world);
    this.car = new Car(this.scene, this.world, this.input);
    this.editor = new Editor(this.scene, this.camera, this.renderer, this.track);
    this.ghost = new Ghost(this.scene);
    this.hud = new HUD();

    this.setupLighting();
    this.setupGround();
    this.setupResize();

    this.hud.setMode("play");
    this.hud.resetTimer();

    // Ctrl+S to save in editor
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyS" && (e.ctrlKey || e.metaKey)) {
        if (this.mode === "edit") {
          this.track.save();
          this.hud.setInfoText("Track saved!");
          setTimeout(() => this.hud.setMode("edit"), 1500);
        }
        e.preventDefault();
      }
    });
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(50, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    this.scene.add(sun);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a7d44, 0.4);
    this.scene.add(hemi);
  }

  private setupGround() {
    const groundGeo = new THREE.PlaneGeometry(400, 400);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3a7d44,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );
    this.world.addBody(groundBody);
  }

  private setupResize() {
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private toggleMode() {
    if (this.mode === "play") {
      this.mode = "edit";
      this.car.freeze();
      this.ghost.stopRecording();
      this.editor.show();
      this.hud.showGhost(false);
      this.hud.setMode("edit");
    } else {
      this.mode = "play";
      this.car.unfreeze();
      this.car.reset();
      this.ghost.clearRecording();
      this.ghost.startRecording();
      this.editor.hide();
      this.hud.resetTimer();
      this.hud.setMode("play");
    }
  }

  start() {
    this.clock.start();
    this.loop();
  }

  private loop() {
    requestAnimationFrame(() => this.loop());

    const dt = Math.min(this.clock.getDelta(), 1 / 30);
    this.world.step(1 / 60, dt, 3);

    if (this.input.toggleMode) {
      this.toggleMode();
    }

    if (this.mode === "play") {
      this.updatePlay(dt);
    } else {
      this.updateEdit();
    }

    this.input.clearFrame();
    this.renderer.render(this.scene, this.camera);
  }

  private updatePlay(dt: number) {
    this.car.update(dt);
    this.track.update(dt);

    if (this.car.isRunning) {
      this.ghost.recordFrame(this.car.chassisBody);
    }

    if (this.input.restart) {
      this.ghost.stopRecording();
      this.ghost.startPlayback();
      this.ghost.startRecording();
      this.hud.resetTimer();
    }

    this.ghost.update(dt);
    this.hud.showGhost(this.ghost.isPlaying);

    this.cameraTarget.set(
      this.car.mesh.position.x,
      this.car.mesh.position.y + 6,
      this.car.mesh.position.z + 8
    );
    this.camera.position.lerp(this.cameraTarget, 0.05);
    this.camera.lookAt(this.car.mesh.position);

    this.hud.update(this.car.chassisBody);
  }

  private updateEdit() {
    this.editor.update();
    this.car.reset();

    // Delete piece under cursor
    if (this.input.wasPressed("Delete") || this.input.wasPressed("Backspace")) {
      this.editor.deleteAtCursor(this.input.mouseX, this.input.mouseY);
    }
  }
}
