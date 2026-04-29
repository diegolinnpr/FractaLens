# EduFrac — Interactive Fractal Visualizer

An educational web app for exploring fractals in real-time 3D. Built with React and Three.js, EduFrac lets you visualize chaos game fractals, the Mandelbulb, procedural landscapes, and lightning patterns — all rendered in the browser with interactive camera controls and high-resolution export.

**Authors:** Diego Linn, Tobias Watters, Vivian Simmons

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

```bash
# Build for production
npm run build

# Preview the production build locally
npm run preview
```

---

## How to Use

### Choosing a Fractal

The right-side control panel has a **Fractals** section. Select from:

| Fractal | Description |
|---|---|
| Tetrahedron / Octahedron / Dodecahedron | Chaos game fractals on 3D polyhedra |
| Trigonal Bipyramidal | 5-vertex chaos game fractal |
| Icosahedron | 12-vertex chaos game fractal |
| Cube | 8-vertex chaos game fractal |
| Mandelbulb | Raymarched 3D Mandelbrot set (power 8) |
| Koch Coastline | Diamond-square heightmap terrain |
| Koch Visualization | Interactive 2D Koch curve |
| Lichtenberg Lightning | Procedural lightning tree |

### Color Schemes

Pick from 10 color palettes in the **Colors** section. Colors are applied differently depending on the fractal type — for chaos game fractals, color is mapped to local point density.

### Camera Controls

**Orbit mode (default):**
- Left-click drag — rotate
- Scroll wheel — zoom

**Fly mode** — press `F` to enter, `O` to exit:
- Move mouse — look around (pointer locked)
- `W / A / S / D` — move forward/left/back/right
- `Space` — ascend
- `Shift` — descend
- `[` / `]` — decrease/increase speed

### Exporting

Click **Export PDF** or **Export Image** in the control panel. The fractal renders at 4× resolution (4096×4096 for chaos game, 2560×2560 for Mandelbulb) and downloads with a timestamped filename.

### Article Page

Navigate to **Article** in the navbar for an educational overview of fractals — what they are, how the chaos game algorithm works, and where fractals appear in the real world.

---

## How It Works

### Chaos Game Fractals

The chaos game algorithm generates fractals from polyhedra:

1. Pick a random starting point inside the shape
2. Randomly select one of the polyhedron's vertices
3. Move halfway toward that vertex
4. Plot the new point
5. Repeat millions of times

The resulting point cloud converges to a self-similar fractal structure. Points are colored by **local density**: 3D space is divided into a 43×43×43 grid, each cell is counted, and counts are mapped to the active color palette.

### Mandelbulb

The Mandelbulb is rendered entirely on the GPU using a custom GLSL fragment shader. For each screen pixel, a ray is cast into the scene and marched forward in small steps. At each step, the shader evaluates the Mandelbulb distance estimator — a 3D generalization of the Mandelbrot set using spherical coordinates raised to the 8th power. When the ray gets close enough to the surface, the point is shaded with normals derived from the gradient of the distance field.

### Landscape Fractals

**Koch Coastline** uses the diamond-square algorithm to generate a heightmap (8 iterations), then builds a Three.js mesh terrain with a water plane and procedural sky.

**Koch Visualization** draws a 2D Koch snowflake curve, subdividing each line segment recursively to the selected iteration depth.

**Lichtenberg Lightning** procedurally grows a branching lightning tree using stochastic path extension, with Three.js bloom post-processing for the glow effect.

### Export Pipeline

High-res exports re-render the scene at 4× resolution into an offscreen canvas, read the pixel buffer, encode it as JPEG, then wrap it in a manually constructed PDF (using the PDF DCTDecode filter spec) — no external PDF library required.

---

## Project Structure

```
EduFrac/
├── src/
│   ├── App.jsx                     # Router (/ and /article)
│   ├── Home.jsx                    # Main page layout
│   ├── Article.jsx                 # Educational article
│   ├── Navbar.jsx                  # Navigation bar
│   └── components/
│       ├── FractalCanvas.jsx       # Routes to the active fractal component
│       ├── Controls.jsx            # Right-side control panel
│       ├── ThreeScene.jsx          # Chaos game fractal renderer
│       ├── Mandelbulb.jsx          # Raymarched Mandelbulb
│       ├── KochCoastline.jsx       # Terrain landscape
│       ├── KochVisualization.jsx   # 2D Koch curve
│       ├── LichtenbergLightning.jsx# Lightning fractal
│       ├── useCameraControls.js    # Orbit / fly camera hook
│       └── downloadPDF.js          # Zero-dependency PDF encoder
├── generator/                      # Python chaos game data generator
│   ├── generator.py                # Generates .npz point cloud files
│   └── shapes.py                   # Polyhedron vertex definitions
├── data/                           # Pre-generated point cloud datasets
├── public/                         # Static assets
└── index.html                      # HTML entry point
```

### Tech Stack

- **React 19** — UI and component lifecycle
- **Three.js** — WebGL rendering, geometry, and shaders
- **React Router 6** — Client-side routing
- **Vite** — Dev server and production builds
- **Python + NumPy** — Offline chaos game data generation

---

## Data Generation (Optional)

The chaos game point cloud data is pre-generated and bundled with the app. If you want to regenerate or create new datasets:

**Prerequisites:** Python 3.x

```bash
pip install numpy matplotlib
```

Edit the output path in `generator/generator.py` to point to your local `data/` folder, then:

```bash
cd generator
python generator.py
```

This generates `.npz` files containing:
- `points` — Generated 3D coordinates
- `corners` — Polyhedron vertices
- `metadata` — Shape name, dimension, point count

You can change the shapes or point count in the `__main__` block at the bottom of `generator.py`.

**Full dataset (~840 MB):** The full pre-generated dataset is hosted on Google Drive:
[https://drive.google.com/drive/u/0/folders/1VH2aAmp_eVxuJSx-3yOpoyrn_6sgtPT0](https://drive.google.com/drive/u/0/folders/1VH2aAmp_eVxuJSx-3yOpoyrn_6sgtPT0)

Download the `.npz` files and place them in the `data/` folder.

---

## Notes

- Large point datasets (5M+ points) require significant memory.
- The Mandelbulb shader is GPU-intensive — performance depends on your hardware.
- File paths in `generator.py` may need adjustment for your local setup.
