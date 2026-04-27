import Phaser from "phaser";

import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";

export class WinScene extends Phaser.Scene {
  private enterKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENE_KEYS.WIN);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0xfff7d6);
    const confettiColors = [
      0xf97316,
      0x22c55e,
      0x0ea5e9,
      0xeab308,
      0xec4899,
      0x8b5cf6
    ];

    for (let index = 0; index < 18; index += 1) {
      this.add.circle(
        Phaser.Math.Between(40, GAME_WIDTH - 40),
        Phaser.Math.Between(40, GAME_HEIGHT - 40),
        Phaser.Math.Between(8, 18),
        confettiColors[index % confettiColors.length],
        0.8
      );
    }

    this.add
      .text(GAME_WIDTH / 2, 220, "You escaped the dinosaur!", {
        fontFamily: "Trebuchet MS",
        fontSize: "54px",
        fontStyle: "bold",
        color: "#2d1f14",
        align: "center"
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        330,
        "Press Enter or click to return to the menu.",
        {
          fontFamily: "Trebuchet MS",
          fontSize: "28px",
          color: "#4b5563"
        }
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 430, "Next step ideas: more fossils, better prompts, real animations.", {
        fontFamily: "Trebuchet MS",
        fontSize: "24px",
        color: COLORS.TEXT_DARK
      })
      .setOrigin(0.5);

    this.enterKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );
    this.input.once("pointerdown", () => {
      this.scene.start(SCENE_KEYS.MAIN_MENU);
    });
  }

  update(): void {
    if (this.enterKey && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.scene.start(SCENE_KEYS.MAIN_MENU);
    }
  }
}
