import Controls from "./components/Controls";
import { useState, useRef } from "react";
import FractalCanvas from "./components/FractalCanvas";
import { downloadAsPDF } from "./components/downloadPDF";

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
    const { dataUrl, width, height } = result;
    const filename = `edufrac-${fractalType.toLowerCase()}-${Date.now()}.pdf`;
    await downloadAsPDF(dataUrl, width, height, filename);
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
