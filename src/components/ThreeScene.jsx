import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

function ThreeScene({ type }) {
  const totalPointsRef = useRef(0);
  const visiblePointsRef = useRef(0);
  const buildingRef = useRef(false);
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const pointsRef = useRef(null);

  // 🔹 1. Initialize Scene ONCE
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

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    let animationId;

    function animate() {
      animationId = requestAnimationFrame(animate);

      controls.update();

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

  // Remove old fractal
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
      const totalPoints = positions.length / 3;

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );

      geometry.setDrawRange(0, 0);

      const material = new THREE.PointsMaterial({
        size: 0.01,
        color: 0xffffff
      });

      const points = new THREE.Points(geometry, material);

      sceneRef.current.add(points);
      pointsRef.current = points;

      // 🔹 Reset build state
      totalPointsRef.current = totalPoints;
      visiblePointsRef.current = 0;
      buildingRef.current = true;
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