import Phaser from "phaser";

import { ASSET_KEYS } from "../utils/assetKeys";
import { SCENE_KEYS } from "../utils/sceneKeys";

/**
 * Phaser's idle scene. React owns all navigation and menu UI; Phaser starts a
 * scene only after React selects a playable game mode.
 */
export class TitleScene extends Phaser.Scene {
  constructor() { super(SCENE_KEYS.TITLE); }

  create(): void {
    const backgroundMusic = this.sound.get(ASSET_KEYS.DIG_BGM);
    if (backgroundMusic?.isPlaying) backgroundMusic.stop();
    backgroundMusic?.destroy();
    this.cameras.main.setBackgroundColor(0x05030b);
  }
}
