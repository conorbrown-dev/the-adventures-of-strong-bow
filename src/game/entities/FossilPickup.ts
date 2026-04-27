import Phaser from "phaser";

import { LearningType } from "../data/learningTypes";
import { ASSET_KEYS } from "../utils/assetKeys";

export class FossilPickup extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  readonly pickupId: string;
  readonly label: string;
  readonly learningType: LearningType;

  private readonly labelText: Phaser.GameObjects.Text;
  private collected = false;
  private busy = false;
  private labelVisible = true;
  private revealed = true;
  private readonly labelOffsetY = 56;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    pickupId: string,
    label: string,
    learningType: LearningType
  ) {
    super(scene, x, y, textureKey);

    this.pickupId = pickupId;
    this.label = label;
    this.learningType = learningType;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(12);
    this.setImmovable(true);
    this.setDisplaySize(68, 68);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.setSize(this.width * 0.82, this.height * 0.82);
    body.setOffset(this.width * 0.09, this.height * 0.09);

    this.labelText = scene.add
      .text(x, y, label, {
        fontFamily: "Trebuchet MS",
        fontSize: "22px",
        color: "#2d1f14",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(13);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.labelText.setPosition(this.x, this.y + this.labelOffsetY);
  }

  collect(): boolean {
    if (this.collected || this.busy) {
      return false;
    }

    this.collected = true;
    this.disableBody(true, true);
    this.labelText.setVisible(false);

    return true;
  }

  setWorldLabelVisible(visible: boolean): void {
    this.labelVisible = visible;
    this.labelText.setVisible(visible && this.active && this.revealed);
  }

  hideUntilRevealed(): void {
    this.revealed = false;
    this.setVisible(false);
    this.body.enable = false;
    this.labelText.setVisible(false);
  }

  reveal(): void {
    if (this.collected || this.revealed) {
      return;
    }

    this.revealed = true;
    this.setVisible(true);
    this.setAlpha(1);
    this.body.enable = true;
    this.labelText.setVisible(this.labelVisible);
  }

  isRevealed(): boolean {
    return this.revealed;
  }

  getTextureKey(): string {
    return this.texture.key;
  }

  isBusy(): boolean {
    return this.busy;
  }

  async playIncorrectPickupFeedback(): Promise<void> {
    if (this.collected || this.busy) {
      return;
    }

    this.busy = true;
    this.body.enable = false;

    const crumbleOverlay = this.scene.add
      .sprite(this.x, this.y, ASSET_KEYS.INCORRECT_FOSSIL_CRUMBLE, 0)
      .setDisplaySize(80, 80)
      .setDepth(16)
      .setAlpha(0);

    await Promise.all([
      this.playTween({
        targets: this,
        alpha: 0,
        duration: 180,
        ease: "Quad.InOut"
      }),
      this.playTween({
        targets: this.labelText,
        alpha: 0,
        duration: 180,
        ease: "Quad.InOut"
      }),
      this.playTween({
        targets: crumbleOverlay,
        alpha: 1,
        duration: 180,
        ease: "Quad.Out"
      })
    ]);

    this.setVisible(false);
    this.labelText.setVisible(false);

    await this.playAnimation(crumbleOverlay, "incorrect-fossil-crumble");
    crumbleOverlay.destroy();

    await this.wait(220);

    this.setVisible(true);
    this.setScale(1);
    this.setAlpha(1);
    this.setAngle(0);
    this.labelText.setAlpha(1);
    this.labelText.setVisible(this.labelVisible && this.revealed);
    this.body.enable = true;
    this.busy = false;
  }

  override destroy(fromScene?: boolean): void {
    this.labelText.destroy();
    super.destroy(fromScene);
  }

  private wait(duration: number): Promise<void> {
    return new Promise((resolve) => {
      this.scene.time.delayedCall(duration, () => resolve());
    });
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

  private playAnimation(
    sprite: Phaser.GameObjects.Sprite,
    key: string
  ): Promise<void> {
    return new Promise((resolve) => {
      const fallback = this.scene.time.delayedCall(900, () => resolve());
      sprite.once(`animationcomplete-${key}`, () => {
        fallback.remove(false);
        resolve();
      });
      sprite.play(key);
    });
  }
}
