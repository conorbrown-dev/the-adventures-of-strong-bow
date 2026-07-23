import Phaser from "phaser";

import { BootScene } from "../scenes/BootScene";
import { CatCatchTitleScene } from "../scenes/CatCatchTitleScene";
import { DinoChaseScene } from "../scenes/DinoChaseScene";
import { FossilDigTitleScene } from "../scenes/FossilDigTitleScene";
import { FossilDigScene } from "../scenes/FossilDigScene";
import { LetterCatchScene } from "../scenes/LetterCatchScene";
import { BarnDoorVowelsScene } from '../scenes/BarnDoorVowelsScene'
import { MainMenuScene } from "../scenes/MainMenuScene";
import { PreloadScene } from "../scenes/PreloadScene";
import { TitleScene } from "../scenes/TitleScene";
import { WinScene } from "../scenes/WinScene";
import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { BarnDoorVowelsTitleScene } from "../scenes/BarndoorVowelsTitleScene";
import { AdditionGameScene } from "../scenes/AdditionGameScene";
import { AdditionTitleScene } from "../scenes/AdditionTitleScene";
import { PauseOverlayScene } from "../scenes/PauseOverlayScene";
import { SightWordsTitleScene } from "../scenes/SightWordsTitleScene";
import { SightWordsQuizScene } from "../scenes/SightWordsQuizScene";
import { StudentLoginScene } from "../scenes/StudentLoginScene";
import { CurriculumQuizScene } from "../scenes/CurriculumQuizScene";

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
      AdditionTitleScene,
      AdditionGameScene,
      SightWordsTitleScene,
      SightWordsQuizScene,
      StudentLoginScene,
      CurriculumQuizScene,
      PauseOverlayScene,
      PreloadScene,
      TitleScene,
      FossilDigTitleScene,
      CatCatchTitleScene,
      MainMenuScene,
      FossilDigScene,
      BarnDoorVowelsTitleScene,
      BarnDoorVowelsScene,
      LetterCatchScene,
      DinoChaseScene,
      WinScene
    ]
  };
}
