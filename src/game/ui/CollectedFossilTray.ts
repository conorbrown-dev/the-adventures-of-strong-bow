import Phaser from "phaser";

import { COLORS, GAME_WIDTH, HUD_HEIGHT } from "../utils/constants";

export interface CollectedEntry {
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

  constructor(scene: Phaser.Scene, initialEntries: CollectedEntry[] = []) {
    super(scene, GAME_WIDTH / 2, HUD_HEIGHT + 44);
    this.setDepth(97);
    this.setScrollFactor(0);

    scene.add.existing(this);
    this.setEntries(initialEntries);
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
      .setDisplaySize(56, 56);
    const floatingWord = this.scene.add
      .text(0, 48, label, {
        fontFamily: "Trebuchet MS",
        fontSize: "22px",
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

  setEntries(entries: CollectedEntry[]): void {
    this.entries.length = 0;
    this.entries.push(...entries);
    this.renderEntries();
  }

  getEntryWorldPositions(): Array<CollectedEntry & { x: number; y: number }> {
    return this.entries.map((entry, index) => {
      const slot = this.getSlotPosition(index);

      return {
        ...entry,
        x: slot.x,
        y: slot.y
      };
    });
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
        .setDisplaySize(48, 48);
      const word = this.scene.add
        .text(slotX, targetSlot.labelY - this.y, entry.label, {
          fontFamily: "Trebuchet MS",
          fontSize: "18px",
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
    const startX = -240;
    const spacing = 96;
    const slotX = this.x + startX + index * spacing;

    return {
      x: slotX,
      y: this.y - 6,
      labelY: this.y + 18
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
