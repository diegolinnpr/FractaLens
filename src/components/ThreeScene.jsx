import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { useCameraControls } from "./useCameraControls";

function ThreeScene({ type }) {
  const totalPointsRef = useRef(0);
  const visiblePointsRef = useRef(0);
  const buildingRef = useRef(false);
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const pointsRef = useRef(null);
  const orbitRef = useRef(null);

  const { modeRef, mode, pos: flyPos, tickFly } = useCameraControls(new THREE.Vector3(0, 0, 5));
    useEffect(() => {

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
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
    orbitRef.current = controls;

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    let animationId;

    function animate() {
      animationId = requestAnimationFrame(animate);

      if (modeRef.current === "fly") {
        controls.enabled = false;
        const { forward } = tickFly();
        camera.position.copy(flyPos.current);
        camera.lookAt(flyPos.current.clone().add(forward));
      } else {
        controls.enabled = true;
      controls.update();
        controls.update();
      }
      // 🔹 Build fractal gradually
      if (buildingRef.current && pointsRef.current) {
        visiblePointsRef.current += 250;

      if (visiblePointsRef.current >= totalPointsRef.current) {
        visiblePointsRef.current = totalPointsRef.current;
        buildingRef.current = false;
      }

        pointsRef.current.geometry.setDrawRange(
          0,
          visiblePointsRef.current
        );

        const progress = visiblePointsRef.current / totalPointsRef.current;
        pointsRef.current.material.opacity = 1.0 - progress * 0.7;
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

  // 🔹 2. Update Geometry When Type Changes
  useEffect(() => {
    if (sceneRef.current && type) {
    updateGeometry(type);
    }
  }, [type]);

  // 🔹 3. Geometry Update Function
  function updateGeometry(type) {
    if (!sceneRef.current) return;
    if (pointsRef.current) {
      sceneRef.current.remove(pointsRef.current);
      pointsRef.current.geometry.dispose();
      pointsRef.current.material.dispose();
      pointsRef.current = null;
    }
    const fractalFiles = {
      Octahedron:  "/data/octahedron.bin",
      Dodecahedron:"/data/dodecahedron.bin",
      Tetrahedron: "/data/tetrahedron.bin"
    };
    const filePath = fractalFiles[type];
    if (!filePath) return;

    fetch(filePath)
      .then(res => res.arrayBuffer())
      .then(buffer => {
        const positions  = new Float32Array(buffer);
        const geometry   = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, 0);
        const material   = new THREE.PointsMaterial({ size: 0.01, color: 0xffffff, transparent: true, opacity: 1.0 });
        const points     = new THREE.Points(geometry, material);
        sceneRef.current.add(points);
        pointsRef.current     = points;
        totalPointsRef.current   = positions.length / 3;
        visiblePointsRef.current = 0;
        buildingRef.current      = true;
      });
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", top: 8, left: 8, color: "white", fontSize: 12, opacity: 0.6, pointerEvents: "none" }}>
        {mode === "fly" ? "FLY  [WASD / arrows / []]" : "ORBIT  [drag]"}  · F / O to switch
      </div>
    </div>
  );
}

export default ThreeScene;