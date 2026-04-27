import Phaser from "phaser";

import type { PickupProgress } from "../systems/PickupSystem";
import { COLORS } from "../utils/constants";

export class CollectionProgress extends Phaser.GameObjects.Container {
  private readonly fossilText: Phaser.GameObjects.Text;
  private readonly gemText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const panel = scene.add
      .rectangle(0, 0, 280, 84, COLORS.HUD_PANEL)
      .setStrokeStyle(3, 0x5e4127);

    this.fossilText = scene.add
      .text(-118, -18, "Fossils: 0 / 0", {
        fontFamily: "Trebuchet MS",
        fontSize: "20px",
        color: COLORS.TEXT_DARK,
        fontStyle: "bold"
      })
      .setOrigin(0, 0.5);

    this.gemText = scene.add
      .text(-118, 18, "Gem: Hidden", {
        fontFamily: "Trebuchet MS",
        fontSize: "20px",
        color: COLORS.TEXT_DARK,
        fontStyle: "bold"
      })
      .setOrigin(0, 0.5);

    this.add([panel, this.fossilText, this.gemText]);
    scene.add.existing(this);
  }

  updateProgress(progress: PickupProgress): void {
    const gemStatus = progress.gemCollected
      ? "Found"
      : progress.gemAvailable
        ? "Available"
        : "Hidden";

    this.fossilText.setText(`Fossils: ${progress.collected} / ${progress.total}`);
    this.gemText.setText(`Gem: ${gemStatus}`);
  }
}
