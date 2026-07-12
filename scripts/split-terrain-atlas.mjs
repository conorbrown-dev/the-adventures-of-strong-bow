import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";

const sourcePath = "src/game/assets/barn-door-vowels/terrain-map-v7.png";
const outputPaths = [
  "src/game/assets/barn-door-vowels/terrain-map-v7-a.png",
  "src/game/assets/barn-door-vowels/terrain-map-v7-b.png"
];
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const png = readFileSync(sourcePath);
let offset = signature.length;
let width = 0;
let height = 0;
let ihdr;
const idatParts = [];

while (offset < png.length) {
  const length = png.readUInt32BE(offset);
  const type = png.toString("ascii", offset + 4, offset + 8);
  const data = png.subarray(offset + 8, offset + 8 + length);
  if (type === "IHDR") {
    ihdr = Buffer.from(data);
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) {
      throw new Error("Expected a non-interlaced, 8-bit RGBA terrain atlas.");
    }
  } else if (type === "IDAT") {
    idatParts.push(data);
  }
  offset += length + 12;
}

if (!ihdr || height % outputPaths.length !== 0) {
  throw new Error("Terrain atlas cannot be split into equal tile-aligned halves.");
}

const bytesPerPixel = 4;
const rowBytes = width * bytesPerPixel;
const filtered = inflateSync(Buffer.concat(idatParts));
const pixels = Buffer.alloc(rowBytes * height);
let sourceOffset = 0;

for (let y = 0; y < height; y += 1) {
  const filter = filtered[sourceOffset];
  sourceOffset += 1;
  const rowOffset = y * rowBytes;
  const previousRowOffset = rowOffset - rowBytes;
  for (let x = 0; x < rowBytes; x += 1) {
    const raw = filtered[sourceOffset + x];
    const left = x >= bytesPerPixel ? pixels[rowOffset + x - bytesPerPixel] : 0;
    const above = y > 0 ? pixels[previousRowOffset + x] : 0;
    const upperLeft = y > 0 && x >= bytesPerPixel
      ? pixels[previousRowOffset + x - bytesPerPixel]
      : 0;
    let predictor = 0;
    if (filter === 1) predictor = left;
    else if (filter === 2) predictor = above;
    else if (filter === 3) predictor = Math.floor((left + above) / 2);
    else if (filter === 4) predictor = paeth(left, above, upperLeft);
    else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}.`);
    pixels[rowOffset + x] = (raw + predictor) & 0xff;
  }
  sourceOffset += rowBytes;
}

const halfHeight = height / outputPaths.length;
outputPaths.forEach((outputPath, partIndex) => {
  const raw = Buffer.alloc((rowBytes + 1) * halfHeight);
  for (let y = 0; y < halfHeight; y += 1) {
    const outputRow = y * (rowBytes + 1);
    raw[outputRow] = 0;
    const sourceRow = (partIndex * halfHeight + y) * rowBytes;
    pixels.copy(raw, outputRow + 1, sourceRow, sourceRow + rowBytes);
  }
  const outputHeader = Buffer.from(ihdr);
  outputHeader.writeUInt32BE(halfHeight, 4);
  writeFileSync(outputPath, Buffer.concat([
    signature,
    chunk("IHDR", outputHeader),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]));
  console.log(`Wrote ${outputPath} (${width}x${halfHeight})`);
});

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0);
  typeBuffer.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), data.length + 8);
  return result;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
