import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

// ─── Scene constants ──────────────────────────────────────────────────────────
const CLOUD_Y        = 11;
const GROUND_Y       = -14;
const MAX_TIPS       = 80;     // cap active tips so branching can't explode
const MAX_BRANCH_D   = 4;      // deepest branch level
const STEP_DECAY     = 0.93;   // step-size multiplier per branch depth level

// ─── Geometry helpers ─────────────────────────────────────────────────────────
const _UP   = new THREE.Vector3(0, 1, 0);
const _SIDE = new THREE.Vector3(1, 0, 0);
const _DOWN = new THREE.Vector3(0, -1, 0);

function makeSegMesh(start, end, depth, hue, scene) {
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  if (len < 0.01) return null;

  // Thickness decreases with each branch level — self-similar but visibly thinner
  const radii = [0.14, 0.088, 0.056, 0.034, 0.020];
  const r = radii[Math.min(depth, radii.length - 1)];

  // Trunk = near-white; branches drop in both brightness and opacity so
  // the hierarchy reads clearly — deeper branches are visibly dimmer.
  const h   = hue / 360;
  const col = new THREE.Color().setHSL(
    h,
    depth === 0 ? 0.15 : 0.50 + depth * 0.10,
    depth === 0 ? 0.88 : Math.max(0.38, 0.78 - depth * 0.13),
  );
  const opacity = [0.78, 0.58, 0.42, 0.28, 0.18][Math.min(depth, 4)];

  const geo  = new THREE.CylinderGeometry(r, r, len, 5, 1);
  const mat  = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity });
  const mesh = new THREE.Mesh(geo, mat);

  // Position at midpoint, orient along segment direction
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  const dirN = dir.divideScalar(len);
  if (dirN.dot(_UP) < -0.9999) {
    mesh.quaternion.setFromAxisAngle(_SIDE, Math.PI);
  } else {
    mesh.quaternion.setFromUnitVectors(_UP, dirN);
  }
  scene.add(mesh);
  return mesh;
}

// ─── Growth direction helpers ─────────────────────────────────────────────────

// Each growth step: blend the tip's current direction toward straight-down, then
// add a perpendicular random kick whose magnitude is proportional to step size.
// The proportionality is constant across all branch depths — that is the property
// that makes the structure self-similar (scale-invariant roughness coefficient).
function computeStep(tipDir, depth) {
  const stepLen = 0.88 * Math.pow(STEP_DECAY, depth);

  // Gentle pull toward straight-down — low enough that horizontal wandering
  // is common, giving the wide spread the Lichtenberg pattern needs.
  const d = tipDir.clone().lerp(_DOWN, 0.10).normalize();

  // Perpendicular jitter — same relative coefficient at every depth (self-similar).
  // Larger value = more jagged zigzag at every scale.
  const ref = Math.abs(d.y) > 0.9 ? _SIDE.clone() : _UP.clone();
  const p1  = new THREE.Vector3().crossVectors(d, ref).normalize();
  const p2  = new THREE.Vector3().crossVectors(d, p1).normalize();
  d.addScaledVector(p1, (Math.random() - 0.5) * 2 * 1.05);
  d.addScaledVector(p2, (Math.random() - 0.5) * 2 * 1.05);

  // Soft floor only — allow near-horizontal travel, just never upward
  if (d.y > 0.05) d.y = 0.05 - Math.random() * 0.12;
  d.normalize();

  return d.multiplyScalar(stepLen);
}

// Branch direction: rotate parent direction 45–95° around a random horizontal axis.
// Large angles ensure visually divergent pathways.
function makeBranchDir(parentDir) {
  // 65–130° split from parent — forces wide spatial separation between pathways
  const angle = THREE.MathUtils.degToRad(65 + Math.random() * 65);
  const axis  = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5);
  if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
  axis.normalize();
  const d = parentDir.clone().applyQuaternion(
    new THREE.Quaternion().setFromAxisAngle(axis, angle),
  );
  // Only a very soft downward nudge — branches are allowed to go sideways
  if (d.y > 0.20) d.y = 0.20 - Math.random() * 0.25;
  return d.normalize();
}

// ─── Cloud ────────────────────────────────────────────────────────────────────
function buildCloud(scene) {
  const group = new THREE.Group();
  const blobs = [
    [0, 14, 0, 5.5], [-5, 13, 1.5, 3.8], [5, 13.5, -2, 3.8],
    [-2, 16, -2.5, 3], [3.5, 16.5, 2, 2.8],
    [-6, 12, -2.5, 2.3], [6, 12.5, 1.5, 2.3],
  ];
  for (const [x, y, z, r] of blobs) {
    const mat  = new THREE.MeshStandardMaterial({
      color: 0x2a3555, roughness: 1, metalness: 0,
      emissive: new THREE.Color(0.05, 0.07, 0.16), emissiveIntensity: 1,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 11, 9), mat);
    mesh.position.set(x, y, z);
    group.add(mesh);
  }
  scene.add(group);
  return group;
}

// ─────────────────────────────────────────────────────────────────────────────

function LichtenbergLightning({ hue = 200 }) {
  const mountRef = useRef(null);
  const hueRef   = useRef(hue);

  // User-controlled — React state drives the UI; refs feed the animation loop
  const [stepsPerSec, setStepsPerSec] = useState(3);
  const [branchProb,  setBranchProb]  = useState(0.25);
  const [phaseLabel,  setPhaseLabel]  = useState("idle");
  const stepsRef    = useRef(3);
  const branchRef   = useRef(0.25);
  const triggerRef  = useRef(null);

  useEffect(() => { hueRef.current  = hue;          }, [hue]);
  useEffect(() => { stepsRef.current = stepsPerSec; }, [stepsPerSec]);
  useEffect(() => { branchRef.current = branchProb; }, [branchProb]);

  useEffect(() => {
    const mount = mountRef.current;
    const W = mount.clientWidth, H = mount.clientHeight;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1830);
    scene.fog = new THREE.FogExp2(0x0d1830, 0.009);

    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 400);
    camera.position.set(22, 4, 22);
    camera.lookAt(0, 0, 0);

    // ── Post-processing ───────────────────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.6, 0.20);
    composer.addPass(bloom);

    // ── Controls ──────────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.minDistance = 8;
    controls.maxDistance = 90;
    controls.enableDamping = true;

    // ── Lighting ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x2a3d60, 2.2));
    const key = new THREE.DirectionalLight(0x5070b0, 1.4);
    key.position.set(-15, 30, 10);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x203050, 0.6);
    fill.position.set(12, 10, -10);
    scene.add(fill);
    scene.add(new THREE.HemisphereLight(0x0d1830, 0x1a2440, 0.5));

    // ── Ground ────────────────────────────────────────────────────────────────
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0x111a28, roughness: 0.92 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;
    scene.add(ground);

    // ── Cloud ─────────────────────────────────────────────────────────────────
    const cloudGroup = buildCloud(scene);

    function pulseCloud(t) {
      cloudGroup.traverse(o => {
        if (o.isMesh && o.material.emissive) {
          o.material.emissive.setRGB(0.05 + 0.6 * t, 0.07 + 0.6 * t, 0.16 + 0.5 * t);
        }
      });
    }

    // ── Growth state ──────────────────────────────────────────────────────────
    // tip   = { pos: V3, parentSeg: seg|null, depth: int, dir: V3 }
    // seg   = { start: V3, end: V3, parentSeg: seg|null, depth: int, mesh: Mesh }
    let front        = [];
    let allSegs      = [];
    let strikePhase  = "idle";
    let phaseT0      = performance.now();
    let accumTime    = 0;
    let lastTs       = performance.now();

    function clearAll() {
      for (const s of allSegs) {
        if (s.mesh) {
          scene.remove(s.mesh);
          s.mesh.geometry.dispose();
          s.mesh.material.dispose();
        }
      }
      allSegs = [];
      front   = [];
    }

    function startGrowth() {
      clearAll();
      const sx = (Math.random() - 0.5) * 3;
      const sz = (Math.random() - 0.5) * 3;
      front = [{
        pos: new THREE.Vector3(sx, CLOUD_Y, sz),
        parentSeg: null,
        depth: 0,
        dir: new THREE.Vector3(0, -1, 0),
      }];
      bloom.strength = 0.7;
      strikePhase = "growing";
      phaseT0     = performance.now();
      accumTime   = 0;
      setPhaseLabel("growing");
    }

    // One discrete growth step — advances every active tip by one segment.
    // The Lichtenberg fractal property lives here: each tip's step direction is
    // computed with the same perpendicular roughness coefficient regardless of
    // depth, giving scale-invariant self-similar structure. Branches are seeded
    // at the tip position with a large angular offset so pathways genuinely
    // diverge rather than cluster around the trunk.
    function doStep() {
      if (strikePhase !== "growing" || front.length === 0) return;

      const newFront = [];
      let winner = null;

      for (const tip of front) {
        const step   = computeStep(tip.dir, tip.depth);
        const newPos = tip.pos.clone().add(step);

        // Create and register segment
        const seg = {
          start: tip.pos.clone(),
          end:   newPos.clone(),
          parentSeg: tip.parentSeg,
          depth:     tip.depth,
          mesh:      makeSegMesh(tip.pos, newPos, tip.depth, hueRef.current, scene),
        };
        allSegs.push(seg);

        if (newPos.y <= GROUND_Y) {
          if (!winner) winner = seg;
          continue; // this tip is done
        }

        const newDir = step.clone().normalize();

        // Continue tip
        newFront.push({ pos: newPos, parentSeg: seg, depth: tip.depth, dir: newDir });

        // Possibly spawn a branch — capped by max tips and max depth
        if (
          tip.depth < MAX_BRANCH_D &&
          newFront.length + front.length < MAX_TIPS &&
          Math.random() < branchRef.current
        ) {
          newFront.push({
            pos:       newPos,
            parentSeg: seg,
            depth:     tip.depth + 1,
            dir:       makeBranchDir(newDir),
          });
        }
      }

      front = newFront;

      if (winner) {
        announceWinner(winner);
      } else if (front.length === 0) {
        // Rare: all tips died above ground — restart
        strikePhase = "pausing";
        phaseT0     = performance.now();
      }
    }

    // Trace the winning path (winner → root via parentSeg pointers).
    // Brighten those segments, hide all others, then start the hold phase.
    function announceWinner(winSeg) {
      const winPath = new Set();
      let cur = winSeg;
      while (cur) { winPath.add(cur); cur = cur.parentSeg; }

      for (const s of allSegs) {
        if (!s.mesh) continue;
        if (winPath.has(s)) {
          s.mesh.material.color.set(0xffffff);
          s.mesh.material.opacity = 1.0;
        } else {
          // Instantly hide losers — the winner channel is all that remains
          s.mesh.material.opacity = 0;
        }
      }

      bloom.strength = 1.6;
      pulseCloud(1);
      strikePhase = "holding";
      phaseT0     = performance.now();
      setPhaseLabel("resolved");
    }

    triggerRef.current = startGrowth;

    // ── Animation loop ─────────────────────────────────────────────────────────
    let animId;
    function tick(ts) {
      animId = requestAnimationFrame(tick);
      const dt = ts - lastTs;
      lastTs   = ts;
      controls.update();

      if (strikePhase === "growing") {
        accumTime += dt;
        const interval = 1000 / stepsRef.current;
        while (accumTime >= interval && strikePhase === "growing") {
          accumTime -= interval;
          doStep();
        }

      } else if (strikePhase === "holding") {
        // Hold bright winner for 1.8 s, with bloom decaying back to steady
        const t = Math.min(1, (ts - phaseT0) / 600);
        bloom.strength = THREE.MathUtils.lerp(1.6, 0.7, t);
        pulseCloud(1 - Math.min(1, (ts - phaseT0) / 400));
        if (ts - phaseT0 > 1800) {
          strikePhase = "fading";
          phaseT0     = ts;
          setPhaseLabel("fading");
        }

      } else if (strikePhase === "fading") {
        // Winner path fades out over 700 ms
        const t = Math.min(1, (ts - phaseT0) / 700);
        for (const s of allSegs) {
          if (s.mesh && s.mesh.material.opacity > 0) {
            s.mesh.material.opacity = 1 - t;
          }
        }
        bloom.strength = THREE.MathUtils.lerp(0.7, 0, t);
        if (ts - phaseT0 > 700) {
          strikePhase = "pausing";
          phaseT0     = ts;
          setPhaseLabel("idle");
        }

      } else if (strikePhase === "pausing") {
        // Short pause before new strike
        if (ts - phaseT0 > 600 + Math.random() * 800) {
          startGrowth();
        }
      }

      composer.render();
    }

    startGrowth();
    tick(performance.now());

    return () => {
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // ── UI ────────────────────────────────────────────────────────────────────
  const row = { display: "flex", justifyContent: "space-between", marginBottom: 4 };
  const lbl = { fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: "1px", textTransform: "uppercase" };
  const val = { fontSize: 10, color: "rgba(255,255,255,0.85)" };
  const sldr = { width: "100%", accentColor: "#7eb8ff", cursor: "pointer" };
  const btn = {
    background: "none", border: "1px solid rgba(255,255,255,0.4)",
    color: "white", padding: "4px 10px", fontSize: 11,
    letterSpacing: "1px", fontFamily: "var(--font)", cursor: "pointer",
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      <div style={{
        position: "absolute", top: 8, left: 8,
        color: "white", fontSize: 12, opacity: 0.6, pointerEvents: "none",
      }}>
        Lichtenberg Lightning · ORBIT [drag]
      </div>

      <div style={{
        position: "absolute", top: 8, right: 8,
        display: "flex", flexDirection: "column", gap: 12,
        backgroundColor: "rgba(0,0,0,0.65)",
        padding: "12px 16px", borderRadius: 4,
        color: "white", fontSize: 12, letterSpacing: "1px",
        fontFamily: "var(--font)", minWidth: 190,
      }}>
        {/* Status + new-strike */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ opacity: 0.6, fontSize: 11 }}>{phaseLabel}</span>
          <button style={btn} onClick={() => triggerRef.current?.()}>New Strike</button>
        </div>

        {/* Speed */}
        <div>
          <div style={row}>
            <span style={lbl}>Growth Speed</span>
            <span style={val}>{stepsPerSec} steps/s</span>
          </div>
          <input type="range" min={1} max={20} step={1}
            value={stepsPerSec} onChange={e => setStepsPerSec(+e.target.value)}
            style={sldr}
          />
        </div>

        {/* Branch frequency */}
        <div>
          <div style={row}>
            <span style={lbl}>Branch Frequency</span>
            <span style={val}>{Math.round(branchProb * 100)}%</span>
          </div>
          <input type="range" min={0.05} max={0.60} step={0.05}
            value={branchProb} onChange={e => setBranchProb(+e.target.value)}
            style={sldr}
          />
        </div>
      </div>
    </div>
  );
}

export default LichtenbergLightning;
