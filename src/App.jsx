import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React, { useRef, useState } from "react";

import Home from "./Home";
import Article from "./Article";
import Navbar from "./Navbar";

import Controls from "./components/Controls";
import FractalCanvas from "./components/FractalCanvas";
import { downloadAsPDF } from "./components/downloadPDF";

function App() {
  const [fractalType, setFractalType] = useState("Mandelbulb");
  const [colorScheme, setColorScheme] = useState(0);

  // Shared ref that whichever renderer is currently mounted will populate
  // with a function that returns { dataUrl, width, height }.
  const captureRef = useRef(null);

  async function handleDownloadPDF() {
    if (!captureRef.current) return;

    const result = captureRef.current();
    if (!result) return;

    const { dataUrl, width, height } = result;
    const schemeName = [
      "Cosmic-Blue", "Molten-Core", "Neon-Void", "Aurora-Borealis",
      "Ember-Glow", "Glacier", "Toxic-Waste", "Blood-Moon",
      "Solar-Flare", "Monochrome",
    ][colorScheme] ?? "Custom";

    const filename = `${fractalType}-${schemeName}-${Date.now()}.pdf`;
    await downloadAsPDF(dataUrl, width, height, filename);
  }

  return (
    <Router>
      <Navbar />

      <Routes>
        <Route
          path="/"
          element={
            <div style={{ display: "flex", height: "100vh" }}>
              {/* Main Canvas */}
              <div style={{ flex: 1 }}>
                <FractalCanvas
                  fractalType={fractalType}
                  colorScheme={colorScheme}
                  captureRef={captureRef}
                />
              </div>

              {/* Controls Panel */}
              <Controls
                fractalType={fractalType}
                setFractalType={setFractalType}
                colorScheme={colorScheme}
                setColorScheme={setColorScheme}
                onDownloadPDF={handleDownloadPDF}
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
