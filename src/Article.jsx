import Controls from "./components/Controls";
import React, { useState } from "react";
import FractalCanvas from "./components/FractalCanvas";

import SierpinskiIMG from "./assets/SierpinskiTriangle.jpg";
import RomanescoIMG from "./assets/RomanescoIMG.jpg";
import BloodIMG from "./assets/BloodVessels.jpg";
import CoastlineIMG from "./assets/Coastline.jpg";
import SierpinskiGIF from "./assets/Sierpinski_chaos_animated.gif";

const h1Style = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: "22px",
  letterSpacing: "3px",
  textTransform: "uppercase",
  color: "#b48818",
  borderBottom: "1px solid #3c3418",
  paddingBottom: "10px",
  marginBottom: "24px",
};

const h2Style = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: "13px",
  letterSpacing: "2px",
  textTransform: "uppercase",
  color: "#b48818",
  marginTop: "32px",
  marginBottom: "12px",
};

const pStyle = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: "15px",
  lineHeight: "1.8",
  color: "#b89e66",
  marginBottom: "14px",
  textIndent: "30px",
};

const imgStyle = {
  width: "50%",
  margin: "20px auto",
  display: "block",
  border: "1px solid #3c3418",
  padding: "4px",
  backgroundColor: "#0c0a06"
};

function Article() {
  return (
    <div style={{
      backgroundColor: "#0c0a06",
      minHeight: "100vh",
      padding: "40px 20px",
    }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        <h1 style={h1Style}>About Fractals</h1>

        <h2 style={h2Style}>Fractals</h2>
        <p style={pStyle}>
          A fractal is a geometric shape that is infinitely detailed as you zoom in. As you take a closer look at these shapes, you often find the same patterns recurring within the larger shape.
        </p>
        <img src={SierpinskiIMG} alt="Sierpinski Triangle" style={imgStyle} />
        <p style={pStyle}>
          For example, in the Sierpiński triangle without zooming in, the general shape is an equilateral triangle with smaller triangles removed. As we zoom in further, we see that these removed triangles become infinitely smaller, and we see some of the same patterns appearing.
        </p>

        <h2 style={h2Style}>Chaos Game</h2>
        <p style={pStyle}>
          The chaos game is a way of plotting our certain fractals, particularly the Sierpiński triangle. To begin, you plot out the three corners of a triangle. Then, you plot a random point inside of the triangle. After this, you can use any of the three corners and plot a point halfway between the random middle point and the selected corner. You then pick another random corner and use the newly plotted point to do the same thing. While the process may sound convoluted, after enough iterations, you will see the Sierpiński triangle appear.
        </p>
        <img src={SierpinskiGIF} alt="Animated Sierpinski Triangle GIF" style={imgStyle} />

        <h2 style={h2Style}>Practical Uses of Fractals</h2>
        <p style={pStyle}>
          While at first one may assume fractals have little importance for everyday life, fractals are actually utilized in multiple different disciplines and they have lots of real world applications.
          In our natural world, fractals appear everywhere. We can see smaller and smaller repeating patterns appear on things like ferns, snowflakes, pinecones, blood vessels, lightning and romanesco broccoli. Coastlines, while maybe not having repeating patterns, still have infinitely more curves and shapes as you look closer.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
          <img src={RomanescoIMG} alt="Romanesco Broccoli" style={{ ...imgStyle, width: "45%"}} />
          <img src={CoastlineIMG} alt="Coastline" style={{ ...imgStyle , width: "45%"}} />
        </div>
        <p style={pStyle}>
          Fractals also have applications with computer graphics and VFX. Fractal algorithms can be used to generate realistic effects, such as terrain, clouds, and flora. Because of how little data it takes to generate the intricate patterns of fractals, using fractals keeps computer graphics very data-efficient.
          The human body has some structures that resemble fractals, such as the formation of blood vessel cells and neurons. When something is wrong, oftentimes the fractals in these structures disappear. Using fractals, different types of screenings become more effective at detecting medical issues.
        </p>
        <img src={BloodIMG} alt="Blood Vessels" style={imgStyle} />
        <p style={pStyle}>
          A specific fractal modeled on this website, the mandelbulb, has specifically had many artistic applications. In the movie Big Hero 6, the inside of the wormhole is depicted as part of a mandelbulb's interior. In the movie Annihilation, a mandelbulb represents one of the aliens. Marvel has also used the mandelbulb multiple times, such as in Agents of S.H.I.E.L.D and Doctor Strange where alternate dimensions are depicted using mandelbulbs.
        </p>
      </div>
    </div>
  );
}

export default Article;
