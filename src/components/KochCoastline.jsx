import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { useCameraControls } from "./useCameraControls";

const MAX_ITER = 10;      // 1024×1024 grid at full detail (~2M triangles)
const WORLD    = 72;      // terrain side length in world units
const H_SCALE  = 7.0;     // max mountain height
const SEA_NORM = -0.05;   // normalized height [-1,1] where water begins

// ── Seeded LCG random ────────────────────────────────────────────────────────
function makeRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 2147483648 - 1; // [-1, 1]
  };
}

// ── Diamond-Square heightmap (Koch-style iterative subdivision) ───────────────
function generateHeightmap(seed) {
  const size = (1 << MAX_ITER) + 1; // 257
  const h    = new Float32Array(size * size);
  const rand = makeRand(seed);
  const at   = (x, y) => y * size + x;

  h[at(0,       0      )] = rand() * 0.3;
  h[at(size-1,  0      )] = rand() * 0.3;
  h[at(0,       size-1 )] = rand() * 0.3;
  h[at(size-1,  size-1 )] = rand() * 0.3;

  let step = size - 1;
  let scale = 1.0;

  while (step > 1) {
    const half = step >> 1;

    // Diamond step: set midpoint of each square
    for (let y = 0; y < size - 1; y += step)
      for (let x = 0; x < size - 1; x += step) {
        const avg = (h[at(x,y)] + h[at(x+step,y)] + h[at(x,y+step)] + h[at(x+step,y+step)]) * 0.25;
        h[at(x+half, y+half)] = avg + rand() * scale;
      }

    // Square step: set edge midpoints of each diamond
    let yi = 0;
    for (let y = 0; y < size; y += half, yi++) {
      const xs = (yi % 2 === 0) ? half : 0;
      for (let x = xs; x < size; x += step) {
        let sum = 0, cnt = 0;
        if (y >= half)      { sum += h[at(x, y-half)]; cnt++; }
        if (y+half < size)  { sum += h[at(x, y+half)]; cnt++; }
        if (x >= half)      { sum += h[at(x-half, y)]; cnt++; }
        if (x+half < size)  { sum += h[at(x+half, y)]; cnt++; }
        h[at(x, y)] = sum / cnt + rand() * scale;
      }
    }

    step  = half;
    scale *= 0.55; // lower = smoother terrain (less high-frequency noise)
  }

  // Normalize to [-1, 1]
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < h.length; i++) { if (h[i] < lo) lo = h[i]; if (h[i] > hi) hi = h[i]; }
  const range = hi - lo || 1;
  for (let i = 0; i < h.length; i++) h[i] = ((h[i] - lo) / range) * 2 - 1;

  // Island edge mask — smoothly pull terrain below sea level near the borders
  // so the coastline always terminates in water with no abrupt cut-off edges.
  for (let gy = 0; gy < size; gy++) {
    for (let gx = 0; gx < size; gx++) {
      const nx   = (gx / (size - 1)) * 2 - 1;          // -1 to 1
      const ny   = (gy / (size - 1)) * 2 - 1;          // -1 to 1
      const dist = Math.max(Math.abs(nx), Math.abs(ny)); // 0 = centre, 1 = edge
      const t    = Math.max(0, Math.min(1, (dist - 0.72) / 0.22)); // ramp 0.72→0.94
      const mask = 1 - t * t * (3 - 2 * t);             // smoothstep: 1→0
      h[gy * size + gx] = h[gy * size + gx] * mask + (-0.5) * (1 - mask);
    }
  }

  return h;
}

// ── Height → vertex color ─────────────────────────────────────────────────────
function toColor(n) {
  if (n < SEA_NORM - 0.25) return [0.04, 0.10, 0.40]; // deep water
  if (n < SEA_NORM)        return [0.06, 0.20, 0.58]; // shallow water
  if (n < SEA_NORM + 0.07) return [0.76, 0.70, 0.50]; // beach / sand
  if (n < 0.25)            return [0.22, 0.52, 0.15]; // lowland grass
  if (n < 0.55)            return [0.32, 0.40, 0.18]; // upland
  if (n < 0.80)            return [0.48, 0.40, 0.30]; // rock
  return                          [0.90, 0.92, 0.95]; // snow
}

// ── Build Three.js geometry at a given iteration level ───────────────────────
function buildGeo(heights, iter) {
  const fs     = (1 << MAX_ITER) + 1;      // full heightmap side (257)
  const stride = 1 << (MAX_ITER - iter);   // sample every nth row/col
  const gN     = 1 << iter;                // cells per side
  const V      = gN + 1;                   // vertices per side

  const pos = new Float32Array(V * V * 3);
  const col = new Float32Array(V * V * 3);
  const idx = new Uint32Array(gN * gN * 6);

  let pi = 0, ci = 0, ii = 0;

  for (let gy = 0; gy < V; gy++) {
    for (let gx = 0; gx < V; gx++) {
      const hn = heights[Math.min(gy * stride, fs-1) * fs + Math.min(gx * stride, fs-1)];
      pos[pi++] = (gx / gN - 0.5) * WORLD;
      pos[pi++] = hn * H_SCALE;
      pos[pi++] = (gy / gN - 0.5) * WORLD;
      const [r, g, b] = toColor(hn);
      col[ci++] = r; col[ci++] = g; col[ci++] = b;
    }
  }

  for (let gy = 0; gy < gN; gy++) {
    for (let gx = 0; gx < gN; gx++) {
      const v0 = gy * V + gx;
      idx[ii++] = v0;   idx[ii++] = v0+V;   idx[ii++] = v0+1;
      idx[ii++] = v0+1; idx[ii++] = v0+V;   idx[ii++] = v0+V+1;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  return geo;
}

// ─────────────────────────────────────────────────────────────────────────────

function KochCoastline({ hue = 200, captureRef }) {
  const mountRef    = useRef(null);
  const meshRef     = useRef(null);
  const lightsRef   = useRef({});
  const heightsRef  = useRef(null);
  const seedRef     = useRef(Math.floor(Math.random() * 0xFFFFFFFF));
  const rendererRef = useRef(null);
  const sceneRef    = useRef(null);
  const cameraRef   = useRef(null);

  useEffect(() => {
    if (!captureRef) return;
    captureRef.current = () => {
      const renderer = rendererRef.current;
      const scene    = sceneRef.current;
      const camera   = cameraRef.current;
      if (!renderer || !scene || !camera) return null;
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL("image/jpeg", 0.95);
      return { dataUrl, width: renderer.domElement.width, height: renderer.domElement.height };
    };
  });

  const [iter,       setIter]       = useState(1);
  const [running,    setRunning]    = useState(true);
  const [terrainKey, setTerrainKey] = useState(0);
  const [speed,      setSpeed]      = useState(1500); // ms between auto-advance steps

  const { modeRef, mode, pos: flyPos, tickFly } =
    useCameraControls(new THREE.Vector3(0, 22, 40));

  // ── One-time Three.js setup ───────────────────────────────────────────────
  useEffect(() => {
    heightsRef.current = generateHeightmap(seedRef.current);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ec8e3);
    scene.fog = new THREE.Fog(0x7ec8e3, 90, 300);

    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 500);
    camera.position.set(0, 22, 40);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    sceneRef.current    = scene;
    cameraRef.current   = camera;

    const orb = new OrbitControls(camera, renderer.domElement);
    orb.target.set(0, 0, 0);
    orb.maxPolarAngle = Math.PI / 1.9;
    orb.update();

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff5cc, 1.2);
    sun.position.set(10, 18, 8);
    scene.add(sun);
    lightsRef.current = { ambient, sun };

    // Terrain mesh
    const mat  = new THREE.MeshPhongMaterial({ vertexColors: true });
    const geo  = buildGeo(heightsRef.current, 1);
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    meshRef.current = mesh;

    let animId;
    function animate() {
      animId = requestAnimationFrame(animate);
      if (modeRef.current === "fly") {
        orb.enabled = false;
        const { forward } = tickFly();
        camera.position.copy(flyPos.current);
        camera.lookAt(flyPos.current.clone().add(forward));
      } else {
        orb.enabled = true;
        orb.update();
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      orb.dispose();
      renderer.dispose();
      mesh.geometry.dispose();
      mat.dispose();
      if (mountRef.current?.contains(renderer.domElement))
        mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  // ── Rebuild geometry whenever iteration or terrain changes ────────────────
  useEffect(() => {
    if (!meshRef.current || !heightsRef.current) return;
    const old = meshRef.current.geometry;
    meshRef.current.geometry = buildGeo(heightsRef.current, iter);
    old.dispose();
  }, [iter, terrainKey]);

  // ── Auto-advance iterations ────────────────────────────────────────────────
  useEffect(() => {
    if (!running || iter >= MAX_ITER) return;
    const t = setTimeout(() => setIter(i => i + 1), speed);
    return () => clearTimeout(t);
  }, [running, iter, speed]);

  // ── Tint lights with hue ───────────────────────────────────────────────────
  useEffect(() => {
    const { ambient, sun } = lightsRef.current;
    if (!ambient) return;
    const h = hue / 360;
    ambient.color.setHSL(h, 0.15, 0.45);
    sun.color.setHSL(h, 0.35, 0.75);
  }, [hue]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleReset = () => {
    seedRef.current    = Math.floor(Math.random() * 0xFFFFFFFF);
    heightsRef.current = generateHeightmap(seedRef.current);
    setIter(1);
    setTerrainKey(k => k + 1);
    setRunning(true);
  };

  const overlayBtn = (disabled = false) => ({
    background: "none",
    border: "1px solid rgba(255,255,255,0.4)",
    color: "white",
    padding: "4px 10px",
    fontSize: 11,
    letterSpacing: "1px",
    fontFamily: "var(--font)",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.35 : 1,
  });

  const row  = { display: "flex", justifyContent: "space-between", marginBottom: 2 };
  const lbl  = { fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: "1px", textTransform: "uppercase" };
  const val  = { fontSize: 10, color: "rgba(255,255,255,0.85)" };
  const sldr = { width: "100%", accentColor: "#7eb8ff", cursor: "pointer" };

  const speedLabel = speed < 1000
    ? `${speed} ms`
    : `${(speed / 1000).toFixed(1)} s`;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {/* Mode indicator */}
      <div style={{
        position: "absolute", top: 8, left: 8,
        color: "white", fontSize: 12, opacity: 0.6, pointerEvents: "none",
      }}>
        {mode === "fly" ? "FLY  [WASD / arrows / []]" : "ORBIT  [drag]"}  · F / O to switch
      </div>

      {/* Generation controls — top-right */}
      <div style={{
        position: "absolute", top: 8, right: 8,
        display: "flex", flexDirection: "column", gap: 12,
        backgroundColor: "rgba(0,0,0,0.65)",
        padding: "12px 16px", borderRadius: 4,
        color: "white", fontSize: 12, letterSpacing: "1px",
        fontFamily: "var(--font)", minWidth: 210,
      }}>
        {/* Detail label + buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ opacity: 0.65, whiteSpace: "nowrap" }}>
            Detail {iter} / {MAX_ITER}
          </span>
          <button
            style={overlayBtn(iter >= MAX_ITER)}
            disabled={iter >= MAX_ITER}
            onClick={() => setRunning(r => !r)}
          >
            {running && iter < MAX_ITER ? "Pause" : "Resume"}
          </button>
          <button
            style={overlayBtn(iter >= MAX_ITER)}
            disabled={iter >= MAX_ITER}
            onClick={() => { setRunning(false); setIter(i => Math.min(i + 1, MAX_ITER)); }}
          >
            + Detail
          </button>
          <button style={overlayBtn()} onClick={handleReset}>
            New Terrain
          </button>
        </div>

        {/* Speed slider */}
        <div>
          <div style={row}>
            <span style={lbl}>Auto Speed</span>
            <span style={val}>{speedLabel} / step</span>
          </div>
          <input
            type="range" min={200} max={5000} step={100}
            value={5200 - speed} onChange={e => setSpeed(5200 - +e.target.value)}
            style={sldr}
          />
        </div>
      </div>
    </div>
  );
}

export default KochCoastline;
