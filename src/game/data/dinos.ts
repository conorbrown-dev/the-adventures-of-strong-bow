import { DINO_ASSET_KEYS } from "../utils/assetKeys";

export type DinoId = "trex" | "triceratops";

export interface DinoDefinition {
  id: DinoId;
  name: string;
  textureKey: string;
  frameWidth: number;
  frameHeight: number;
  frameMargin: number;
  frameSpacing: number;
  idleFrame: number;
  chaseFrames: number[];
  roarFrames: number[];
}

export const dinoCatalog: Record<DinoId, DinoDefinition> = {
  trex: {
    id: "trex",
    name: "T-Rex",
    textureKey: DINO_ASSET_KEYS.TREX,
    frameWidth: 443,
    frameHeight: 443,
    frameMargin: 1,
    frameSpacing: 0,
    idleFrame: 4,
    chaseFrames: [0, 1, 2, 3],
    roarFrames: [4, 5, 6, 7, 6, 5, 4]
  },
  triceratops: {
    id: "triceratops",
    name: "Triceratops",
    textureKey: DINO_ASSET_KEYS.TRICERATOPS,
    frameWidth: 443,
    frameHeight: 443,
    frameMargin: 1,
    frameSpacing: 0,
    idleFrame: 4,
    chaseFrames: [0, 1, 2, 3],
    roarFrames: [4, 5, 6, 7, 6, 5, 4]
  }
};

const dinoPool = Object.values(dinoCatalog);

export function getRandomDino(): DinoDefinition {
  return dinoPool[Math.floor(Math.random() * dinoPool.length)];
}

export function getDinoById(id: DinoId): DinoDefinition {
  return dinoCatalog[id];
}

export function getDinoAnimationKeys(id: DinoId): {
  chase: string;
  roar: string;
} {
  return {
    chase: `dino-${id}-chase`,
    roar: `dino-${id}-roar`
  };
}
