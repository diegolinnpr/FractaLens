/**
 * downloadPDF.js
 * Zero-dependency utility that wraps a JPEG data-URL in a minimal PDF and
 * triggers a browser download.
 *
 * The PDF spec allows a DCT-compressed (JPEG) image to be embedded verbatim
 * in an XObject stream using the /DCTDecode filter, so the output is lossless
 * relative to the JPEG quality you supply.
 *
 * Usage:
 *   const result = await captureRef.current();   // { dataUrl, width, height }
 *   await downloadAsPDF(result.dataUrl, result.width, result.height, 'fractal.pdf');
 */

export async function downloadAsPDF(dataUrl, imgWidth, imgHeight, filename = 'fractal.pdf') {
  // ── 1. Decode the base-64 JPEG ──────────────────────────────────────────
  const base64 = dataUrl.split(',')[1];
  const rawStr = atob(base64);
  const imgBytes = new Uint8Array(rawStr.length);
  for (let i = 0; i < rawStr.length; i++) imgBytes[i] = rawStr.charCodeAt(i);

  // ── 2. Page size in PDF points (72 pt = 1 inch; assume 150 DPI render) ──
  const DPI   = 150;
  const ptW   = ((imgWidth  / DPI) * 72).toFixed(4);
  const ptH   = ((imgHeight / DPI) * 72).toFixed(4);

  // ── 3. Build the PDF byte-by-byte ───────────────────────────────────────
  const chunks     = [];     // Uint8Array | Uint8Array
  let   byteOffset = 0;
  const objOffsets = {};     // object number → byte offset
  const enc        = new TextEncoder();

  function pushStr(s) {
    const b = enc.encode(s);
    chunks.push(b);
    byteOffset += b.length;
  }
  function pushBin(b) {
    chunks.push(b);
    byteOffset += b.length;
  }

  // PDF header (the 4 high-bytes signal that this is a binary file)
  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // Object 1 – Catalog
  objOffsets[1] = byteOffset;
  pushStr('1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n');

  // Object 2 – Pages
  objOffsets[2] = byteOffset;
  pushStr('2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n');

  // Object 3 – Page  (MediaBox matches the image at 150 DPI)
  objOffsets[3] = byteOffset;
  pushStr(
    `3 0 obj\n` +
    `<</Type/Page/Parent 2 0 R` +
    `/MediaBox[0 0 ${ptW} ${ptH}]` +
    `/Contents 4 0 R` +
    `/Resources<</XObject<</Im0 5 0 R>>>>>>\n` +
    `endobj\n`
  );

  // Object 4 – Content stream  (scale the image to fill the whole page)
  const contentBytes = enc.encode(`q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`);
  objOffsets[4] = byteOffset;
  pushStr(`4 0 obj\n<</Length ${contentBytes.length}>>\nstream\n`);
  pushBin(contentBytes);
  pushStr('\nendstream\nendobj\n');

  // Object 5 – Image XObject  (raw JPEG bytes via DCTDecode)
  objOffsets[5] = byteOffset;
  pushStr(
    `5 0 obj\n` +
    `<</Type/XObject/Subtype/Image` +
    `/Width ${imgWidth}/Height ${imgHeight}` +
    `/ColorSpace/DeviceRGB/BitsPerComponent 8` +
    `/Filter/DCTDecode/Length ${imgBytes.length}>>\n` +
    `stream\n`
  );
  pushBin(imgBytes);
  pushStr('\nendstream\nendobj\n');

  // ── 4. Cross-reference table ─────────────────────────────────────────────
  // Each entry must be exactly 20 bytes: nnnnnnnnnn ggggg x \n
  const xrefStart = byteOffset;
  pushStr('xref\n0 6\n');
  pushStr('0000000000 65535 f \n');                          // free head
  for (let i = 1; i <= 5; i++) {
    pushStr(String(objOffsets[i]).padStart(10, '0') + ' 00000 n \n');
  }

  // ── 5. Trailer ───────────────────────────────────────────────────────────
  pushStr(
    `trailer\n<</Size 6/Root 1 0 R>>\n` +
    `startxref\n${xrefStart}\n%%EOF`
  );

  // ── 6. Assemble and download ─────────────────────────────────────────────
  const blob = new Blob(chunks, { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
