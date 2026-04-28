import Controls from "./components/Controls";
import React, { useState } from "react";
import FractalCanvas from "./components/FractalCanvas";

function Home() {
  const [fractalType, setFractalType] = useState("Octahedron");
  const [hue, setHue] = useState(200);

  return (
    <div style={{ display: "flex", height: "100vh"}}>
      <FractalCanvas type={fractalType} hue={hue} />
      <Controls setFractalType={setFractalType} hue={hue} setHue={setHue} />
    </div>
  );
}

export default Home;