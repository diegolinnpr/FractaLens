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

uniform vec2 iResolution;
uniform float iTime;
uniform vec3 iCameraPos;
uniform vec3 iForward;
uniform vec3 iRight;
uniform vec3 iUp;

float mandelbulbDE(vec3 pos) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;

    for (int i = 0; i < 500; i++) {
        r = length(z);
        if (r > 2.0) break;
        if (r < 0.001) break;

        float theta = acos(clamp(z.z / r, -1.0, 1.0));
        float phi = atan(z.y, z.x);
        float power = 8.0;

        float zr = pow(r, power);
        dr = pow(r, power - 1.0) * power * dr + 1.0;

        theta *= power;
        phi *= power;

        z = zr * vec3(
            sin(theta)*cos(phi),
            sin(theta)*sin(phi),
            cos(theta)
        ) + pos;
    }

    return 0.5 * log(r) * r / dr;
}

float raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for (int i = 0; i < 500; i++) {
        vec3 p = ro + rd * t;
        float d = mandelbulbDE(p);
        // Adaptive threshold: scales with ray distance so close-up rays march
        // closer to the surface (more detail) while distant rays exit sooner
        // (freeing that budget). Net iteration count stays roughly the same.
        float thresh = max(0.000015, t * 0.00022);
        if (d < thresh) return t;
        if (t > 20.0) break;
        t += d * 0.5;
    }
    return -1.0;
}

// Normal eps also scales with t: tight when close (preserves fine detail),
// loose when far (where sub-pixel detail is invisible anyway).
vec3 getNormal(vec3 p, float t) {
    float eps = max(0.000005, t * 0.00004);

    float dx = mandelbulbDE(p + vec3(eps,0,0)) - mandelbulbDE(p - vec3(eps,0,0));
    float dy = mandelbulbDE(p + vec3(0,eps,0)) - mandelbulbDE(p - vec3(0,eps,0));
    float dz = mandelbulbDE(p + vec3(0,0,eps)) - mandelbulbDE(p - vec3(0,0,eps));

    return normalize(vec3(dx, dy, dz));
}

void main() {
    vec2 uv = (gl_FragCoord.xy / iResolution.xy) * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    vec3 ro = iCameraPos;
    vec3 forward = normalize(iForward);
    vec3 right   = normalize(iRight);
    vec3 up      = normalize(iUp);
    vec3 rd = normalize(uv.x * right + uv.y * up + 2.5 * forward);

    float t = raymarch(ro, rd);

    if (t > 0.0) {
        vec3 p = ro + rd * t;
        vec3 normal = getNormal(p, t);
        vec3 viewDir = normalize(ro - p);

        // Key light — warm, upper-right-front
        vec3 keyDir  = normalize(vec3(1.0, 1.2, 0.8));
        float keyDiff = max(dot(normal, keyDir), 0.0);
        float keySpec = pow(max(dot(viewDir, reflect(-keyDir, normal)), 0.0), 48.0);

        // Fill light — cool, left side, prevents full blackout on opposite faces
        vec3 fillDir  = normalize(vec3(-1.2, 0.4, 0.3));
        float fillDiff = max(dot(normal, fillDir), 0.0) * 0.45;

        // Rim light — from below-back, lifts bottom edges off pure black
        vec3 rimDir   = normalize(vec3(0.1, -1.0, -0.8));
        float rimDiff  = max(dot(normal, rimDir), 0.0) * 0.25;

        float ambient = 0.12;

        // Per-light tinting gives the shape more colour richness
        vec3 baseColor = vec3(0.2,  0.6,  1.0);  // cool blue — key
        vec3 fillColor = vec3(0.3,  0.5,  0.8);  // softer blue — fill
        vec3 rimColor  = vec3(0.95, 0.4,  0.15); // warm orange — rim

        vec3 color = baseColor * (keyDiff + ambient)
                   + fillColor * fillDiff
                   + rimColor  * rimDiff
                   + vec3(1.0) * 0.4 * keySpec;   // white specular highlight

        gl_FragColor = vec4(color, 1.0);
    } else {
        gl_FragColor = vec4(0.0);
    }
}
`;

function Mandelbulb() {
  const mountRef = useRef(null);
  const initialPos = new THREE.Vector3(0, 0, 8);
  const { modeRef, mode, pos, tickFly } = useCameraControls(initialPos);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const renderer = new THREE.WebGLRenderer();

    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    mountRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(2, 2);

    // ORBIT STATE
    let theta = Math.PI / 4;
    let phi = 0;
    const radius = 8.0;

    function getCameraPos() {
      return new THREE.Vector3(
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.cos(theta),
        radius * Math.sin(theta) * Math.sin(phi)
      );
    }

    function getOrbitBasis(ro) {
      const forward = ro.clone().negate().normalize();
      const right = new THREE.Vector3()
        .crossVectors(forward, new THREE.Vector3(0, 1, 0))
        .normalize();
      const up = new THREE.Vector3().crossVectors(right, forward);
      return { forward, right, up };
    }

    // INIT
    const initPos = getCameraPos();
    const initBasis = getOrbitBasis(initPos);

    const uniforms = {
      iTime: { value: 0 },
      iResolution: {
        value: new THREE.Vector2(
          mountRef.current.clientWidth,
          mountRef.current.clientHeight
        ),
      },
      iCameraPos: { value: initPos },
      iForward: { value: initBasis.forward },
      iRight: { value: initBasis.right },
      iUp: { value: initBasis.up },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // MOUSE ORBIT
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onMouseMove = (e) => {
      if (!isDragging || modeRef.current !== "orbit") return;

      phi -= (e.clientX - lastX) * 0.005;
      theta -= (e.clientY - lastY) * 0.005;

      theta = Math.max(0.1, Math.min(Math.PI - 0.1, theta));

      lastX = e.clientX;
      lastY = e.clientY;
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    // ANIMATION LOOP
    let animationId;

    function animate(time = 0) {
      animationId = requestAnimationFrame(animate);

      uniforms.iTime.value = time * 0.001;

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
      window.removeEventListener("mouseup", onMouseUp);
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
      style={{
        width: "100%",
        height: "100%",
        cursor: mode === "orbit" ? "grab" : "crosshair"
      }}
    />

    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        color: "white",
        fontSize: 12,
        opacity: 0.6,
        pointerEvents: "none"
      }}
    >
      {mode === "fly"
        ? "FLY  [WASD + arrows + []]"
        : "ORBIT  [drag mouse]"}  
      {" "}· Press F / O
    </div>
  </div>
);
}

export default Mandelbulb;