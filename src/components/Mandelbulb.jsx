import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useCameraControls } from "./useCameraControls";

const vertexShader = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform vec2  iResolution;
uniform float iTime;
uniform vec3  iCameraPos;
uniform vec3  iForward;
uniform vec3  iRight;
uniform vec3  iUp;
uniform int   iColorScheme;
uniform float iFocalLength;

float mandelbulbDE(vec3 pos) {
  vec3 z = pos;
  float dr = 1.0;
  float r  = 0.0;
  for (int i = 0; i < 500; i++) {
    r = length(z);
    if (r > 2.0 || r < 0.001) break;
    float theta = acos(clamp(z.z / r, -1.0, 1.0));
    float phi   = atan(z.y, z.x);
    float power = 8.0;
    float zr    = pow(r, power);
    dr          = pow(r, power - 1.0) * power * dr + 1.0;
    theta *= power;
    phi   *= power;
    z = zr * vec3(sin(theta)*cos(phi), sin(theta)*sin(phi), cos(theta)) + pos;
  }
  return 0.5 * log(r) * r / dr;
}

float raymarch(vec3 ro, vec3 rd) {
  // Skip the guaranteed-empty sphere around the camera to reach the bulb
  // faster from any distance, and extend tMax so far cameras don't clip.
  float camDist = length(ro);
  float t    = max(0.0, camDist - 2.2);   // jump to edge of bulb bounding sphere
  float tMax = camDist + 4.0;             // stop just past the far side

  for (int i = 0; i < 512; i++) {
    vec3  p      = ro + rd * t;
    float d      = mandelbulbDE(p);
    float thresh = max(0.000012, t * 0.00018);
    if (d < thresh) return t;
    if (t > tMax)   break;
    t += d * 0.55;
  }
  return -1.0;
}

vec3 getNormal(vec3 p, float t) {
  float eps = max(0.000004, t * 0.000035);
  float dx = mandelbulbDE(p + vec3(eps,0,0)) - mandelbulbDE(p - vec3(eps,0,0));
  float dy = mandelbulbDE(p + vec3(0,eps,0)) - mandelbulbDE(p - vec3(0,eps,0));
  float dz = mandelbulbDE(p + vec3(0,0,eps)) - mandelbulbDE(p - vec3(0,0,eps));
  return normalize(vec3(dx, dy, dz));
}

void main() {
  vec2 uv = (gl_FragCoord.xy / iResolution.xy) * 2.0 - 1.0;
  uv.x *= iResolution.x / iResolution.y;

  vec3 ro      = iCameraPos;
  vec3 forward = normalize(iForward);
  vec3 right   = normalize(iRight);
  vec3 up      = normalize(iUp);
  vec3 rd      = normalize(uv.x * right + uv.y * up + iFocalLength * forward);

  float t = raymarch(ro, rd);

  if (t > 0.0) {
    vec3 p       = ro + rd * t;
    vec3 normal  = getNormal(p, t);
    vec3 viewDir = normalize(ro - p);

    vec3  keyDir  = normalize(vec3( 1.0,  1.2,  0.8));
    vec3  fillDir = normalize(vec3(-1.2,  0.4,  0.3));
    vec3  rimDir  = normalize(vec3( 0.1, -1.0, -0.8));

    float keyDiff  = max(dot(normal, keyDir),  0.0);
    float fillDiff = max(dot(normal, fillDir), 0.0) * 0.45;
    float rimDiff  = max(dot(normal, rimDir),  0.0) * 0.25;

    float keySpec48 = pow(max(dot(viewDir, reflect(-keyDir, normal)), 0.0), 48.0);
    float keySpec24 = pow(max(dot(viewDir, reflect(-keyDir, normal)), 0.0), 24.0);
    float keySpec96 = pow(max(dot(viewDir, reflect(-keyDir, normal)), 0.0), 96.0);
    float keySpec32 = pow(max(dot(viewDir, reflect(-keyDir, normal)), 0.0), 32.0);

    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    float normalY = normal.y * 0.5 + 0.5;

    vec3 color;

    if (iColorScheme == 0) {
      vec3 base = mix(vec3(0.1, 0.38, 0.88), vec3(0.45, 0.75, 1.0), normalY);
      color = base*(keyDiff+0.12) + vec3(0.28,0.50,0.80)*fillDiff
            + vec3(0.95,0.40,0.15)*rimDiff + vec3(1.0)*0.40*keySpec48;
    } else if (iColorScheme == 1) {
      vec3 base = mix(vec3(0.80,0.06,0.0), vec3(1.0,0.56,0.0), normalY);
      color = base*(keyDiff+0.05) + vec3(0.50,0.02,0.0)*fillDiff
            + vec3(1.0,0.90,0.3)*rimDiff + vec3(1.0,0.55,0.0)*fresnel*0.75
            + vec3(1.0,0.88,0.6)*0.55*keySpec24;
    } else if (iColorScheme == 2) {
      vec3 normRGB = abs(normal);
      vec3 base    = mix(vec3(0.0,0.80,1.0), normRGB, 0.55);
      color = base*(keyDiff+0.08) + vec3(0.80,0.0,0.90)*fillDiff
            + vec3(0.50,0.0,1.0)*rimDiff + vec3(0.0,1.0,0.88)*fresnel*0.65
            + vec3(1.0,0.4,1.0)*0.50*keySpec48;
    } else if (iColorScheme == 3) {
      vec3 base = mix(vec3(0.0,0.58,0.50), vec3(0.18,0.98,0.62), normalY);
      vec3 fill = mix(vec3(0.20,0.40,0.80), vec3(0.48,0.0,0.60), normalY);
      color = base*(keyDiff+0.08) + fill*fillDiff
            + vec3(0.0,0.50,1.0)*rimDiff + vec3(0.15,1.0,0.50)*fresnel*0.40
            + vec3(0.80,1.0,1.0)*0.28*keySpec48;
    } else if (iColorScheme == 4) {
      vec3 base = mix(vec3(1.0,0.28,0.0), vec3(1.0,0.72,0.10), normalY);
      color = base*(keyDiff+0.06) + vec3(0.70,0.05,0.0)*fillDiff
            + vec3(1.0,1.0,0.80)*rimDiff + vec3(1.0,0.78,0.38)*fresnel*1.0
            + vec3(1.0,1.0,1.0)*0.70*keySpec24;
    } else if (iColorScheme == 5) {
      vec3 base = mix(vec3(0.50,0.78,1.0), vec3(0.92,0.97,1.0), normalY);
      color = base*(keyDiff+0.16) + vec3(0.20,0.50,0.90)*fillDiff
            + vec3(0.40,0.80,1.0)*rimDiff + vec3(0.75,0.92,1.0)*fresnel*0.50
            + vec3(1.0,1.0,1.0)*0.85*keySpec96;
    } else if (iColorScheme == 6) {
      vec3 base = mix(vec3(0.18,0.78,0.0), vec3(0.68,1.0,0.0), normalY);
      color = base*(keyDiff+0.08) + vec3(0.10,0.40,0.0)*fillDiff
            + vec3(0.90,1.0,0.0)*rimDiff + vec3(0.50,1.0,0.0)*fresnel*0.60
            + vec3(0.80,1.0,0.50)*0.40*keySpec48;
    } else if (iColorScheme == 7) {
      vec3 base = mix(vec3(0.50,0.0,0.0), vec3(0.92,0.05,0.12), normalY);
      color = base*(keyDiff+0.06) + vec3(0.28,0.0,0.0)*fillDiff
            + vec3(1.0,0.38,0.0)*rimDiff + vec3(0.80,0.05,0.0)*fresnel*0.80
            + vec3(1.0,0.60,0.50)*0.40*keySpec48;
    } else if (iColorScheme == 8) {
      vec3 base = mix(vec3(0.82,0.50,0.0), vec3(1.0,0.96,0.62), normalY);
      color = base*(keyDiff+0.10) + vec3(1.0,0.85,0.50)*fillDiff
            + vec3(1.0,1.0,1.0)*rimDiff + vec3(1.0,0.88,0.45)*fresnel*0.50
            + vec3(1.0,1.0,0.92)*0.80*keySpec32;
    } else {
      float lum = keyDiff*0.70 + fillDiff*0.20 + rimDiff*0.10 + 0.10;
      vec3 tint = mix(vec3(0.88,0.92,1.0), vec3(1.0), lum);
      color = tint*lum + vec3(1.0)*0.55*keySpec96;
    }

    gl_FragColor = vec4(color, 1.0);
  } else {
    gl_FragColor = vec4(0.0);
  }
}
`;

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_RADIUS = 8.0;
const CAPTURE_W   = 2560;
const CAPTURE_H   = 2560;

function focalLengthFromFov(fovDeg) {
  // Projects onto the near-plane such that the horizontal FOV equals fovDeg.
  // rd = normalize(uv.x*right + uv.y*up + focalLength*forward)
  return 1.0 / Math.tan((fovDeg * Math.PI / 180) / 2);
}

// ─── Component ────────────────────────────────────────────────────────────────
function Mandelbulb({ colorScheme, captureRef, fov, dollyMult }) {
  const mountRef    = useRef(null);
  const uniformsRef = useRef(null);

  // Refs read every rAF frame — always fresh, no stale-closure bugs
  const fovRef       = useRef(fov);
  const dollyMultRef = useRef(dollyMult);
  const prevDollyRef = useRef(dollyMult); // tracks what we applied last frame

  const initialPos = new THREE.Vector3(0, 0, BASE_RADIUS);
  // useCameraControls exposes yaw + pitch so we can compute forward in fly mode
  const { modeRef, mode, pos, tickFly } = useCameraControls(initialPos);

  // ── Sync prop → ref ───────────────────────────────────────────────────────
  useEffect(() => {
    fovRef.current = fov;
    if (uniformsRef.current) {
      uniformsRef.current.iFocalLength.value = focalLengthFromFov(fov);
    }
  }, [fov]);

  useEffect(() => { dollyMultRef.current = dollyMult; }, [dollyMult]);

  useEffect(() => {
    if (uniformsRef.current) uniformsRef.current.iColorScheme.value = colorScheme;
  }, [colorScheme]);

  // ── Hi-res capture ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!captureRef) return;
    captureRef.current = () => {
      const u = uniformsRef.current;
      if (!u) return null;
      const hiUniforms = {
        iTime:        { value: u.iTime.value },
        iResolution:  { value: new THREE.Vector2(CAPTURE_W, CAPTURE_H) },
        iCameraPos:   { value: u.iCameraPos.value.clone() },
        iForward:     { value: u.iForward.value.clone() },
        iRight:       { value: u.iRight.value.clone() },
        iUp:          { value: u.iUp.value.clone() },
        iColorScheme: { value: u.iColorScheme.value },
        iFocalLength: { value: u.iFocalLength.value },
      };
      const hiRenderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
      hiRenderer.setSize(CAPTURE_W, CAPTURE_H);
      const hiGeo   = new THREE.PlaneGeometry(2, 2);
      const hiMat   = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: hiUniforms });
      const hiScene = new THREE.Scene();
      hiScene.add(new THREE.Mesh(hiGeo, hiMat));
      hiRenderer.render(hiScene, new THREE.Camera());
      const dataUrl = hiRenderer.domElement.toDataURL("image/jpeg", 0.95);
      hiRenderer.dispose(); hiGeo.dispose(); hiMat.dispose();
      return { dataUrl, width: CAPTURE_W, height: CAPTURE_H };
    };
  });

  // ── Three.js setup (once) ─────────────────────────────────────────────────
  useEffect(() => {
    const scene    = new THREE.Scene();
    const camera   = new THREE.Camera();
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(2, 2);

    // Orbit state (only used in orbit mode)
    let theta = Math.PI / 4;
    let phi   = 0;

    function getCameraPos() {
      // Orbit radius = BASE_RADIUS × dollyMult so the slider moves the camera in orbit mode
      const r = BASE_RADIUS * dollyMultRef.current;
      return new THREE.Vector3(
        r * Math.sin(theta) * Math.cos(phi),
        r * Math.cos(theta),
        r * Math.sin(theta) * Math.sin(phi)
      );
    }

    function getOrbitBasis(ro) {
      const forward = ro.clone().negate().normalize();
      const right   = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      const up      = new THREE.Vector3().crossVectors(right, forward);
      return { forward, right, up };
    }

    const initPos   = getCameraPos();
    const initBasis = getOrbitBasis(initPos);

    const uniforms = {
      iTime:        { value: 0 },
      iResolution:  { value: new THREE.Vector2(mountRef.current.clientWidth, mountRef.current.clientHeight) },
      iCameraPos:   { value: initPos },
      iForward:     { value: initBasis.forward },
      iRight:       { value: initBasis.right },
      iUp:          { value: initBasis.up },
      iColorScheme: { value: colorScheme },
      iFocalLength: { value: focalLengthFromFov(fov) },
    };
    uniformsRef.current = uniforms;

    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
    scene.add(new THREE.Mesh(geometry, material));

    // Mouse orbit (orbit mode only)
    let isDragging = false, lastX = 0, lastY = 0;
    const onMouseDown = (e) => { isDragging = true; lastX = e.clientX; lastY = e.clientY; };
    const onMouseUp   = ()    => { isDragging = false; };
    const onMouseMove = (e)   => {
      if (!isDragging || modeRef.current !== "orbit") return;
      phi   -= (e.clientX - lastX) * 0.005;
      theta -= (e.clientY - lastY) * 0.005;
      theta  = Math.max(0.1, Math.min(Math.PI - 0.1, theta));
      lastX = e.clientX; lastY = e.clientY;
    };
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup",   onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    // Animation loop
    let animationId;
    function animate(time = 0) {
      animationId = requestAnimationFrame(animate);
      uniforms.iTime.value = time * 0.001;

      // ── Dolly-zoom position adjustment ─────────────────────────────────
      // Works in BOTH modes. In orbit mode the radius is baked into
      // getCameraPos() via dollyMultRef, so we only need the explicit
      // position correction in fly mode.
      const curDolly  = dollyMultRef.current;
      const prevDolly = prevDollyRef.current;
      const dollyDelta = Math.abs(curDolly - prevDolly);

      if (dollyDelta > 0.00005 && modeRef.current === "fly") {
        // Scale the camera's distance from the origin by the dolly ratio.
        const len = pos.current.length();
        if (len > 0.001) {
          pos.current.multiplyScalar(curDolly / prevDolly);
        }
      }
      prevDollyRef.current = curDolly;

      // ── Camera uniforms ────────────────────────────────────────────────
      if (modeRef.current === "fly") {
        const { forward, right, up } = tickFly();
        uniforms.iCameraPos.value.copy(pos.current);
        uniforms.iForward.value.copy(forward);
        uniforms.iRight.value.copy(right);
        uniforms.iUp.value.copy(up);
      } else {
        const ro = getCameraPos();
        const { forward, right, up } = getOrbitBasis(ro);
        uniforms.iCameraPos.value.copy(ro);
        uniforms.iForward.value.copy(forward);
        uniforms.iRight.value.copy(right);
        uniforms.iUp.value.copy(up);
      }

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup",   onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={mountRef}
        style={{ width: "100%", height: "100%", cursor: mode === "orbit" ? "grab" : "crosshair" }}
      />
      <div style={{
        position: "absolute", top: 8, left: 8,
        color: "white", fontSize: 12, opacity: 0.6, pointerEvents: "none",
      }}>
        {mode === "fly" ? "FLY  [WASD + mouse + []]" : "ORBIT  [drag mouse]"}
        {" "}· Press F / O
      </div>
    </div>
  );
}

export default Mandelbulb;
