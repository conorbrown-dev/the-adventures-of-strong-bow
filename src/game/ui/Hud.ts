import Phaser from "phaser";
import { Volume2 } from "lucide";

import type { PromptDescriptor } from "../modes/fossil-dig/FossilDigContent";
import type { PickupProgress } from "../systems/PickupSystem";
import { COLORS, GAME_WIDTH, HUD_HEIGHT } from "../utils/constants";
import { playButtonClick, playButtonHover } from "../utils/uiSound";
import { CollectionProgress } from "./CollectionProgress";
import { LearningPromptText } from "./LearningPromptText";

export class Hud extends Phaser.GameObjects.Container {
  private static readonly REPEAT_ICON_TEXTURE_KEY = "hud-repeat-speaker-icon";
  private static readonly REPEAT_BUTTON_X = 54;
  private static readonly REPEAT_BUTTON_Y = HUD_HEIGHT / 2;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly promptText: LearningPromptText;
  private readonly progress: CollectionProgress;
  private readonly repeatButton: Phaser.GameObjects.Container;
  private readonly repeatButtonHitZone: Phaser.GameObjects.Zone;
  private onRepeatRequested?: () => void;
  private repeatButtonVisible = false;
  private repeatButtonEnabled = false;

  constructor(scene: Phaser.Scene, _modeName: string) {
    super(scene, GAME_WIDTH / 2, HUD_HEIGHT / 2);

    this.bg = scene.add
      .rectangle(0, 0, GAME_WIDTH, HUD_HEIGHT, COLORS.HUD_BG)
      .setOrigin(0.5);

    this.promptText = new LearningPromptText(scene, -64, 0, 308);
    this.progress = new CollectionProgress(scene, GAME_WIDTH / 2 - 116, 0);
    const repeatBackground = scene.add.circle(0, 0, 21, 0xf6edd7, 1);
    repeatBackground.setStrokeStyle(2, 0x5e4127);
    const repeatIcon = this.createSpeakerIcon(scene);
    this.repeatButton = scene.add.container(
      Hud.REPEAT_BUTTON_X,
      Hud.REPEAT_BUTTON_Y,
      [
        repeatBackground,
        repeatIcon
      ]
    );
    this.repeatButton.setSize(42, 42);
    this.repeatButton.setDepth(101);
    this.repeatButtonHitZone = scene.add
      .zone(Hud.REPEAT_BUTTON_X, Hud.REPEAT_BUTTON_Y, 42, 42)
      .setDepth(102)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.repeatButtonHitZone.on("pointerdown", () => {
      playButtonClick(scene);
      this.onRepeatRequested?.();
    });
    this.repeatButtonHitZone.on("pointerover", () => {
      playButtonHover(scene);
      this.repeatButton.setScale(1.04);
    });
    this.repeatButtonHitZone.on("pointerout", () => {
      this.repeatButton.setScale(1);
    });
    this.syncRepeatButtonState();

    this.add([this.bg, this.promptText, this.progress, this.repeatButton]);
    this.remove(this.repeatButton);
    this.setDepth(100);
    this.setScrollFactor(0);
    this.syncRepeatButtonScreenPosition();
    scene.events.on(
      Phaser.Scenes.Events.POST_UPDATE,
      this.syncRepeatButtonScreenPosition,
      this
    );

    scene.add.existing(this);
  }

  setPrompt(prompt: PromptDescriptor): void {
    this.promptText.setPrompt(prompt);
  }

  updateProgress(progress: PickupProgress): void {
    this.progress.updateProgress(progress);
  }

  setRepeatHandler(handler: (() => void) | undefined): void {
    this.onRepeatRequested = handler;
  }

  setPromptAudioHandler(handler: (() => void) | undefined): void {
    this.promptText.setSpeakerHandler(handler);
  }

  setRepeatButtonVisible(visible: boolean): void {
    this.repeatButtonVisible = visible;
    this.syncRepeatButtonState();
  }

  setRepeatButtonEnabled(enabled: boolean): void {
    this.repeatButtonEnabled = enabled;
    this.syncRepeatButtonState();
  }

  setRepeatOnlyMode(enabled: boolean): void {
    this.bg.setVisible(!enabled);
    this.promptText.setVisible(!enabled);
    this.progress.setVisible(!enabled);
  }

  private createSpeakerIcon(
    scene: Phaser.Scene
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Arc {
    if (!scene.textures.exists(Hud.REPEAT_ICON_TEXTURE_KEY)) {
      const texture = scene.textures.createCanvas(
        Hud.REPEAT_ICON_TEXTURE_KEY,
        24,
        24
      );
      if (!texture) {
        return scene.add.circle(0, 0, 8, 0x5e4127);
      }
      const context = texture.getContext();
      context.clearRect(0, 0, 24, 24);
      context.strokeStyle = "#5e4127";
      context.lineWidth = 2;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.save();
      context.scale(1, 1);

      Volume2.forEach(([, attributes]) => {
        if (typeof attributes.d === "string") {
          const path = new Path2D(attributes.d);
          context.stroke(path);
        }
      });

      context.restore();
      texture.refresh();
    }

    return scene.add
      .image(0, 0, Hud.REPEAT_ICON_TEXTURE_KEY)
      .setDisplaySize(20, 20);
  }

  private syncRepeatButtonState(): void {
    this.repeatButton.setVisible(this.repeatButtonVisible);
    this.repeatButtonHitZone.setVisible(this.repeatButtonVisible);
    this.repeatButton.setAlpha(this.repeatButtonEnabled ? 1 : 0.55);

    if (!this.repeatButtonVisible || !this.repeatButtonEnabled) {
      if (this.repeatButtonHitZone.input) {
        this.repeatButtonHitZone.disableInteractive();
      }
      return;
    }

    if (this.repeatButtonHitZone.input) {
      this.repeatButtonHitZone.setInteractive({ useHandCursor: true });
      return;
    }

    this.repeatButtonHitZone.setInteractive({ useHandCursor: true });
  }

  private syncRepeatButtonScreenPosition(): void {
    const camera = this.scene.cameras.main;
    const x = camera.scrollX + Hud.REPEAT_BUTTON_X;
    const y = camera.scrollY + Hud.REPEAT_BUTTON_Y;

    this.repeatButton.setPosition(x, y);
    this.repeatButtonHitZone.setPosition(x, y);
  }

  override destroy(fromScene?: boolean): void {
    this.scene.events.off(
      Phaser.Scenes.Events.POST_UPDATE,
      this.syncRepeatButtonScreenPosition,
      this
    );
    this.repeatButton.destroy();
    this.repeatButtonHitZone.destroy();
    super.destroy(fromScene);
  }
}
