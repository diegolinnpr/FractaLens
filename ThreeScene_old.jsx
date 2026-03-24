import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const INIT_DISTANCE = 5;
const INIT_FOV = 50;
const MIN_DISTANCE = 2;
const MAX_DISTANCE = 1000;

// Dolly zoom invariant: tan(fov/2) * distance = constant
// As distance increases, FOV narrows to compensate — subject stays the same size.
const DOLLY_CONSTANT = Math.tan((INIT_FOV * Math.PI) / 360) * INIT_DISTANCE;

function fovFromDistance(distance) {
  return (360 / Math.PI) * Math.atan(DOLLY_CONSTANT / distance);
}

function ThreeScene({ type, orbitRadius }) {

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const pointsRef = useRef(null);
  const controlsRef = useRef(null);

  // Single source of truth for distance.
  // Both the slider and the trackpad wheel write here.
  // The animate loop reads from here every frame.
  const dollyDistanceRef = useRef(INIT_DISTANCE);

  // 🔹 1. Initialize Scene ONCE
  useEffect(() => {

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      INIT_FOV,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, INIT_DISTANCE);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = false; // We own zoom — trackpad wheel handled below
    controlsRef.current = controls;

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    // --- Trackpad / mouse wheel: update our distance ref ---
    // Both trackpad pinch and scroll wheel fire as 'wheel' events.
    // We adjust dollyDistanceRef and let the animate loop apply it.
    const handleWheel = (e) => {
      e.preventDefault();
      // deltaY > 0  →  scroll down / pinch out  →  move camera back
      const zoomSpeed = 0.001;
      const factor = 1 + e.deltaY * zoomSpeed;
      dollyDistanceRef.current = Math.max(
        MIN_DISTANCE,
        Math.min(MAX_DISTANCE, dollyDistanceRef.current * factor)
      );
    };

    // { passive: false } required so preventDefault() works
    mountRef.current.addEventListener("wheel", handleWheel, { passive: false });

    let animationId;

    function animate() {
      animationId = requestAnimationFrame(animate);

      // 1. Let OrbitControls handle rotation and panning.
      controls.update();

      // 2. Re-impose our distance AFTER controls.update() has moved the camera.
      //    Extract direction only (unit vector), then scale to our target distance.
      //    This means OC controls the orbit direction; we control the radius.
      const cam = cameraRef.current;
      const target = controls.target;

      const dir = new THREE.Vector3()
        .subVectors(cam.position, target)
        .normalize();

      cam.position.copy(
        target.clone().add(dir.multiplyScalar(dollyDistanceRef.current))
      );

      // 3. Compute FOV from current distance to keep apparent size constant.
      cam.fov = fovFromDistance(dollyDistanceRef.current);
      cam.updateProjectionMatrix();

      renderer.render(scene, cam);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      controls.dispose();
      renderer.dispose();
      // Clean up wheel listener - need to store ref to mount node
      mountRef.current?.removeEventListener("wheel", handleWheel);
    };

  }, []);


  // 🔹 2. Slider → write target distance into the shared ref.
  //    The animate loop picks it up on the next frame automatically.
  useEffect(() => {
    if (orbitRadius == null) return;

    const t = orbitRadius;

    // Exponential distribution: dramatic effect concentrated at close range
    const distance = MIN_DISTANCE * Math.pow(MAX_DISTANCE / MIN_DISTANCE, t);
    dollyDistanceRef.current = distance;

  }, [orbitRadius]);


  // 🔹 3. Update Geometry When Type Changes
  useEffect(() => {
    if (!sceneRef.current) return;
    updateGeometry(type);
  }, [type]);

  function updateGeometry(type) {

    if (pointsRef.current) {
      sceneRef.current.remove(pointsRef.current);
      pointsRef.current.geometry.dispose();
      pointsRef.current.material.dispose();
      pointsRef.current = null;
    }

    const fractalFiles = {
      Octahedron: "/data/octahedron.bin",
      Dodecahedron: "/data/dodecahedron.bin",
      Tetrahedron: "/data/tetrahedron.bin"
    };

    const filePath = fractalFiles[type];
    if (!filePath) return;

    fetch(filePath)
      .then(res => res.arrayBuffer())
      .then(buffer => {

        const positions = new Float32Array(buffer);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3)
        );

        const material = new THREE.PointsMaterial({
          size: 0.005,
          color: 0x66ccff,
          transparent: true,
          opacity: 0.01,
          depthWrite: false
        });

        const points = new THREE.Points(geometry, material);
        sceneRef.current.add(points);
        pointsRef.current = points;
      });
  }

  return (
    <div
      ref={mountRef}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export default ThreeScene;