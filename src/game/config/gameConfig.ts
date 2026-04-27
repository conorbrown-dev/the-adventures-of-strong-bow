import Phaser from "phaser";

import { BootScene } from "../scenes/BootScene";
import { DinoChaseScene } from "../scenes/DinoChaseScene";
import { FossilDigScene } from "../scenes/FossilDigScene";
import { MainMenuScene } from "../scenes/MainMenuScene";
import { PreloadScene } from "../scenes/PreloadScene";
import { TitleScene } from "../scenes/TitleScene";
import { WinScene } from "../scenes/WinScene";
import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";

export function createGameConfig(
  parent?: string
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#cfeeff",
    pixelArt: false,
    render: {
      antialias: true,
      antialiasGL: true,
      pixelArt: false,
      roundPixels: true
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 900 },
        debug: false
      }
    },
    scene: [
      BootScene,
      PreloadScene,
      TitleScene,
      MainMenuScene,
      FossilDigScene,
      DinoChaseScene,
      WinScene
    ]
  };
}
