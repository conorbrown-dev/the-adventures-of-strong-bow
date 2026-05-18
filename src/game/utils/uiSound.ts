import Phaser from "phaser";

import { getConfiguredSfxVolume } from "../settings/parentalSettings";
import { ASSET_KEYS } from "./assetKeys";

export function playButtonHover(scene: Phaser.Scene): void {
  scene.sound.play(ASSET_KEYS.BUTTON_HOVER, {
    volume: 0.4 * getConfiguredSfxVolume()
  });
}

export function playButtonClick(scene: Phaser.Scene): void {
  scene.sound.play(ASSET_KEYS.BUTTON_CLICK, {
    volume: 0.5 * getConfiguredSfxVolume()
  });
}
