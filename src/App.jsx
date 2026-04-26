import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React, { useState } from "react";

import Home from "./Home";
import Article from "./Article";
import Navbar from "./Navbar";

import Controls from "./components/Controls";
import FractalCanvas from "./components/FractalCanvas";

function App() {
  const [fractalType, setFractalType] = useState("Mandelbulb");
  const [colorScheme, setColorScheme] = useState(0);

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
                />
              </div>

              {/* Controls Panel */}
              <Controls
                fractalType={fractalType}
                setFractalType={setFractalType}
                colorScheme={colorScheme}
                setColorScheme={setColorScheme}
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