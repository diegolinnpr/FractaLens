import Controls from "./components/Controls";
import React, { useState } from "react";
import FractalCanvas from "./components/FractalCanvas";

function Home() {
  const [fractalType, setFractalType] = useState("Octahedron");

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <FractalCanvas type={fractalType} />
      <Controls setFractalType={setFractalType} />
    </div>
  );
}

export default Home;