import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./Home";
import Article from "./Article";
import Navbar from "./Navbar";

import Controls from "./components/Controls";
import React, { useState } from "react";
import FractalCanvas from "./components/FractalCanvas";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/article" element={<Article />} />
      </Routes>
    </Router>
  );
}

export default App;