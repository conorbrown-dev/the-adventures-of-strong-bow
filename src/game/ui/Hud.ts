import Phaser from "phaser";

import type { PickupProgress } from "../systems/PickupSystem";
import { ASSET_KEYS } from "../utils/assetKeys";
import { COLORS, GAME_WIDTH, HUD_HEIGHT } from "../utils/constants";
import { CollectionProgress } from "./CollectionProgress";
import { LearningPromptText } from "./LearningPromptText";

export class Hud extends Phaser.GameObjects.Container {
  private readonly promptText: LearningPromptText;
  private readonly progress: CollectionProgress;
  private readonly repeatButton: Phaser.GameObjects.Container;
  private readonly repeatLabel: Phaser.GameObjects.Text;
  private onRepeatRequested?: () => void;

  constructor(scene: Phaser.Scene, modeName: string) {
    super(scene, GAME_WIDTH / 2, HUD_HEIGHT / 2);

    const bg = scene.add
      .rectangle(0, 0, GAME_WIDTH, HUD_HEIGHT, COLORS.HUD_BG)
      .setOrigin(0.5);

    const modeText = scene.add
      .text(-GAME_WIDTH / 2 + 28, -34, modeName, {
        fontFamily: "Trebuchet MS",
        fontSize: "30px",
        color: COLORS.TEXT_LIGHT,
        fontStyle: "bold"
      })
      .setOrigin(0, 0.5);

    this.promptText = new LearningPromptText(scene, 40, -2, 560);
    this.progress = new CollectionProgress(scene, GAME_WIDTH / 2 - 170, -2);
    const repeatBackground = scene.add
      .image(0, 0, ASSET_KEYS.BUTTON)
      .setDisplaySize(220, 58);
    this.repeatLabel = scene.add
      .text(0, 0, "Repeat Word", {
        fontFamily: "Trebuchet MS",
        fontSize: "22px",
        color: COLORS.TEXT_DARK,
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    this.repeatButton = scene.add.container(0, 0, [
      repeatBackground,
      this.repeatLabel
    ]);
    this.repeatButton.setPosition(-GAME_WIDTH / 2 + 150, 30);
    this.repeatButton.setSize(220, 58);
    this.repeatButton.setInteractive(
      new Phaser.Geom.Rectangle(-110, -29, 220, 58),
      Phaser.Geom.Rectangle.Contains
    );
    this.repeatButton.on("pointerdown", () => {
      this.onRepeatRequested?.();
    });
    this.repeatButton.on("pointerover", () => {
      this.repeatButton.setScale(1.04);
    });
    this.repeatButton.on("pointerout", () => {
      this.repeatButton.setScale(1);
    });
    this.repeatButton.setVisible(false);

    this.add([bg, modeText, this.promptText, this.progress, this.repeatButton]);
    this.setDepth(100);
    this.setScrollFactor(0);

    scene.add.existing(this);
  }

  setPrompt(prompt: string): void {
    this.promptText.setPrompt(prompt);
  }

  updateProgress(progress: PickupProgress): void {
    this.progress.updateProgress(progress);
  }

  setRepeatHandler(handler: (() => void) | undefined): void {
    this.onRepeatRequested = handler;
  }

  setRepeatButtonVisible(visible: boolean): void {
    this.repeatButton.setVisible(visible);
  }

  setRepeatButtonEnabled(enabled: boolean): void {
    this.repeatButton.setAlpha(enabled ? 1 : 0.55);
    if (enabled) {
      this.repeatButton.setInteractive(
        new Phaser.Geom.Rectangle(-110, -29, 220, 58),
        Phaser.Geom.Rectangle.Contains
      );
      return;
    }

    this.repeatButton.disableInteractive();
  }

  setRepeatButtonLabel(label: string): void {
    this.repeatLabel.setText(label);
  }
}
