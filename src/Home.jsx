import Controls from "./components/Controls";
import { useState, useRef } from "react";
import FractalCanvas from "./components/FractalCanvas";

function Home() {
  const [fractalType, setFractalType] = useState("Octahedron");
  const [colorScheme, setColorScheme] = useState(0);
  const [fov, setFov] = useState(60);
  const [dollyMult, setDollyMult] = useState(1.0);
  const captureRef = useRef(null);

  async function handleDownloadImage() {
    if (!captureRef.current) return;
    const result = captureRef.current();
    if (!result) return;
    const { dataUrl } = result;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `edufrac-${fractalType.toLowerCase()}.jpg`;
    a.click();
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <FractalCanvas
        fractalType={fractalType}
        colorScheme={colorScheme}
        captureRef={captureRef}
        fov={fov}
        dollyMult={dollyMult}
      />
      <Controls
        fractalType={fractalType}
        setFractalType={setFractalType}
        colorScheme={colorScheme}
        setColorScheme={setColorScheme}
        fov={fov}
        dollyMult={dollyMult}
        onFovChange={setFov}
        onDollyChange={setDollyMult}
        onDownloadImage={handleDownloadImage}
      />
    </div>
  );
}

export default Home;
