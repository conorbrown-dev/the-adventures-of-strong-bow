import Phaser from "phaser";

import { COLORS } from "../utils/constants";

export class LearningPromptText extends Phaser.GameObjects.Container {
  private readonly valueText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number) {
    super(scene, x, y);

    const bg = scene.add
      .rectangle(0, 0, width, 56, COLORS.HUD_PANEL)
      .setStrokeStyle(3, 0x5e4127);
    this.valueText = scene.add
      .text(0, 0, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "24px",
        color: COLORS.TEXT_DARK,
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: width - 24 }
      })
      .setOrigin(0.5);

    this.add([bg, this.valueText]);
    scene.add.existing(this);
  }

  setPrompt(prompt: string): void {
    this.valueText.setText(prompt);
  }
}
