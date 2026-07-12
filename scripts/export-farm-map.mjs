import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const source = "src/game/assets/barn-door-vowels/farm.tmx";
const target = "src/game/assets/barn-door-vowels/farm.json";

execFileSync(
  "tiled",
  [
    "--disable-opengl",
    "--embed-tilesets",
    "--export-map",
    "json",
    source,
    target
  ],
  { stdio: "inherit" }
);

const map = JSON.parse(readFileSync(target, "utf8"));

for (const layer of map.layers ?? []) {
  if (layer.type !== "tilelayer" || typeof layer.data !== "string") {
    continue;
  }

  let bytes = Buffer.from(layer.data, "base64");
  if (layer.compression === "zlib") {
    bytes = inflateSync(bytes);
  } else if (layer.compression) {
    throw new Error(`Unsupported Tiled compression: ${layer.compression}`);
  }

  const tileCount = bytes.length / Uint32Array.BYTES_PER_ELEMENT;
  layer.data = Array.from({ length: tileCount }, (_, index) =>
    bytes.readUInt32LE(index * Uint32Array.BYTES_PER_ELEMENT)
  );
  delete layer.encoding;
  delete layer.compression;
}

writeFileSync(target, `${JSON.stringify(map)}\n`);
console.log(`Exported Phaser-compatible tilemap to ${target}`);
