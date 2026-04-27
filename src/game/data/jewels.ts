import { JEWEL_ASSET_KEYS } from "../utils/assetKeys";

export type JewelId = "green" | "purple" | "red" | "yellow";

export interface JewelDefinition {
  id: JewelId;
  name: string;
  textureKey: string;
}

export const jewelCatalog: Record<JewelId, JewelDefinition> = {
  green: {
    id: "green",
    name: "Green Jewel",
    textureKey: JEWEL_ASSET_KEYS.GREEN
  },
  purple: {
    id: "purple",
    name: "Purple Jewel",
    textureKey: JEWEL_ASSET_KEYS.PURPLE
  },
  red: {
    id: "red",
    name: "Red Jewel",
    textureKey: JEWEL_ASSET_KEYS.RED
  },
  yellow: {
    id: "yellow",
    name: "Yellow Jewel",
    textureKey: JEWEL_ASSET_KEYS.YELLOW
  }
};

const jewelPool = Object.values(jewelCatalog);

export function getRandomJewel(): JewelDefinition {
  return jewelPool[Math.floor(Math.random() * jewelPool.length)];
}

export function getJewelById(id: JewelId): JewelDefinition {
  return jewelCatalog[id];
}
