import Phaser from "phaser";

import type { DinoDefinition } from "../data/dinos";
import { getDinoAnimationKeys } from "../data/dinos";

export class DinoSkeleton extends Phaser.Physics.Arcade.Sprite {
  private readonly animationKeys: ReturnType<typeof getDinoAnimationKeys>;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    dino: DinoDefinition
  ) {
    super(scene, x, y, dino.textureKey, dino.idleFrame);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.animationKeys = getDinoAnimationKeys(dino.id);

    this.setDepth(18);
    this.setDisplaySize(250, 250);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.setSize(this.width * 0.52, this.height * 0.34);
    body.setOffset(this.width * 0.22, this.height * 0.46);
  }

  async assemble(): Promise<void> {
    this.setAlpha(0);
    this.setScale(0.2);

    await this.playTween({
      targets: this,
      alpha: 1,
      scale: 1,
      duration: 700,
      ease: "Back.Out"
    });
  }

  async flash(): Promise<void> {
    this.scene.cameras.main.flash(250, 255, 255, 255);
    await this.wait(250);
  }

  async roar(): Promise<void> {
    const roarText = this.scene.add
      .text(this.x, this.y - 80, "ROAR!", {
        fontFamily: "Trebuchet MS",
        fontSize: "36px",
        fontStyle: "bold",
        color: "#fff8e8",
        stroke: "#2d1f14",
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setDepth(30);

    this.play(this.animationKeys.roar, true);

    await this.playTween({
      targets: [this, roarText],
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 180,
      yoyo: true,
      repeat: 2
    });

    roarText.destroy();
  }

  startChasing(): void {
    this.setTint(0xf1f5f9);
    this.play(this.animationKeys.chase, true);
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
}
