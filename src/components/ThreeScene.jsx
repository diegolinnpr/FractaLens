import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { useCameraControls } from "./useCameraControls";

// ─── Color scheme gradients ───────────────────────────────────────────────────
function lerp3(a, b, t) {
  return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
}
function gradient(stops, t) {
  const n = stops.length - 1;
  const i = Math.min(Math.floor(t * n), n - 1);
  return lerp3(stops[i], stops[i + 1], t * n - i);
}

const POINT_SCHEMES = [
  (t) => gradient([[0,0.04,0.18],[0.1,0.4,0.9],[0.5,0.8,1.0]], t),
  (t) => gradient([[0.12,0,0],[0.8,0.1,0],[1.0,0.6,0],[1.0,0.95,0.5]], t),
  (t) => gradient([[0.1,0,0.22],[0.7,0,0.9],[0,0.7,1.0],[0.8,1.0,1.0]], t),
  (t) => gradient([[0,0.08,0.1],[0,0.5,0.4],[0.1,0.9,0.6],[0.7,1.0,0.8]], t),
  (t) => gradient([[0.05,0,0],[0.7,0.18,0],[1.0,0.58,0.1],[1.0,1.0,0.8]], t),
  (t) => gradient([[0.05,0.1,0.2],[0.3,0.52,0.8],[0.72,0.87,1.0],[1.0,1.0,1.0]], t),
  (t) => gradient([[0.04,0.1,0],[0.2,0.6,0],[0.6,1.0,0],[0.9,1.0,0.4]], t),
  (t) => gradient([[0.05,0,0],[0.5,0,0.05],[0.9,0.05,0.1],[1.0,0.4,0.3]], t),
  (t) => gradient([[0.1,0.05,0],[0.7,0.4,0],[1.0,0.82,0.3],[1.0,1.0,0.92]], t),
  (t) => gradient([[0.02,0.02,0.02],[0.3,0.3,0.3],[0.72,0.72,0.72],[1.0,1.0,1.0]], t),
];

const GRID = 45;

function computeDensity(positions) {
  const n = positions.length / 3;
  let mn = [Infinity,Infinity,Infinity], mx = [-Infinity,-Infinity,-Infinity];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < 3; j++) {
      const v = positions[i*3+j];
      if (v < mn[j]) mn[j] = v;
      if (v > mx[j]) mx[j] = v;
    }
  const range = [mx[0]-mn[0]+1e-6, mx[1]-mn[1]+1e-6, mx[2]-mn[2]+1e-6];
  const grid  = new Int32Array(GRID*GRID*GRID);
  const cellOf = (i) => {
    const cx = Math.min(GRID-1, ((positions[i*3  ]-mn[0])/range[0]*GRID)|0);
    const cy = Math.min(GRID-1, ((positions[i*3+1]-mn[1])/range[1]*GRID)|0);
    const cz = Math.min(GRID-1, ((positions[i*3+2]-mn[2])/range[2]*GRID)|0);
    return cx + cy*GRID + cz*GRID*GRID;
  };
  for (let i = 0; i < n; i++) grid[cellOf(i)]++;
  let maxD = 0;
  for (const v of grid) if (v > maxD) maxD = v;
  const density = new Float32Array(n);
  for (let i = 0; i < n; i++) density[i] = grid[cellOf(i)] / maxD;
  return density;
}

function applyColorScheme(schemeIdx, density, geometry) {
  if (!density || !geometry) return;
  const n      = density.length;
  const colors = new Float32Array(n * 3);
  const scheme = POINT_SCHEMES[schemeIdx % POINT_SCHEMES.length];
  for (let i = 0; i < n; i++) {
    const [r,g,b] = scheme(density[i]);
    colors[i*3]=r; colors[i*3+1]=g; colors[i*3+2]=b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.attributes.color.needsUpdate = true;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const BASE_DIST  = 5.0;
const CAPTURE_W  = 4096;
const CAPTURE_H  = 4096;

// ─── Component ───────────────────────────────────────────────────────────────
function ThreeScene({ type, colorScheme, captureRef, fov, dollyMult }) {
  const totalPointsRef   = useRef(0);
  const visiblePointsRef = useRef(0);
  const buildingRef      = useRef(false);
  const mountRef         = useRef(null);
  const sceneRef         = useRef(null);
  const rendererRef      = useRef(null);
  const cameraRef        = useRef(null);
  const pointsRef        = useRef(null);
  const orbitRef         = useRef(null);
  const densityRef       = useRef(null);
  const colorSchemeRef   = useRef(colorScheme);

  // Per-frame refs — updated by effects, consumed inside the rAF loop
  const fovRef           = useRef(fov);
  const dollyMultRef     = useRef(dollyMult);
  const prevDollyRef     = useRef(dollyMult); // to compute the delta-scale each frame

  const { modeRef, mode, pos: flyPos, tickFly } = useCameraControls(
    new THREE.Vector3(0, 0, BASE_DIST)
  );

  // ── Sync refs ────────────────────────────────────────────────────────────
  useEffect(() => { colorSchemeRef.current = colorScheme; }, [colorScheme]);
  useEffect(() => { fovRef.current = fov; }, [fov]);
  useEffect(() => { dollyMultRef.current = dollyMult; }, [dollyMult]);

  // ── Re-apply colors when scheme changes ──────────────────────────────────
  useEffect(() => {
    if (!pointsRef.current || !densityRef.current) return;
    applyColorScheme(colorScheme, densityRef.current, pointsRef.current.geometry);
  }, [colorScheme]);

  // ── Capture function ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!captureRef) return;
    captureRef.current = () => {
      const renderer = rendererRef.current;
      const camera   = cameraRef.current;
      const scene    = sceneRef.current;
      if (!renderer || !camera || !scene) return null;

      const origSize   = new THREE.Vector2();
      renderer.getSize(origSize);
      const origAspect = camera.aspect;

      renderer.setSize(CAPTURE_W, CAPTURE_H);
      camera.aspect = CAPTURE_W / CAPTURE_H;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);

      const dataUrl = renderer.domElement.toDataURL("image/jpeg", 0.95);

      renderer.setSize(origSize.x, origSize.y);
      camera.aspect = origAspect;
      camera.updateProjectionMatrix();

      return { dataUrl, width: CAPTURE_W, height: CAPTURE_H };
    };
  });

  // ── Scene / renderer setup ────────────────────────────────────────────────
  useEffect(() => {
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      fovRef.current,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, BASE_DIST);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    orbitRef.current = controls;

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    let animationId;
    function animate() {
      animationId = requestAnimationFrame(animate);

      // ── Live FOV update ──────────────────────────────────────────────────
      if (Math.abs(camera.fov - fovRef.current) > 0.01) {
        camera.fov = fovRef.current;
        camera.updateProjectionMatrix();
      }

      // ── Dolly-zoom: scale camera distance by the delta multiplier ────────
      // We compare the current dollyMult to the value we applied last frame
      // and scale camera.position by the ratio — this lets OrbitControls keep
      // working freely while we transparently adjust the radius.
      const curDolly  = dollyMultRef.current;
      const prevDolly = prevDollyRef.current;
      if (Math.abs(curDolly - prevDolly) > 0.0001 && modeRef.current !== "fly") {
        camera.position.multiplyScalar(curDolly / prevDolly);
        controls.update();
        prevDollyRef.current = curDolly;
      }

      if (modeRef.current === "fly") {
        controls.enabled = false;
        const { forward } = tickFly();
        camera.position.copy(flyPos.current);
        camera.lookAt(flyPos.current.clone().add(forward));
      } else {
        controls.enabled = true;
        controls.update();
      }

      // ── Gradually reveal points ──────────────────────────────────────────
      if (buildingRef.current && pointsRef.current) {
        visiblePointsRef.current += 250;
        if (visiblePointsRef.current >= totalPointsRef.current) {
          visiblePointsRef.current = totalPointsRef.current;
          buildingRef.current = false;
        }
        pointsRef.current.geometry.setDrawRange(0, visiblePointsRef.current);
        pointsRef.current.material.opacity = 1.0 - (visiblePointsRef.current / totalPointsRef.current) * 0.7;
      }

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // ── Rebuild geometry when fractal type changes ────────────────────────────
  useEffect(() => {
    if (sceneRef.current && type) updateGeometry(type);
  }, [type]);

  function updateGeometry(fractalType) {
    if (!sceneRef.current) return;
    if (pointsRef.current) {
      sceneRef.current.remove(pointsRef.current);
      pointsRef.current.geometry.dispose();
      pointsRef.current.material.dispose();
      pointsRef.current = null;
      densityRef.current = null;
    }

    const fractalFiles = {
      Octahedron:   "/data/octahedron.bin",
      Dodecahedron: "/data/dodecahedron.bin",
      Tetrahedron:  "/data/tetrahedron.bin",
    };
    const filePath = fractalFiles[fractalType];
    if (!filePath) return;

    fetch(filePath)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const positions = new Float32Array(buf);
        const density   = computeDensity(positions);
        densityRef.current = density;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, 0);
        applyColorScheme(colorSchemeRef.current, density, geometry);

        const material = new THREE.PointsMaterial({
          size: 0.01, vertexColors: true, transparent: true, opacity: 1.0,
        });

        const points = new THREE.Points(geometry, material);
        sceneRef.current.add(points);
        pointsRef.current       = points;
        totalPointsRef.current  = positions.length / 3;
        visiblePointsRef.current = 0;
        buildingRef.current     = true;
      });
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      <div style={{
        position: "absolute", top: 8, left: 8,
        color: "white", fontSize: 12, opacity: 0.6, pointerEvents: "none",
      }}>
        {mode === "fly" ? "FLY  [WASD / arrows / []]" : "ORBIT  [drag]"}  · F / O to switch
      </div>
    </div>
  );
}

export default ThreeScene;
