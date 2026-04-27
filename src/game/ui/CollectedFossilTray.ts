import Phaser from "phaser";

import { COLORS, GAME_WIDTH, UNDERGROUND_TOP } from "../utils/constants";

interface CollectedEntry {
  textureKey: string;
  label: string;
}

interface SlotPosition {
  x: number;
  y: number;
  labelY: number;
}

export class CollectedFossilTray extends Phaser.GameObjects.Container {
  private readonly entries: CollectedEntry[] = [];
  private readonly slots: Phaser.GameObjects.Container[] = [];

  constructor(scene: Phaser.Scene) {
    super(scene, GAME_WIDTH / 2, UNDERGROUND_TOP - 12);

    const bg = scene.add
      .rectangle(0, 0, 860, 72, 0xf6edd7, 0.94)
      .setStrokeStyle(3, 0x5e4127);
    const title = scene.add
      .text(-406, -20, "Found Fossils", {
        fontFamily: "Trebuchet MS",
        fontSize: "20px",
        color: COLORS.TEXT_DARK,
        fontStyle: "bold"
      })
      .setOrigin(0, 0.5);

    this.add([bg, title]);
    this.setDepth(97);
    this.setScrollFactor(0);

    scene.add.existing(this);
  }

  async addCollectedFossil(
    textureKey: string,
    label: string,
    fromX: number,
    fromY: number
  ): Promise<void> {
    const camera = this.scene.cameras.main;
    const targetSlot = this.getSlotPosition(this.entries.length);
    const floatingFossil = this.scene.add
      .image(0, 0, textureKey)
      .setDisplaySize(72, 72);
    const floatingWord = this.scene.add
      .text(0, 62, label, {
        fontFamily: "Trebuchet MS",
        fontSize: "28px",
        color: COLORS.TEXT_DARK,
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    const floatingContainer = this.scene.add
      .container(fromX - camera.scrollX, fromY - camera.scrollY, [
        floatingFossil,
        floatingWord
      ])
      .setScrollFactor(0)
      .setDepth(99);

    await this.playTween({
      targets: floatingContainer,
      x: targetSlot.x,
      y: targetSlot.y,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 520,
      ease: "Cubic.Out"
    });

    floatingContainer.destroy();

    this.entries.push({ textureKey, label });
    this.renderEntries();
  }

  private renderEntries(): void {
    this.slots.forEach((slot) => slot.destroy());
    this.slots.length = 0;

    this.entries.forEach((entry, index) => {
      const targetSlot = this.getSlotPosition(index);
      const slotX = targetSlot.x - this.x;
      const slotY = targetSlot.y - this.y;
      const fossil = this.scene.add
        .image(slotX, slotY, entry.textureKey)
        .setDisplaySize(64, 64);
      const word = this.scene.add
        .text(slotX, targetSlot.labelY - this.y, entry.label, {
          fontFamily: "Trebuchet MS",
          fontSize: "22px",
          color: COLORS.TEXT_DARK,
          fontStyle: "bold"
        })
        .setOrigin(0.5);
      const slotContainer = this.scene.add.container(0, 0, [fossil, word]);
      this.add(slotContainer);
      this.slots.push(slotContainer);
    });
  }

  private getSlotPosition(index: number): SlotPosition {
    const startX = -300;
    const spacing = 124;
    const slotX = this.x + startX + index * spacing;

    return {
      x: slotX,
      y: this.y + 4,
      labelY: this.y + 28
    };
  }

  private playTween(
    config: Phaser.Types.Tweens.TweenBuilderConfig
  ): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        ...config,
        onComplete: () => resolve()
      });
    });
  }
}
