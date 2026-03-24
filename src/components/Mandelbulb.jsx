import { useEffect, useRef } from "react";
import * as THREE from "three";

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

float mandelbulbDE(vec3 pos) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;

    for (int i = 0; i < 320; i++) {
        r = length(z);
        if (r > 2.0) break;
        if (r < 0.0001) break;

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
    for (int i = 0; i < 150; i++) {  // more steps to compensate
        vec3 p = ro + rd * t;
        float d = mandelbulbDE(p);
        if (d < 0.0002) return t;
        if (t > 20.0) break;
        t += d * 0.5;  // ← the fix
    }
    return -1.0;
}

// 🔥 NORMAL ESTIMATION
vec3 getNormal(vec3 p) {
    float eps = 0.0005;

    float dx = mandelbulbDE(p + vec3(eps,0,0)) - mandelbulbDE(p - vec3(eps,0,0));
    float dy = mandelbulbDE(p + vec3(0,eps,0)) - mandelbulbDE(p - vec3(0,eps,0));
    float dz = mandelbulbDE(p + vec3(0,0,eps)) - mandelbulbDE(p - vec3(0,0,eps));

    return normalize(vec3(dx, dy, dz));
}

void main() {
    vec2 uv = (gl_FragCoord.xy / iResolution.xy) * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    vec3 ro = iCameraPos;

    vec3 forward = normalize(-ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);

    vec3 rd = normalize(uv.x * right + uv.y * up + 2.5 * forward);

    float t = raymarch(ro, rd);

    if (t > 0.0) {
        vec3 p = ro + rd * t;
        vec3 normal = getNormal(p);

        // 🔥 LIGHTING
        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
        float diffuse = max(dot(normal, lightDir), 0.0);

        float ambient = 0.2;

        vec3 viewDir = normalize(ro - p);
        vec3 reflectDir = reflect(-lightDir, normal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

        float lighting = diffuse + ambient + 0.5 * spec;

        // 🔥 COLOR
        vec3 baseColor = vec3(0.2, 0.6, 1.0);

        gl_FragColor = vec4(baseColor * lighting, 1.0);
    } else {
        gl_FragColor = vec4(0.0);
    }
}
`;

function Mandelbulb() {
  const mountRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(2, 2);

    // Spherical coords for orbit
    let theta = Math.PI / 4;  // vertical angle
    let phi = 0;               // horizontal angle
    const radius = 8.0;

    function getCameraPos() {
      return new THREE.Vector3(
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.cos(theta),
        radius * Math.sin(theta) * Math.sin(phi)
      );
    }

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2(mountRef.current.clientWidth, mountRef.current.clientHeight) },
      iCameraPos: { value: getCameraPos() },
    };

    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Mouse drag tracking
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const onMouseDown = (e) => { isDragging = true; lastX = e.clientX; lastY = e.clientY; };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      phi   -= dx * 0.005;
      theta -= dy * 0.005;
      theta = Math.max(0.1, Math.min(Math.PI - 0.1, theta)); // clamp to avoid flip
      uniforms.iCameraPos.value = getCameraPos();
      lastX = e.clientX;
      lastY = e.clientY;
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    let animationId;
    function animate(time = 0) {
      animationId = requestAnimationFrame(animate);
      uniforms.iTime.value = time * 0.001;
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement))
        mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return <div style={{ width: "100%", height: "100%", cursor: "grab" }} ref={mountRef} />;
}

export default Mandelbulb;