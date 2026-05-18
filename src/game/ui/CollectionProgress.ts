import Phaser from "phaser";

import type { PickupProgress } from "../systems/PickupSystem";
import { COLORS } from "../utils/constants";

export class CollectionProgress extends Phaser.GameObjects.Container {
  private readonly fossilDots: Phaser.GameObjects.Arc[] = [];
  private readonly gemIcon: Phaser.GameObjects.Graphics;
  private readonly gemGlow: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const panel = scene.add
      .rectangle(0, 0, 176, 56, COLORS.HUD_PANEL)
      .setStrokeStyle(2, 0x5e4127);

    for (let index = 0; index < 6; index += 1) {
      const dot = scene.add
        .circle(-58 + index * 18, -8, 6, 0xc9b18d, 0.28)
        .setStrokeStyle(2, 0x5e4127, 0.7);
      this.fossilDots.push(dot);
    }

    this.gemGlow = scene.add.circle(52, 8, 13, 0x8b5cf6, 0.12);
    this.gemIcon = scene.add.graphics();
    this.drawGemIcon();

    this.add([panel, this.gemGlow, this.gemIcon, ...this.fossilDots]);
    scene.add.existing(this);
  }

  updateProgress(progress: PickupProgress): void {
    this.fossilDots.forEach((dot, index) => {
      const isActiveSlot = index < progress.total;
      const isCollected = index < progress.collected;
      dot.setVisible(isActiveSlot);
      dot.setFillStyle(isCollected ? 0xe8dcc3 : 0xc9b18d, isCollected ? 1 : 0.28);
      dot.setScale(isCollected ? 1.08 : 1);
    });

    const gemAlpha = progress.gemCollected ? 1 : progress.gemAvailable ? 0.82 : 0.24;
    this.gemIcon.setAlpha(gemAlpha);
    this.gemGlow.setAlpha(progress.gemCollected ? 0.42 : progress.gemAvailable ? 0.18 : 0.08);
  }

  private drawGemIcon(): void {
    this.gemIcon.clear();
    this.gemIcon.fillStyle(0x8b5cf6, 1);
    this.gemIcon.lineStyle(3, 0x5e4127, 1);
    const points = [
      new Phaser.Geom.Point(52, -4),
      new Phaser.Geom.Point(64, 8),
      new Phaser.Geom.Point(52, 20),
      new Phaser.Geom.Point(40, 8)
    ];
    this.gemIcon.fillPoints(points, true);
    this.gemIcon.strokePoints(points, true, true);
  }
}
