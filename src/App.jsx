import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React, { useRef, useState } from "react";

import Article from "./Article";
import Navbar  from "./Navbar";

import Controls      from "./components/Controls";
import FractalCanvas from "./components/FractalCanvas";
import { downloadAsPDF } from "./components/downloadPDF";

// ─── Dolly-zoom math ─────────────────────────────────────────────────────────
// Invariant:  distance × tan(fov/2) = K
//   dollyMult > 1  →  camera farther  →  FOV narrows  (telephoto from far)
//   dollyMult < 1  →  camera closer   →  FOV widens   (wide-angle close-up)

function fovFromDolly(baseFovDeg, dollyMult) {
  const baseFovRad = baseFovDeg * (Math.PI / 180);
  const newFovRad  = 2 * Math.atan(Math.tan(baseFovRad / 2) / dollyMult);
  return Math.max(5, Math.min(135, newFovRad * (180 / Math.PI)));
}

const DEFAULT_FOV = 60;

function App() {
  const [fractalType, setFractalType] = useState("Mandelbulb");
  const [colorScheme, setColorScheme] = useState(0);
  const [fov,       setFov]       = useState(DEFAULT_FOV);
  const [dollyMult, setDollyMult] = useState(1.0);

  // FOV at dollyMult === 1 for the current session.
  // Resets when the user moves the FOV slider directly.
  const dollyBaseFovRef = useRef(DEFAULT_FOV);

  function handleFovChange(newFov) {
    setFov(newFov);
    setDollyMult(1.0);
    dollyBaseFovRef.current = newFov;
  }

  function handleDollyChange(newMult) {
    setFov(fovFromDolly(dollyBaseFovRef.current, newMult));
    setDollyMult(newMult);
  }

  const captureRef = useRef(null);

  async function handleDownloadPDF() {
    if (!captureRef.current) return;
    const result = captureRef.current();
    if (!result) return;
    const { dataUrl, width, height } = result;
    const schemeName = [
      "Cosmic-Blue","Molten-Core","Neon-Void","Aurora-Borealis",
      "Ember-Glow","Glacier","Toxic-Waste","Blood-Moon","Solar-Flare","Monochrome",
    ][colorScheme] ?? "Custom";
    await downloadAsPDF(dataUrl, width, height, `${fractalType}-${schemeName}-${Date.now()}.pdf`);
  }

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            <div style={{ display: "flex", height: "100vh" }}>
              <div style={{ flex: 1 }}>
                <FractalCanvas
                  fractalType={fractalType}
                  colorScheme={colorScheme}
                  captureRef={captureRef}
                  fov={fov}
                  dollyMult={dollyMult}
                />
              </div>
              <Controls
                fractalType={fractalType}
                setFractalType={setFractalType}
                colorScheme={colorScheme}
                setColorScheme={setColorScheme}
                onDownloadPDF={handleDownloadPDF}
                fov={fov}
                dollyMult={dollyMult}
                onFovChange={handleFovChange}
                onDollyChange={handleDollyChange}
              />
            </div>
          }
        />
        <Route path="/article" element={<Article />} />
      </Routes>
    </Router>
  );
}

export default App;
